package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/backend/config"
	"github.com/subculture-collective/clipper/backend/internal/database"
	"github.com/subculture-collective/clipper/backend/internal/handlers"
	"github.com/subculture-collective/clipper/backend/internal/middleware"
	"github.com/subculture-collective/clipper/backend/internal/services"
	"github.com/subculture-collective/clipper/backend/pkg/cache"
	"github.com/subculture-collective/clipper/backend/pkg/logger"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize logger
	logger.Init(cfg.LogLevel)
	defer logger.Sync()

	logger.Info("Starting Clipper API",
		"environment", cfg.Environment,
		"port", cfg.Port,
	)

	// Initialize database
	db, err := database.NewPostgresDB(cfg.Database)
	if err != nil {
		logger.Fatal("Failed to connect to database", "error", err)
	}
	defer db.Close()

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		logger.Fatal("Failed to run migrations", "error", err)
	}

	// Initialize Redis cache
	redisCache, err := cache.NewRedisCache(cfg.Redis)
	if err != nil {
		logger.Fatal("Failed to connect to Redis", "error", err)
	}
	defer redisCache.Close()

	// Initialize services
	twitchService := services.NewTwitchService(cfg.Twitch)
	authService := services.NewAuthService(db, twitchService)
	clipService := services.NewClipService(db, twitchService, redisCache)

	// Set Gin mode
	gin.SetMode(cfg.GinMode)

	// Create router
	router := gin.New()

	// Middleware
	router.Use(gin.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.RequestID())

	// CORS configuration
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = cfg.CORS.AllowedOrigins
	corsConfig.AllowCredentials = true
	corsConfig.AllowHeaders = append(corsConfig.AllowHeaders, "Authorization", "X-Request-ID")
	router.Use(cors.New(corsConfig))

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":      "healthy",
			"environment": cfg.Environment,
			"version":     "1.0.0",
		})
	})

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Authentication
		auth := v1.Group("/auth")
		{
			authHandler := handlers.NewAuthHandler(authService)
			auth.GET("/twitch", authHandler.InitiateTwitchAuth)
			auth.GET("/twitch/callback", authHandler.TwitchCallback)
			auth.POST("/logout", middleware.Auth(authService), authHandler.Logout)
		}

		// Clips
		clips := v1.Group("/clips")
		{
			clipHandler := handlers.NewClipHandler(clipService)
			clips.GET("", clipHandler.ListClips)
			clips.GET("/:id", clipHandler.GetClip)
			clips.POST("", middleware.Auth(authService), clipHandler.CreateClip)
			clips.DELETE("/:id", middleware.Auth(authService), clipHandler.DeleteClip)
			clips.POST("/:id/vote", middleware.Auth(authService), clipHandler.VoteClip)
			clips.POST("/:id/favorite", middleware.Auth(authService), clipHandler.FavoriteClip)
			clips.DELETE("/:id/favorite", middleware.Auth(authService), clipHandler.UnfavoriteClip)
		}

		// Documentation
		docs := v1.Group("/docs")
		{
			docsHandler := handlers.NewDocsHandler("./docs", "subculture-collective", "clipper", "main")
			docs.GET("", docsHandler.GetDocsList)
			docs.GET("/search", docsHandler.SearchDocs)
			docs.GET("/*path", docsHandler.GetDoc)
		}
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%s", cfg.Port),
		Handler: router,
	}

	// Start server in goroutine
	go func() {
		logger.Info("Server started", "address", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("Server failed to start", "error", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		logger.Fatal("Server forced to shutdown", "error", err)
	}

	logger.Info("Server exited")
}
