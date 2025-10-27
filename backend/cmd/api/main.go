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
	opensearchpkg "github.com/subculture-collective/clipper/pkg/opensearch"
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

	// Initialize OpenSearch client
	osClient, err := opensearchpkg.NewClient(&opensearchpkg.Config{
		URL:                cfg.OpenSearch.URL,
		Username:           cfg.OpenSearch.Username,
		Password:           cfg.OpenSearch.Password,
		InsecureSkipVerify: cfg.OpenSearch.InsecureSkipVerify,
	})
	if err != nil {
		log.Printf("WARNING: Failed to initialize OpenSearch client: %v", err)
		log.Printf("Search features will use PostgreSQL FTS fallback")
	} else {
		// Test connection
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := osClient.Ping(ctx); err != nil {
			log.Printf("WARNING: OpenSearch ping failed: %v", err)
			log.Printf("Search features will use PostgreSQL FTS fallback")
			osClient = nil
		} else {
			log.Println("OpenSearch connection established")
		}
	}

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
	voteRepo := repository.NewVoteRepository(db.Pool)
	favoriteRepo := repository.NewFavoriteRepository(db.Pool)
	tagRepo := repository.NewTagRepository(db.Pool)
	searchRepo := repository.NewSearchRepository(db.Pool)
	submissionRepo := repository.NewSubmissionRepository(db.Pool)
	reportRepo := repository.NewReportRepository(db.Pool)
	reputationRepo := repository.NewReputationRepository(db.Pool)
	notificationRepo := repository.NewNotificationRepository(db.Pool)
	analyticsRepo := repository.NewAnalyticsRepository(db.Pool)
	auditLogRepo := repository.NewAuditLogRepository(db.Pool)

	// Initialize Twitch client
	twitchClient, err := twitch.NewClient(&cfg.Twitch, redisClient)
	if err != nil {
		log.Printf("WARNING: Failed to initialize Twitch client: %v", err)
		log.Printf("Twitch API features will be disabled. Please configure TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET")
	}

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)
	notificationService := services.NewNotificationService(notificationRepo, userRepo, commentRepo, clipRepo, favoriteRepo)
	commentService := services.NewCommentService(commentRepo, clipRepo, notificationService)
	clipService := services.NewClipService(clipRepo, voteRepo, favoriteRepo, userRepo, redisClient)
	autoTagService := services.NewAutoTagService(tagRepo)
	reputationService := services.NewReputationService(reputationRepo, userRepo)
	analyticsService := services.NewAnalyticsService(analyticsRepo, clipRepo)
	auditLogService := services.NewAuditLogService(auditLogRepo)
	
	// Initialize search services
	var searchIndexerService *services.SearchIndexerService
	var openSearchService *services.OpenSearchService
	if osClient != nil {
		searchIndexerService = services.NewSearchIndexerService(osClient)
		openSearchService = services.NewOpenSearchService(osClient)
		
		// Initialize indices in background
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			defer cancel()
			if err := searchIndexerService.InitializeIndices(ctx); err != nil {
				log.Printf("WARNING: Failed to initialize search indices: %v", err)
			} else {
				log.Println("Search indices initialized successfully")
			}
		}()
	}
	
	var clipSyncService *services.ClipSyncService
	var submissionService *services.SubmissionService
	if twitchClient != nil {
		clipSyncService = services.NewClipSyncService(twitchClient, clipRepo)
		submissionService = services.NewSubmissionService(submissionRepo, clipRepo, userRepo, auditLogRepo, twitchClient, notificationService)
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, cfg)
	monitoringHandler := handlers.NewMonitoringHandler(redisClient)
	commentHandler := handlers.NewCommentHandler(commentService)
	clipHandler := handlers.NewClipHandler(clipService, authService)
	tagHandler := handlers.NewTagHandler(tagRepo, clipRepo, autoTagService)
	searchHandler := handlers.NewSearchHandler(searchRepo, authService)
	if openSearchService != nil {
		// Use OpenSearch-enhanced handler
		searchHandler = handlers.NewSearchHandlerWithOpenSearch(searchRepo, openSearchService, authService)
	}
	reportHandler := handlers.NewReportHandler(reportRepo, clipRepo, commentRepo, userRepo, authService)
	reputationHandler := handlers.NewReputationHandler(reputationService, authService)
	notificationHandler := handlers.NewNotificationHandler(notificationService)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService, authService)
	auditLogHandler := handlers.NewAuditLogHandler(auditLogService)
	var clipSyncHandler *handlers.ClipSyncHandler
	var submissionHandler *handlers.SubmissionHandler
	if clipSyncService != nil {
		clipSyncHandler = handlers.NewClipSyncHandler(clipSyncService, cfg)
	}
	if submissionService != nil {
		submissionHandler = handlers.NewSubmissionHandler(submissionService)
	}

	// Initialize router
	r := gin.New()

	// Add custom middleware
	r.Use(gin.Logger())
	r.Use(middleware.JSONRecoveryMiddleware())

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

		checks := gin.H{
			"database": "ok",
			"redis":    "ok",
		}

		// Check OpenSearch connection (optional)
		if osClient != nil {
			if err := osClient.Ping(ctx); err != nil {
				checks["opensearch"] = "degraded"
				log.Printf("OpenSearch health check failed: %v", err)
			} else {
				checks["opensearch"] = "ok"
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "ready",
			"checks": checks,
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
			// Public clip endpoints
			clips.GET("", clipHandler.ListClips)
			clips.GET("/:id", clipHandler.GetClip)
			clips.GET("/:id/related", clipHandler.GetRelatedClips)

			// Clip tags (public)
			clips.GET("/:id/tags", tagHandler.GetClipTags)

			// Clip analytics (public)
			clips.GET("/:id/analytics", analyticsHandler.GetClipAnalytics)
			clips.POST("/:id/track-view", analyticsHandler.TrackClipView)

			// List comments for a clip (public or authenticated)
			clips.GET("/:id/comments", commentHandler.ListComments)

			// Create comment (authenticated, rate limited)
			clips.POST("/:id/comments", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 10, time.Minute), commentHandler.CreateComment)

			// Protected clip endpoints (require authentication)
			clips.POST("/:id/vote", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 20, time.Minute), clipHandler.VoteOnClip)
			clips.POST("/:id/favorite", middleware.AuthMiddleware(authService), clipHandler.AddFavorite)
			clips.DELETE("/:id/favorite", middleware.AuthMiddleware(authService), clipHandler.RemoveFavorite)

			// Tag management for clips (authenticated, rate limited)
			clips.POST("/:id/tags", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 10, time.Minute), tagHandler.AddTagsToClip)
			clips.DELETE("/:id/tags/:slug", middleware.AuthMiddleware(authService), tagHandler.RemoveTagFromClip)

			// User clip submission with rate limiting (5 per hour) - if Twitch client is available
			if clipSyncHandler != nil {
				clips.POST("/request", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 5, time.Hour), clipSyncHandler.RequestClip)
			}

			// Admin clip endpoints
			clips.PUT("/:id", middleware.AuthMiddleware(authService), middleware.RequireRole("admin", "moderator"), clipHandler.UpdateClip)
			clips.DELETE("/:id", middleware.AuthMiddleware(authService), middleware.RequireRole("admin"), clipHandler.DeleteClip)
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

		// Tag routes
		tags := v1.Group("/tags")
		{
			// Public tag endpoints
			tags.GET("", tagHandler.ListTags)
			tags.GET("/search", tagHandler.SearchTags)
			tags.GET("/:slug", tagHandler.GetTag)
			tags.GET("/:slug/clips", tagHandler.GetClipsByTag)
		}

		// Search routes
		search := v1.Group("/search")
		{
			// Public search endpoints
			search.GET("", searchHandler.Search)
			search.GET("/suggestions", searchHandler.GetSuggestions)
		}

		// Submission routes (if submission handler is available)
		if submissionHandler != nil {
			submissions := v1.Group("/submissions")
			submissions.Use(middleware.AuthMiddleware(authService))
			{
				// User submission endpoints
				submissions.POST("", middleware.RateLimitMiddleware(redisClient, 5, time.Hour), submissionHandler.SubmitClip)
				submissions.GET("", submissionHandler.GetUserSubmissions)
				submissions.GET("/stats", submissionHandler.GetSubmissionStats)
			}
		}

		// Report routes
		reports := v1.Group("/reports")
		{
			// Submit a report (authenticated, rate limited)
			reports.POST("", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 10, time.Hour), reportHandler.SubmitReport)
		}

		// Reputation routes
		users := v1.Group("/users")
		{
			// Public reputation endpoints
			users.GET("/:id/reputation", reputationHandler.GetUserReputation)
			users.GET("/:id/karma", reputationHandler.GetUserKarma)
			users.GET("/:id/badges", reputationHandler.GetUserBadges)

			// Personal statistics (authenticated)
			users.GET("/me/stats", middleware.AuthMiddleware(authService), analyticsHandler.GetUserStats)
		}

		// Creator analytics routes
		creators := v1.Group("/creators")
		{
			// Public creator analytics endpoints
			creators.GET("/:creatorName/analytics/overview", analyticsHandler.GetCreatorAnalyticsOverview)
			creators.GET("/:creatorName/analytics/clips", analyticsHandler.GetCreatorTopClips)
			creators.GET("/:creatorName/analytics/trends", analyticsHandler.GetCreatorTrends)
		}

		// Leaderboard routes
		leaderboards := v1.Group("/leaderboards")
		{
			// Public leaderboard endpoints
			leaderboards.GET("/:type", reputationHandler.GetLeaderboard)
		}

		// Badge definitions (public)
		v1.GET("/badges", reputationHandler.GetBadgeDefinitions)

		// Notification routes
		notifications := v1.Group("/notifications")
		notifications.Use(middleware.AuthMiddleware(authService))
		{
			// Get notifications list
			notifications.GET("", notificationHandler.ListNotifications)

			// Get unread count
			notifications.GET("/count", notificationHandler.GetUnreadCount)

			// Mark notification as read
			notifications.PUT("/:id/read", notificationHandler.MarkAsRead)

			// Mark all notifications as read
			notifications.PUT("/read-all", notificationHandler.MarkAllAsRead)

			// Delete notification
			notifications.DELETE("/:id", notificationHandler.DeleteNotification)

			// Get/Update preferences
			notifications.GET("/preferences", notificationHandler.GetPreferences)
			notifications.PUT("/preferences", notificationHandler.UpdatePreferences)
		}

		// Admin routes
		admin := v1.Group("/admin")
		admin.Use(middleware.AuthMiddleware(authService))
		admin.Use(middleware.RequireRole("admin", "moderator"))
		{
			// Clip sync (if available)
			if clipSyncHandler != nil {
				sync := admin.Group("/sync")
				{
					sync.POST("/clips", clipSyncHandler.TriggerSync)
					sync.GET("/status", clipSyncHandler.GetSyncStatus)
				}
			}

			// Admin tag management
			adminTags := admin.Group("/tags")
			{
				adminTags.POST("", tagHandler.CreateTag)
				adminTags.PUT("/:id", tagHandler.UpdateTag)
				adminTags.DELETE("/:id", tagHandler.DeleteTag)
			}

			// Submission moderation (if available)
			if submissionHandler != nil {
				adminSubmissions := admin.Group("/submissions")
				{
					adminSubmissions.GET("", submissionHandler.ListPendingSubmissions)
					adminSubmissions.GET("/rejection-reasons", submissionHandler.GetRejectionReasonTemplates)
					adminSubmissions.POST("/:id/approve", submissionHandler.ApproveSubmission)
					adminSubmissions.POST("/:id/reject", submissionHandler.RejectSubmission)
					adminSubmissions.POST("/bulk-approve", submissionHandler.BulkApproveSubmissions)
					adminSubmissions.POST("/bulk-reject", submissionHandler.BulkRejectSubmissions)
				}
			}

			// Audit log routes
			auditLogs := admin.Group("/audit-logs")
			{
				auditLogs.GET("", auditLogHandler.ListAuditLogs)
				auditLogs.GET("/export", auditLogHandler.ExportAuditLogs)
			}

			// Report management
			adminReports := admin.Group("/reports")
			{
				adminReports.GET("", reportHandler.ListReports)
				adminReports.GET("/:id", reportHandler.GetReport)
				adminReports.PUT("/:id", reportHandler.UpdateReport)
			}

			// Badge management
			adminUsers := admin.Group("/users")
			{
				adminUsers.POST("/:id/badges", reputationHandler.AwardBadge)
				adminUsers.DELETE("/:id/badges/:badgeId", reputationHandler.RemoveBadge)
			}

			// Analytics routes (admin only)
			analytics := admin.Group("/analytics")
			{
				analytics.GET("/overview", analyticsHandler.GetPlatformOverview)
				analytics.GET("/content", analyticsHandler.GetContentMetrics)
				analytics.GET("/trends", analyticsHandler.GetPlatformTrends)
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

	// Start reputation scheduler (runs every 6 hours)
	reputationScheduler := scheduler.NewReputationScheduler(reputationService, userRepo, 6)
	go reputationScheduler.Start(context.Background())

	// Start hot score scheduler (runs every 5 minutes)
	hotScoreScheduler := scheduler.NewHotScoreScheduler(clipRepo, 5)
	go hotScoreScheduler.Start(context.Background())

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
	reputationScheduler.Stop()
	hotScoreScheduler.Stop()

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
