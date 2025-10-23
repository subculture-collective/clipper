package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/middleware"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/scheduler"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/pkg/twitch"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Set Gin mode
	gin.SetMode(cfg.Server.GinMode)

	// Initialize database connection pool
	db, err := database.NewDB(&cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize Redis client
	redisClient, err := redispkg.NewClient(&cfg.Redis)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	// Initialize JWT manager
	var jwtManager *jwtpkg.Manager
	if cfg.JWT.PrivateKey != "" {
		jwtManager, err = jwtpkg.NewManager(cfg.JWT.PrivateKey)
		if err != nil {
			log.Fatalf("Failed to initialize JWT manager: %v", err)
		}
	} else {
		// Generate new RSA key pair for development
		log.Println("WARNING: No JWT private key provided. Generating new key pair (not for production!)")
		privateKey, publicKey, err := jwtpkg.GenerateRSAKeyPair()
		if err != nil {
			log.Fatalf("Failed to generate RSA key pair: %v", err)
		}
		log.Printf("Generated RSA key pair. Add these to your .env file:\n")
		log.Printf("JWT_PRIVATE_KEY:\n%s\n", privateKey)
		log.Printf("JWT_PUBLIC_KEY:\n%s\n", publicKey)
		jwtManager, err = jwtpkg.NewManager(privateKey)
		if err != nil {
			log.Fatalf("Failed to initialize JWT manager: %v", err)
		}
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)
	commentRepo := repository.NewCommentRepository(db.Pool)

	// Initialize Twitch client
	twitchClient, err := twitch.NewClient(&cfg.Twitch, redisClient)
	if err != nil {
		log.Printf("WARNING: Failed to initialize Twitch client: %v", err)
		log.Printf("Twitch API features will be disabled. Please configure TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET")
	}

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)
	commentService := services.NewCommentService(commentRepo, clipRepo)
	var clipSyncService *services.ClipSyncService
	if twitchClient != nil {
		clipSyncService = services.NewClipSyncService(twitchClient, clipRepo)
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, cfg)
	monitoringHandler := handlers.NewMonitoringHandler(redisClient)
	commentHandler := handlers.NewCommentHandler(commentService)
	var clipSyncHandler *handlers.ClipSyncHandler
	if clipSyncService != nil {
		clipSyncHandler = handlers.NewClipSyncHandler(clipSyncService, cfg)
	}

	// Initialize router
	r := gin.Default()

	// Apply CORS middleware
	r.Use(middleware.CORSMiddleware(cfg))

	// Health check endpoints
	// Basic health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "healthy",
		})
	})

	// Readiness check - indicates if the service is ready to serve traffic
	r.GET("/health/ready", func(c *gin.Context) {
		// Check database connection
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()

		if err := db.HealthCheck(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "not ready",
				"error":  "database unavailable",
			})
			return
		}

		// Check Redis connection
		if err := redisClient.HealthCheck(ctx); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"status": "not ready",
				"error":  "redis unavailable",
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "ready",
			"checks": gin.H{
				"database": "ok",
				"redis":    "ok",
			},
		})
	})

	// Liveness check - indicates if the application is alive
	r.GET("/health/live", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status": "alive",
		})
	})

	// Database statistics endpoint (for monitoring)
	r.GET("/health/stats", func(c *gin.Context) {
		stats := db.GetStats()
		c.JSON(http.StatusOK, gin.H{
			"database": gin.H{
				"acquired_conns":      stats.AcquiredConns(),
				"idle_conns":          stats.IdleConns(),
				"total_conns":         stats.TotalConns(),
				"max_conns":           stats.MaxConns(),
				"acquire_count":       stats.AcquireCount(),
				"acquire_duration_ms": stats.AcquireDuration().Milliseconds(),
			},
		})
	})

	// Cache monitoring endpoints
	r.GET("/health/cache", monitoringHandler.GetCacheStats)
	r.GET("/health/cache/check", monitoringHandler.GetCacheHealth)

	// API version 1 routes
	v1 := r.Group("/api/v1")
	{
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "pong",
			})
		})

		// Auth routes
		auth := v1.Group("/auth")
		{
			// Public auth endpoints with rate limiting
			auth.GET("/twitch", middleware.RateLimitMiddleware(redisClient, 5, time.Minute), authHandler.InitiateOAuth)
			auth.GET("/twitch/callback", middleware.RateLimitMiddleware(redisClient, 10, time.Minute), authHandler.HandleCallback)
			auth.POST("/refresh", middleware.RateLimitMiddleware(redisClient, 10, time.Minute), authHandler.RefreshToken)
			auth.POST("/logout", authHandler.Logout)

			// Protected auth endpoints
			auth.GET("/me", middleware.AuthMiddleware(authService), authHandler.GetCurrentUser)
		}

		// Clip routes
		clips := v1.Group("/clips")
		{
			// List comments for a clip (public or authenticated)
			clips.GET("/:clipId/comments", commentHandler.ListComments)

			// Create comment (authenticated, rate limited)
			clips.POST("/:clipId/comments", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 10, time.Minute), commentHandler.CreateComment)

			// User clip submission with rate limiting (5 per hour) - if Twitch client is available
			if clipSyncHandler != nil {
				clips.POST("/request", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 5, time.Hour), clipSyncHandler.RequestClip)
			}
		}

		// Comment routes
		comments := v1.Group("/comments")
		{
			// Get replies to a comment (can be public or authenticated)
			comments.GET("/:id/replies", commentHandler.GetReplies)

			// Protected comment endpoints
			comments.PUT("/:id", middleware.AuthMiddleware(authService), commentHandler.UpdateComment)
			comments.DELETE("/:id", middleware.AuthMiddleware(authService), commentHandler.DeleteComment)
			comments.POST("/:id/vote", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 20, time.Minute), commentHandler.VoteOnComment)
		}

		// Admin routes (if Twitch client is available)
		if clipSyncHandler != nil {
			admin := v1.Group("/admin")
			admin.Use(middleware.AuthMiddleware(authService))
			// TODO: Add admin role check middleware
			{
				sync := admin.Group("/sync")
				{
					sync.POST("/clips", clipSyncHandler.TriggerSync)
					sync.GET("/status", clipSyncHandler.GetSyncStatus)
				}
			}
		}
	}

	// Start background scheduler if Twitch client is available
	var syncScheduler *scheduler.ClipSyncScheduler
	if clipSyncService != nil {
		// Start scheduler to run every 15 minutes
		syncScheduler = scheduler.NewClipSyncScheduler(clipSyncService, 15)
		go syncScheduler.Start(context.Background())
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:    ":" + cfg.Server.Port,
		Handler: r,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting server on :%s (mode: %s)", cfg.Server.Port, cfg.Server.GinMode)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown the server
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Stop scheduler if running
	if syncScheduler != nil {
		syncScheduler.Stop()
	}

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
