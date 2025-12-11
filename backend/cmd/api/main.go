package main

import (
	"context"
	"log"
	"net/http"
	"net/http/pprof"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/requestid"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/middleware"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/scheduler"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	opensearchpkg "github.com/subculture-collective/clipper/pkg/opensearch"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	sentrypkg "github.com/subculture-collective/clipper/pkg/sentry"
	"github.com/subculture-collective/clipper/pkg/twitch"
	"github.com/subculture-collective/clipper/pkg/utils"
)

func main() {
	// Load configuration
	cfg, cfgErr := config.Load()
	if cfgErr != nil {
		log.Fatalf("Failed to load configuration: %v", cfgErr)
	}

	// Initialize structured logger
	logLevel := utils.LogLevelInfo
	if cfg.Server.GinMode == "debug" {
		logLevel = utils.LogLevelDebug
	}
	utils.InitLogger(logLevel)
	logger := utils.GetLogger()

	// Initialize Sentry
	if initErr := sentrypkg.Init(&cfg.Sentry); initErr != nil {
		log.Printf("WARNING: Failed to initialize Sentry: %v", initErr)
	} else if cfg.Sentry.Enabled {
		log.Printf("Sentry initialized: environment=%s, release=%s", cfg.Sentry.Environment, cfg.Sentry.Release)
		defer sentrypkg.Close()
	}

	// Set Gin mode
	gin.SetMode(cfg.Server.GinMode)

	// Initialize database connection pool
	db, dbErr := database.NewDB(&cfg.Database)
	if dbErr != nil {
		log.Fatalf("Failed to connect to database: %v", dbErr)
	}
	defer db.Close()

	// Initialize Redis client
	redisClient, redisErr := redispkg.NewClient(&cfg.Redis)
	if redisErr != nil {
		log.Fatalf("Failed to connect to Redis: %v", redisErr)
	}
	defer redisClient.Close()

	// Initialize OpenSearch client
	osClient, osErr := opensearchpkg.NewClient(&opensearchpkg.Config{
		URL:                cfg.OpenSearch.URL,
		Username:           cfg.OpenSearch.Username,
		Password:           cfg.OpenSearch.Password,
		InsecureSkipVerify: cfg.OpenSearch.InsecureSkipVerify,
	})
	if osErr != nil {
		log.Printf("WARNING: Failed to initialize OpenSearch client: %v", osErr)
		log.Printf("Search features will use PostgreSQL FTS fallback")
	} else {
		// Test connection
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if pingErr := osClient.Ping(ctx); pingErr != nil {
			log.Printf("WARNING: OpenSearch ping failed: %v", pingErr)
			log.Printf("Search features will use PostgreSQL FTS fallback")
			osClient = nil
		} else {
			log.Println("OpenSearch connection established")
		}
	}

	// Initialize JWT manager
	var jwtManager *jwtpkg.Manager
	if cfg.JWT.PrivateKey != "" {
		manager, jwtErr := jwtpkg.NewManager(cfg.JWT.PrivateKey)
		if jwtErr != nil {
			log.Fatalf("Failed to initialize JWT manager: %v", jwtErr)
		}
		jwtManager = manager
	} else {
		// Generate new RSA key pair for development
		log.Println("WARNING: No JWT private key provided. Generating new key pair (not for production!)")
		privateKey, publicKey, keyErr := jwtpkg.GenerateRSAKeyPair()
		if keyErr != nil {
			log.Fatalf("Failed to generate RSA key pair: %v", keyErr)
		}
		log.Printf("Generated RSA key pair. Add these to your .env file:\n")
		log.Printf("JWT_PRIVATE_KEY:\n%s\n", privateKey)
		log.Printf("JWT_PUBLIC_KEY:\n%s\n", publicKey)
		manager, jwtInitErr := jwtpkg.NewManager(privateKey)
		if jwtInitErr != nil {
			log.Fatalf("Failed to initialize JWT manager: %v", jwtInitErr)
		}
		jwtManager = manager
	}

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	userSettingsRepo := repository.NewUserSettingsRepository(db.Pool)
	accountDeletionRepo := repository.NewAccountDeletionRepository(db.Pool)
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
	emailNotificationRepo := repository.NewEmailNotificationRepository(db.Pool)
	analyticsRepo := repository.NewAnalyticsRepository(db.Pool)
	auditLogRepo := repository.NewAuditLogRepository(db.Pool)
	subscriptionRepo := repository.NewSubscriptionRepository(db.Pool)
	webhookRepo := repository.NewWebhookRepository(db.Pool)
	outboundWebhookRepo := repository.NewOutboundWebhookRepository(db.Pool)
	dunningRepo := repository.NewDunningRepository(db.Pool)
	contactRepo := repository.NewContactRepository(db.Pool)
	revenueRepo := repository.NewRevenueRepository(db.Pool)
	adRepo := repository.NewAdRepository(db.Pool)
	exportRepo := repository.NewExportRepository(db.Pool)
	broadcasterRepo := repository.NewBroadcasterRepository(db.Pool)
	emailLogRepo := repository.NewEmailLogRepository(db.Pool)
	feedRepo := repository.NewFeedRepository(db.Pool)
	discoveryListRepo := repository.NewDiscoveryListRepository(db.Pool)
	categoryRepo := repository.NewCategoryRepository(db.Pool)
	gameRepo := repository.NewGameRepository(db.Pool)
	communityRepo := repository.NewCommunityRepository(db.Pool)
	accountTypeConversionRepo := repository.NewAccountTypeConversionRepository(db.Pool)

	// Initialize Twitch client
	twitchClient, err := twitch.NewClient(&cfg.Twitch, redisClient)
	if err != nil {
		log.Printf("WARNING: Failed to initialize Twitch client: %v", err)
		log.Printf("Twitch API features will be disabled. Please configure TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET")
	}

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	// Initialize email service with notification repo for preference checking
	emailService := services.NewEmailService(&services.EmailConfig{
		SendGridAPIKey:   cfg.Email.SendGridAPIKey,
		FromEmail:        cfg.Email.FromEmail,
		FromName:         cfg.Email.FromName,
		BaseURL:          cfg.Server.BaseURL,
		Enabled:          cfg.Email.Enabled,
		SandboxMode:      cfg.Email.SandboxMode,
		MaxEmailsPerHour: cfg.Email.MaxEmailsPerHour,
	}, emailNotificationRepo, notificationRepo)

	notificationService := services.NewNotificationService(notificationRepo, userRepo, commentRepo, clipRepo, favoriteRepo, emailService)
	commentService := services.NewCommentService(commentRepo, clipRepo, notificationService)
	clipService := services.NewClipService(clipRepo, voteRepo, favoriteRepo, userRepo, redisClient, auditLogRepo, notificationService)
	autoTagService := services.NewAutoTagService(tagRepo)
	reputationService := services.NewReputationService(reputationRepo, userRepo)
	analyticsService := services.NewAnalyticsService(analyticsRepo, clipRepo)
	engagementService := services.NewEngagementService(analyticsRepo, userRepo, clipRepo)
	auditLogService := services.NewAuditLogService(auditLogRepo)

	// Initialize dunning service before subscription service
	dunningService := services.NewDunningService(dunningRepo, subscriptionRepo, userRepo, emailService, auditLogService)

	subscriptionService := services.NewSubscriptionService(subscriptionRepo, userRepo, webhookRepo, cfg, auditLogService, dunningService, emailService)
	webhookRetryService := services.NewWebhookRetryService(webhookRepo, subscriptionService)
	userSettingsService := services.NewUserSettingsService(userRepo, userSettingsRepo, accountDeletionRepo, clipRepo, voteRepo, favoriteRepo, auditLogService)
	revenueService := services.NewRevenueService(revenueRepo, cfg)
	adService := services.NewAdService(adRepo, redisClient)

	// Initialize email monitoring and metrics service
	emailMetricsService := services.NewEmailMetricsService(emailLogRepo)

	// Initialize feed service
	feedService := services.NewFeedService(feedRepo, clipRepo, userRepo, broadcasterRepo)

	// Initialize community service
	communityService := services.NewCommunityService(communityRepo, clipRepo, userRepo, notificationService)

	// Initialize account type service
	accountTypeService := services.NewAccountTypeService(userRepo, accountTypeConversionRepo, auditLogRepo)

	// Initialize export service with exports directory
	exportDir := cfg.Server.ExportDir
	if exportDir == "" {
		exportDir = "./exports"
	}
	// Default retention period is 7 days
	exportRetentionDays := 7
	exportService := services.NewExportService(exportRepo, emailService, exportDir, cfg.Server.BaseURL, exportRetentionDays)

	// Initialize search and embedding services
	var searchIndexerService *services.SearchIndexerService
	var openSearchService *services.OpenSearchService
	var hybridSearchService *services.HybridSearchService
	var embeddingService *services.EmbeddingService

	// Initialize embedding service if enabled and configured
	if cfg.Embedding.Enabled {
		if cfg.Embedding.OpenAIAPIKey == "" {
			log.Println("WARNING: Embedding is enabled but OPENAI_API_KEY is not set; disabling embeddings")
		} else {
			embeddingService = services.NewEmbeddingService(&services.EmbeddingConfig{
				APIKey:            cfg.Embedding.OpenAIAPIKey,
				Model:             cfg.Embedding.Model,
				RedisClient:       redisClient.GetClient(),
				RequestsPerMinute: cfg.Embedding.RequestsPerMinute,
			})
			log.Printf("Embedding service initialized (model: %s)", cfg.Embedding.Model)
		}
	}
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

		// Initialize hybrid search when OpenSearch is available
		hybridSearchService = services.NewHybridSearchService(&services.HybridSearchConfig{
			Pool:              db.Pool,
			OpenSearchService: openSearchService,
			EmbeddingService:  embeddingService,
			RedisClient:       redisClient.GetClient(),
		})
	}

	var clipSyncService *services.ClipSyncService
	var submissionService *services.SubmissionService
	var liveStatusService *services.LiveStatusService
	outboundWebhookService := services.NewOutboundWebhookService(outboundWebhookRepo)
	if twitchClient != nil {
		clipSyncService = services.NewClipSyncService(twitchClient, clipRepo)
		submissionService = services.NewSubmissionService(submissionRepo, clipRepo, userRepo, voteRepo, auditLogRepo, twitchClient, notificationService, redisClient, outboundWebhookService, cfg)
		liveStatusService = services.NewLiveStatusService(broadcasterRepo, twitchClient)
		// Set notification service for live status notifications
		liveStatusService.SetNotificationService(notificationService)
	}

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, cfg)
	monitoringHandler := handlers.NewMonitoringHandler(redisClient)
	webhookMonitoringHandler := handlers.NewWebhookMonitoringHandler(webhookRetryService)
	commentHandler := handlers.NewCommentHandler(commentService)
	clipHandler := handlers.NewClipHandler(clipService, authService)
	favoriteHandler := handlers.NewFavoriteHandler(favoriteRepo, voteRepo, clipService)
	tagHandler := handlers.NewTagHandler(tagRepo, clipRepo, autoTagService)
	searchHandler := handlers.NewSearchHandler(searchRepo, authService)
	if hybridSearchService != nil {
		// Use hybrid search (BM25 + vector similarity)
		searchHandler = handlers.NewSearchHandlerWithHybridSearch(searchRepo, hybridSearchService, authService)
		log.Println("Using hybrid search handler (BM25 + vector similarity)")
	} else if openSearchService != nil {
		// Use OpenSearch-enhanced handler (BM25 only)
		searchHandler = handlers.NewSearchHandlerWithOpenSearch(searchRepo, openSearchService, authService)
		log.Println("Using OpenSearch handler (BM25 only)")
	} else {
		log.Println("Using PostgreSQL FTS handler (fallback)")
	}
	reportHandler := handlers.NewReportHandler(reportRepo, clipRepo, commentRepo, userRepo, authService)
	reputationHandler := handlers.NewReputationHandler(reputationService, authService)
	notificationHandler := handlers.NewNotificationHandler(notificationService, emailService)
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService, authService)
	engagementHandler := handlers.NewEngagementHandler(engagementService, authService)
	auditLogHandler := handlers.NewAuditLogHandler(auditLogService)
	subscriptionHandler := handlers.NewSubscriptionHandler(subscriptionService)
	userHandler := handlers.NewUserHandler(clipRepo, voteRepo, commentRepo, userRepo, broadcasterRepo)
	userSettingsHandler := handlers.NewUserSettingsHandler(userSettingsService, authService)
	contactHandler := handlers.NewContactHandler(contactRepo, authService)
	seoHandler := handlers.NewSEOHandler(clipRepo)
	docsHandler := handlers.NewDocsHandler(cfg.Server.DocsPath, "subculture-collective", "clipper", "main")
	revenueHandler := handlers.NewRevenueHandler(revenueService)
	adHandler := handlers.NewAdHandler(adService)
	exportHandler := handlers.NewExportHandler(exportService, authService, userRepo)
	webhookSubscriptionHandler := handlers.NewWebhookSubscriptionHandler(outboundWebhookService)
	configHandler := handlers.NewConfigHandler(cfg)
	broadcasterHandler := handlers.NewBroadcasterHandler(broadcasterRepo, clipRepo, twitchClient, authService)
	emailMetricsHandler := handlers.NewEmailMetricsHandler(emailMetricsService, emailLogRepo)
	sendgridWebhookHandler := handlers.NewSendGridWebhookHandler(emailLogRepo, cfg.Email.SendGridWebhookPublicKey)
	feedHandler := handlers.NewFeedHandler(feedService, authService)
	communityHandler := handlers.NewCommunityHandler(communityService, authService)
	discoveryListHandler := handlers.NewDiscoveryListHandler(discoveryListRepo, analyticsRepo)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo, clipRepo)
	gameHandler := handlers.NewGameHandler(gameRepo, clipRepo, authService)
	accountTypeHandler := handlers.NewAccountTypeHandler(accountTypeService, authService)
	var clipSyncHandler *handlers.ClipSyncHandler
	var submissionHandler *handlers.SubmissionHandler
	var moderationHandler *handlers.ModerationHandler
	var liveStatusHandler *handlers.LiveStatusHandler
	if clipSyncService != nil {
		clipSyncHandler = handlers.NewClipSyncHandler(clipSyncService, cfg)
	}
	if submissionService != nil {
		submissionHandler = handlers.NewSubmissionHandler(submissionService)
		// Create moderation handler using services from submission service
		abuseDetector := submissionService.GetAbuseDetector()
		moderationEventService := submissionService.GetModerationEventService()
		if abuseDetector != nil && moderationEventService != nil {
			moderationHandler = handlers.NewModerationHandler(moderationEventService, abuseDetector)
		}
	}
	if liveStatusService != nil {
		liveStatusHandler = handlers.NewLiveStatusHandler(liveStatusService, authService)
	}

	// Initialize router
	r := gin.New()

	// Add custom middleware
	// Request ID must come first to be available in other middleware
	r.Use(requestid.New())

	// Add Sentry middleware for error tracking (if enabled)
	if cfg.Sentry.Enabled {
		r.Use(middleware.SentryMiddleware())
		r.Use(middleware.RecoverWithSentry())
	} else {
		r.Use(middleware.JSONRecoveryMiddleware())
	}

	// Use structured logger
	r.Use(logger.GinLogger())

	// Apply metrics middleware for Prometheus
	r.Use(middleware.MetricsMiddleware())

	// Apply CORS middleware
	r.Use(middleware.CORSMiddleware(cfg))

	// Apply security headers middleware
	r.Use(middleware.SecurityHeadersMiddleware(cfg))

	// Apply input validation middleware
	r.Use(middleware.InputValidationMiddleware())

	// Apply abuse detection middleware
	r.Use(middleware.AbuseDetectionMiddleware(redisClient))

	// Apply CSRF protection middleware (secure in production)
	isProduction := cfg.Server.GinMode == "release"
	r.Use(middleware.CSRFMiddleware(redisClient, isProduction))

	// Add middleware to inject base URL and environment into context
	r.Use(func(c *gin.Context) {
		c.Set("base_url", cfg.Server.BaseURL)
		c.Set("environment", cfg.Server.Environment)
		c.Next()
	})

	// Note: Subscription enrichment is now handled on-demand within rate limit middleware
	// to avoid unnecessary database calls for routes that don't use rate limiting

	// SEO endpoints (sitemap, robots.txt)
	r.GET("/sitemap.xml", seoHandler.GetSitemap)
	r.GET("/robots.txt", seoHandler.GetRobotsTxt)

	// Health check endpoints (additional checks requiring middleware)

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
				log.Printf("OpenSearch health check failed (%T): %v", err, err)
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

	// Webhook monitoring endpoint
	r.GET("/health/webhooks", webhookMonitoringHandler.GetWebhookRetryStats)

	// Profiling and metrics endpoints (for debugging and monitoring)
	// These should be protected in production (e.g., firewall rules or internal network only)
	debug := r.Group("/debug")
	{
		// Prometheus metrics endpoint
		debug.GET("/metrics", gin.WrapH(promhttp.Handler()))

		// Go pprof endpoints for profiling
		debug.GET("/pprof/", gin.WrapF(pprof.Index))
		debug.GET("/pprof/cmdline", gin.WrapF(pprof.Cmdline))
		debug.GET("/pprof/profile", gin.WrapF(pprof.Profile))
		debug.GET("/pprof/symbol", gin.WrapF(pprof.Symbol))
		debug.GET("/pprof/trace", gin.WrapF(pprof.Trace))
		debug.GET("/pprof/allocs", gin.WrapH(pprof.Handler("allocs")))
		debug.GET("/pprof/block", gin.WrapH(pprof.Handler("block")))
		debug.GET("/pprof/goroutine", gin.WrapH(pprof.Handler("goroutine")))
		debug.GET("/pprof/heap", gin.WrapH(pprof.Handler("heap")))
		debug.GET("/pprof/mutex", gin.WrapH(pprof.Handler("mutex")))
		debug.GET("/pprof/threadcreate", gin.WrapH(pprof.Handler("threadcreate")))
	}

	// API version 1 routes
	v1 := r.Group("/api/v1")
	{
		// Basic health check
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"status": "healthy",
			})
		})

		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"message": "pong",
			})
		})

		// Public config endpoint
		v1.GET("/config", configHandler.GetPublicConfig)

		// Auth routes
		auth := v1.Group("/auth")
		{
			// Public auth endpoints with rate limiting (increased for legitimate OAuth flows)
			auth.GET("/twitch", middleware.RateLimitMiddleware(redisClient, 30, time.Minute), authHandler.InitiateOAuth)
			auth.GET("/twitch/callback", middleware.RateLimitMiddleware(redisClient, 50, time.Minute), authHandler.HandleCallback)
			auth.POST("/twitch/callback", middleware.RateLimitMiddleware(redisClient, 50, time.Minute), authHandler.HandlePKCECallback)
			auth.POST("/refresh", middleware.RateLimitMiddleware(redisClient, 50, time.Minute), authHandler.RefreshToken)
			auth.POST("/logout", authHandler.Logout)

			// Protected auth endpoints
			auth.GET("/me", middleware.AuthMiddleware(authService), authHandler.GetCurrentUser)
			auth.POST("/twitch/reauthorize", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 3, time.Hour), authHandler.ReauthorizeTwitch)
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

			// Clip engagement score (public)
			clips.GET("/:id/engagement", engagementHandler.GetContentEngagementScore)

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

			// Creator content management (authenticated)
			clips.PUT("/:id/metadata", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 10, time.Minute), clipHandler.UpdateClipMetadata)
			clips.PUT("/:id/visibility", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 10, time.Minute), clipHandler.UpdateClipVisibility)

			// User clip submission with rate limiting (5 per hour) - if Twitch client is available
			if clipSyncHandler != nil {
				clips.POST("/request", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 5, time.Hour), clipSyncHandler.RequestClip)
			}

			// Admin clip endpoints
			clips.PUT("/:id", middleware.AuthMiddleware(authService), middleware.RequireRole("admin", "moderator"), clipHandler.UpdateClip)
			clips.DELETE("/:id", middleware.AuthMiddleware(authService), middleware.RequireRole("admin"), clipHandler.DeleteClip)
		}

		// Scraped clips routes
		scrapedClips := v1.Group("/scraped-clips")
		{
			// Public endpoint for listing scraped clips (not claimed by users)
			scrapedClips.GET("", clipHandler.ListScrapedClips)
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

		// Favorite routes
		favorites := v1.Group("/favorites")
		{
			// Protected favorite endpoints (require authentication)
			favorites.GET("", middleware.AuthMiddleware(authService), favoriteHandler.ListUserFavorites)
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
			search.GET("/scores", searchHandler.SearchWithScores) // Hybrid search with similarity scores
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
				// Metadata endpoint with rate limiting (100 requests/hour per user)
				submissions.GET("/metadata", middleware.RateLimitMiddleware(redisClient, 100, time.Hour), submissionHandler.GetClipMetadata)
				// Check clip status endpoint to see if it can be claimed
				submissions.GET("/check/:clip_id", middleware.RateLimitMiddleware(redisClient, 100, time.Hour), submissionHandler.CheckClipStatus)
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
			// Public user profile
			users.GET("/by-username/:username", userHandler.GetUserByUsername)
			users.GET("/:id", middleware.OptionalAuthMiddleware(authService), userHandler.GetUserProfile)

			// Public reputation endpoints
			users.GET("/:id/reputation", reputationHandler.GetUserReputation)
			users.GET("/:id/karma", reputationHandler.GetUserKarma)
			users.GET("/:id/badges", reputationHandler.GetUserBadges)

			// User activity endpoints
			users.GET("/:id/comments", userHandler.GetUserComments)
			users.GET("/:id/clips", middleware.OptionalAuthMiddleware(authService), userHandler.GetUserClips)
			users.GET("/:id/activity", middleware.OptionalAuthMiddleware(authService), userHandler.GetUserActivity)
			users.GET("/:id/upvoted", userHandler.GetUserUpvotedClips)
			users.GET("/:id/downvoted", userHandler.GetUserDownvotedClips)
			
			// User social connections
			users.GET("/:id/followers", middleware.OptionalAuthMiddleware(authService), userHandler.GetUserFollowers)
			users.GET("/:id/following", middleware.OptionalAuthMiddleware(authService), userHandler.GetUserFollowing)
			users.GET("/:id/following/broadcasters", middleware.OptionalAuthMiddleware(authService), userHandler.GetFollowedBroadcasters)
			users.POST("/:id/follow", middleware.AuthMiddleware(authService), userHandler.FollowUser)
			users.DELETE("/:id/follow", middleware.AuthMiddleware(authService), userHandler.UnfollowUser)
			
			// User blocking
			users.POST("/:id/block", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 20, time.Minute), userHandler.BlockUser)
			users.DELETE("/:id/block", middleware.AuthMiddleware(authService), userHandler.UnblockUser)
			users.GET("/me/blocked", middleware.AuthMiddleware(authService), userHandler.GetBlockedUsers)

			// Personal statistics (authenticated)
			users.GET("/me/stats", middleware.AuthMiddleware(authService), analyticsHandler.GetUserStats)

			// User engagement score (authenticated)
		users.GET("/:id/engagement", middleware.AuthMiddleware(authService), engagementHandler.GetUserEngagementScore)

			// Profile management (authenticated)
			users.PUT("/me/profile", middleware.AuthMiddleware(authService), userSettingsHandler.UpdateProfile)
			users.PUT("/me/social-links", middleware.AuthMiddleware(authService), userSettingsHandler.UpdateSocialLinks)
			users.GET("/me/settings", middleware.AuthMiddleware(authService), userSettingsHandler.GetSettings)
			users.PUT("/me/settings", middleware.AuthMiddleware(authService), userSettingsHandler.UpdateSettings)

			// Data export (authenticated, rate limited)
			users.GET("/me/export", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 1, time.Hour), userSettingsHandler.ExportData)

			// Account deletion (authenticated, rate limited)
			users.POST("/me/delete", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 1, time.Hour), userSettingsHandler.RequestAccountDeletion)
			users.POST("/me/delete/cancel", middleware.AuthMiddleware(authService), userSettingsHandler.CancelAccountDeletion)
			users.GET("/me/delete/status", middleware.AuthMiddleware(authService), userSettingsHandler.GetDeletionStatus)

			// Email logs for current user (authenticated)
			users.GET("/me/email-logs", middleware.AuthMiddleware(authService), emailMetricsHandler.GetUserEmailLogs)

			// Account type endpoints
			users.GET("/:id/account-type", middleware.OptionalAuthMiddleware(authService), accountTypeHandler.GetAccountType)
			users.GET("/:id/account-type/history", middleware.OptionalAuthMiddleware(authService), accountTypeHandler.GetConversionHistory)
			users.POST("/me/convert-to-broadcaster", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 3, 24*time.Hour), accountTypeHandler.ConvertToBroadcaster)

			// Discovery list follows for current user (authenticated)
			users.GET("/me/discovery-list-follows", middleware.AuthMiddleware(authService), discoveryListHandler.GetUserFollowedLists)

			// Game follows for a user
			users.GET("/:userId/games/following", gameHandler.GetFollowedGames)
			// User feeds routes
			users.GET("/:id/feeds", middleware.OptionalAuthMiddleware(authService), feedHandler.ListUserFeeds)
			users.POST("/:id/feeds", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 10, time.Hour), feedHandler.CreateFeed)
			users.GET("/:id/feeds/:feedId", middleware.OptionalAuthMiddleware(authService), feedHandler.GetFeed)
			users.PUT("/:id/feeds/:feedId", middleware.AuthMiddleware(authService), feedHandler.UpdateFeed)
			users.DELETE("/:id/feeds/:feedId", middleware.AuthMiddleware(authService), feedHandler.DeleteFeed)
			users.GET("/:id/feeds/:feedId/clips", middleware.OptionalAuthMiddleware(authService), feedHandler.GetFeedClips)
			users.POST("/:id/feeds/:feedId/clips", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 20, time.Minute), feedHandler.AddClipToFeed)
			users.DELETE("/:id/feeds/:feedId/clips/:clipId", middleware.AuthMiddleware(authService), feedHandler.RemoveClipFromFeed)
			users.PUT("/:id/feeds/:feedId/clips/reorder", middleware.AuthMiddleware(authService), feedHandler.ReorderFeedClips)
			users.POST("/:id/feeds/:feedId/follow", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 20, time.Minute), feedHandler.FollowFeed)
			users.DELETE("/:id/feeds/:feedId/follow", middleware.AuthMiddleware(authService), feedHandler.UnfollowFeed)
		}

		// Creator analytics routes
		creators := v1.Group("/creators")
		{
			// Public creator analytics endpoints
			creators.GET("/:creatorName/analytics/overview", analyticsHandler.GetCreatorAnalyticsOverview)
			creators.GET("/:creatorName/analytics/clips", analyticsHandler.GetCreatorTopClips)
			creators.GET("/:creatorName/analytics/trends", analyticsHandler.GetCreatorTrends)
			creators.GET("/:creatorName/analytics/audience", analyticsHandler.GetCreatorAudienceInsights)

			// Creator clips listing (shows hidden clips if authenticated as creator)
			creators.GET("/:creatorName/clips", middleware.OptionalAuthMiddleware(authService), clipHandler.ListCreatorClips)

			// Creator data export routes (authenticated, rate limited)
			creators.POST("/me/export/request", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 3, 24*time.Hour), exportHandler.RequestExport)
			creators.GET("/me/exports", middleware.AuthMiddleware(authService), exportHandler.ListExportRequests)
			creators.GET("/me/export/status/:id", middleware.AuthMiddleware(authService), exportHandler.GetExportStatus)
			creators.GET("/me/export/download/:id", middleware.AuthMiddleware(authService), exportHandler.DownloadExport)
		}

		// Broadcaster routes
		broadcasters := v1.Group("/broadcasters")
		{
			// Live status endpoints (must come before /:id route)
			if liveStatusHandler != nil {
				// Public list of all live broadcasters
				broadcasters.GET("/live", liveStatusHandler.ListLiveBroadcasters)
			}

			// Public broadcaster profile endpoint (with optional auth for follow status)
			broadcasters.GET("/:id", middleware.OptionalAuthMiddleware(authService), broadcasterHandler.GetBroadcasterProfile)

			// Public broadcaster clips endpoint
			broadcasters.GET("/:id/clips", broadcasterHandler.ListBroadcasterClips)

			// Live status for specific broadcaster
			if liveStatusHandler != nil {
				broadcasters.GET("/:id/live-status", liveStatusHandler.GetBroadcasterLiveStatus)
			}

			// Protected broadcaster endpoints (require authentication)
			broadcasters.POST("/:id/follow", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 20, time.Minute), broadcasterHandler.FollowBroadcaster)
			broadcasters.DELETE("/:id/follow", middleware.AuthMiddleware(authService), broadcasterHandler.UnfollowBroadcaster)
		}

		// Category routes
		categories := v1.Group("/categories")
		{
			// Public category endpoints
			categories.GET("", categoryHandler.ListCategories)
			categories.GET("/:slug", categoryHandler.GetCategory)
			categories.GET("/:slug/games", categoryHandler.ListCategoryGames)
			categories.GET("/:slug/clips", categoryHandler.ListCategoryClips)
		}

		// Game routes
		games := v1.Group("/games")
		{
			// Public game endpoints
			games.GET("/trending", gameHandler.GetTrendingGames)
			games.GET("/:gameId", middleware.OptionalAuthMiddleware(authService), gameHandler.GetGame)
			games.GET("/:gameId/clips", gameHandler.ListGameClips)

			// Protected game endpoints (require authentication)
			games.POST("/:gameId/follow", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 20, time.Minute), gameHandler.FollowGame)
			games.DELETE("/:gameId/follow", middleware.AuthMiddleware(authService), gameHandler.UnfollowGame)
		}

		// Discovery list routes
		discoveryLists := v1.Group("/discovery-lists")
		{
			// Public discovery list endpoints
			discoveryLists.GET("", middleware.OptionalAuthMiddleware(authService), discoveryListHandler.ListDiscoveryLists)
			discoveryLists.GET("/:id", middleware.OptionalAuthMiddleware(authService), discoveryListHandler.GetDiscoveryList)
			discoveryLists.GET("/:id/clips", middleware.OptionalAuthMiddleware(authService), discoveryListHandler.GetDiscoveryListClips)

			// Protected discovery list endpoints (require authentication)
			discoveryLists.POST("/:id/follow", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 20, time.Minute), discoveryListHandler.FollowDiscoveryList)
			discoveryLists.DELETE("/:id/follow", middleware.AuthMiddleware(authService), discoveryListHandler.UnfollowDiscoveryList)
			discoveryLists.POST("/:id/bookmark", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 20, time.Minute), discoveryListHandler.BookmarkDiscoveryList)
			discoveryLists.DELETE("/:id/bookmark", middleware.AuthMiddleware(authService), discoveryListHandler.UnbookmarkDiscoveryList)
		}

		// Leaderboard routes
		leaderboards := v1.Group("/leaderboards")
		{
			// Public leaderboard endpoints
			leaderboards.GET("/:type", reputationHandler.GetLeaderboard)
		}

		// Badge definitions (public)
		v1.GET("/badges", reputationHandler.GetBadgeDefinitions)

		// Feed discovery and search routes
		feeds := v1.Group("/feeds")
		{
			// Public feed discovery endpoints
			feeds.GET("/discover", feedHandler.DiscoverFeeds)
			feeds.GET("/search", feedHandler.SearchFeeds)
			
			// Following feed (authenticated)
			feeds.GET("/following", middleware.AuthMiddleware(authService), feedHandler.GetFollowingFeed)
		}

		// Live feed (authenticated)
		if liveStatusHandler != nil {
			v1.GET("/feed/live", middleware.AuthMiddleware(authService), liveStatusHandler.GetFollowedLiveBroadcasters)
		}

		// Notification routes
		notifications := v1.Group("/notifications")
		{
			// Public unsubscribe endpoint (no auth required, uses token, but rate limited)
			notifications.GET("/unsubscribe", middleware.RateLimitMiddleware(redisClient, 10, time.Minute), notificationHandler.Unsubscribe)

			// Protected notification endpoints (require authentication)
			notifications.Use(middleware.AuthMiddleware(authService))

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
			notifications.POST("/preferences/reset", notificationHandler.ResetPreferences)

			// Device token registration for push notifications
			notifications.POST("/register", notificationHandler.RegisterDeviceToken)
			notifications.DELETE("/unregister", notificationHandler.UnregisterDeviceToken)
		}

		// Subscription routes
		subscriptions := v1.Group("/subscriptions")
		{
			// Webhook endpoint (public, no auth required)
			v1.POST("/webhooks/stripe", subscriptionHandler.HandleWebhook)
			// SendGrid webhook endpoint (public, no auth required, signature verified internally)
			v1.POST("/webhooks/sendgrid", sendgridWebhookHandler.HandleWebhook)

			// Protected subscription endpoints (require authentication)
			subscriptions.Use(middleware.AuthMiddleware(authService))
			subscriptions.GET("/me", subscriptionHandler.GetSubscription)
			subscriptions.POST("/checkout", middleware.RateLimitMiddleware(redisClient, 5, time.Minute), subscriptionHandler.CreateCheckoutSession)
			subscriptions.POST("/portal", middleware.RateLimitMiddleware(redisClient, 10, time.Minute), subscriptionHandler.CreatePortalSession)
			subscriptions.POST("/change-plan", middleware.RateLimitMiddleware(redisClient, 5, time.Minute), subscriptionHandler.ChangeSubscriptionPlan)
		}

		// Outbound webhook subscription routes
		webhooks := v1.Group("/webhooks")
		{
			// Get supported webhook events (public, rate-limited)
			webhooks.GET("/events", middleware.RateLimitMiddleware(redisClient, 60, time.Minute), webhookSubscriptionHandler.GetSupportedEvents)

			// Protected webhook subscription endpoints (require authentication)
			webhooks.Use(middleware.AuthMiddleware(authService))

			// CRUD operations for webhook subscriptions
			webhooks.POST("", middleware.RateLimitMiddleware(redisClient, 10, time.Hour), webhookSubscriptionHandler.CreateSubscription)
			webhooks.GET("", webhookSubscriptionHandler.ListSubscriptions)
			webhooks.GET("/:id", webhookSubscriptionHandler.GetSubscription)
			webhooks.PATCH("/:id", webhookSubscriptionHandler.UpdateSubscription)
			webhooks.DELETE("/:id", webhookSubscriptionHandler.DeleteSubscription)

			// Secret regeneration
			webhooks.POST("/:id/regenerate-secret", middleware.RateLimitMiddleware(redisClient, 5, time.Hour), webhookSubscriptionHandler.RegenerateSecret)

			// Delivery history
			webhooks.GET("/:id/deliveries", webhookSubscriptionHandler.GetSubscriptionDeliveries)
		}

		// Contact routes
		contact := v1.Group("/contact")
		{
			// Public contact form submission with rate limiting
			contact.POST("", middleware.RateLimitMiddleware(redisClient, 3, time.Hour), contactHandler.SubmitContactMessage)
		}

		// Ad routes
		ads := v1.Group("/ads")
		{
			// Ad selection endpoint - rate limited to prevent abuse
			ads.GET("/select", middleware.RateLimitMiddleware(redisClient, 60, time.Minute), adHandler.SelectAd)
			// Ad tracking endpoint - higher rate limit for tracking callbacks
			ads.POST("/track/:id", middleware.RateLimitMiddleware(redisClient, 120, time.Minute), adHandler.TrackImpression)
			// Get ad by ID (public)
			ads.GET("/:id", adHandler.GetAd)
		}

		// Documentation routes (public access)
		docs := v1.Group("/docs")
		{
			docs.GET("", docsHandler.GetDocsList)
			docs.GET("/search", docsHandler.SearchDocs)
			// Catch-all route must be last
			docs.GET("/:path", docsHandler.GetDoc) // Changed from /*path to /:path to avoid conflict
		}

		// Community routes
		communities := v1.Group("/communities")
		{
			// Public community endpoints
			communities.GET("", communityHandler.ListCommunities)
			communities.GET("/search", communityHandler.SearchCommunities)
			communities.GET("/:id", middleware.OptionalAuthMiddleware(authService), communityHandler.GetCommunity)
			communities.GET("/:id/members", communityHandler.GetMembers)
			communities.GET("/:id/feed", communityHandler.GetCommunityFeed)
			communities.GET("/:id/discussions", communityHandler.ListDiscussions)
			communities.GET("/:id/discussions/:discussionId", communityHandler.GetDiscussion)

			// Protected community endpoints (require authentication)
			communities.POST("", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 5, time.Hour), communityHandler.CreateCommunity)
			communities.PUT("/:id", middleware.AuthMiddleware(authService), communityHandler.UpdateCommunity)
			communities.DELETE("/:id", middleware.AuthMiddleware(authService), communityHandler.DeleteCommunity)
			
			// Member management
			communities.POST("/:id/join", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 10, time.Minute), communityHandler.JoinCommunity)
			communities.POST("/:id/leave", middleware.AuthMiddleware(authService), communityHandler.LeaveCommunity)
			communities.PUT("/:id/members/:userId/role", middleware.AuthMiddleware(authService), communityHandler.UpdateMemberRole)
			
			// Moderation
			communities.POST("/:id/ban", middleware.AuthMiddleware(authService), communityHandler.BanMember)
			communities.DELETE("/:id/ban/:userId", middleware.AuthMiddleware(authService), communityHandler.UnbanMember)
			communities.GET("/:id/bans", middleware.AuthMiddleware(authService), communityHandler.GetBannedMembers)
			
			// Community feed management
			communities.POST("/:id/clips", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 20, time.Minute), communityHandler.AddClipToCommunity)
			communities.DELETE("/:id/clips/:clipId", middleware.AuthMiddleware(authService), communityHandler.RemoveClipFromCommunity)
			
			// Discussions
			communities.POST("/:id/discussions", middleware.AuthMiddleware(authService), middleware.RateLimitMiddleware(redisClient, 10, time.Minute), communityHandler.CreateDiscussion)
			communities.PUT("/:id/discussions/:discussionId", middleware.AuthMiddleware(authService), communityHandler.UpdateDiscussion)
			communities.DELETE("/:id/discussions/:discussionId", middleware.AuthMiddleware(authService), communityHandler.DeleteDiscussion)
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

			// Account type management (admin only)
			adminAccountTypes := admin.Group("/account-types")
			{
				adminAccountTypes.GET("/stats", middleware.RequirePermission(models.PermissionManageUsers), accountTypeHandler.GetAccountTypeStats)
				adminAccountTypes.GET("/conversions", middleware.RequirePermission(models.PermissionManageUsers), accountTypeHandler.GetRecentConversions)
				adminAccountTypes.POST("/users/:id/convert-to-moderator", middleware.RequirePermission(models.PermissionManageUsers), accountTypeHandler.ConvertToModerator)
			}

			// Analytics routes (admin only)
			analytics := admin.Group("/analytics")
			{
				analytics.GET("/overview", analyticsHandler.GetPlatformOverview)
				analytics.GET("/content", analyticsHandler.GetContentMetrics)
				analytics.GET("/trends", analyticsHandler.GetPlatformTrends)

				// Engagement metrics routes
				analytics.GET("/health", engagementHandler.GetPlatformHealthMetrics)
				analytics.GET("/trending", engagementHandler.GetTrendingMetrics)
				analytics.GET("/alerts", engagementHandler.CheckAlerts)
				analytics.GET("/export", engagementHandler.ExportEngagementData)
			}

			// Revenue metrics (admin only)
			admin.GET("/revenue", revenueHandler.GetRevenueMetrics)

			// Contact message management (admin only)
			adminContact := admin.Group("/contact")
			{
				adminContact.GET("", contactHandler.GetContactMessages)
				adminContact.PUT("/:id/status", contactHandler.UpdateContactMessageStatus)
			}

			// Ad Campaign management (admin only)
			adminAds := admin.Group("/ads")
			{
				// Campaign CRUD
				adminAds.GET("/campaigns", adHandler.ListCampaigns)
				adminAds.GET("/campaigns/:id", adHandler.GetCampaign)
				adminAds.POST("/campaigns", adHandler.CreateCampaign)
				adminAds.PUT("/campaigns/:id", adHandler.UpdateCampaign)
				adminAds.DELETE("/campaigns/:id", adHandler.DeleteCampaign)

				// Creative validation
				adminAds.POST("/validate-creative", adHandler.ValidateCreative)

				// Campaign reports
				adminAds.GET("/reports/by-date", adHandler.GetCampaignReportByDate)
				adminAds.GET("/reports/by-placement", adHandler.GetCampaignReportByPlacement)
				adminAds.GET("/reports/by-campaign", adHandler.GetCTRReportByCampaign)
				adminAds.GET("/reports/by-slot", adHandler.GetCTRReportBySlot)

				// Experiments
				adminAds.GET("/experiments", adHandler.ListExperiments)
				adminAds.GET("/experiments/:id/report", adHandler.GetExperimentReport)
			}

			// Email monitoring and metrics (admin only)
			adminEmail := admin.Group("/email")
			{
				// Dashboard and metrics
				adminEmail.GET("/metrics/dashboard", emailMetricsHandler.GetDashboardMetrics)
				adminEmail.GET("/metrics", emailMetricsHandler.GetMetrics)
				adminEmail.GET("/metrics/templates", emailMetricsHandler.GetTemplateMetrics)

				// Email logs
				adminEmail.GET("/logs", emailMetricsHandler.SearchEmailLogs)

				// Alerts
				adminEmail.GET("/alerts", emailMetricsHandler.GetAlerts)
				adminEmail.POST("/alerts/:id/acknowledge", emailMetricsHandler.AcknowledgeAlert)
				adminEmail.POST("/alerts/:id/resolve", emailMetricsHandler.ResolveAlert)
			}

			// Moderation queue management (admin/moderator only)
			if moderationHandler != nil {
				moderation := admin.Group("/moderation")
				{
					// Event management
					moderation.GET("/events", moderationHandler.GetPendingEvents)
					moderation.GET("/events/:type", moderationHandler.GetEventsByType)
					moderation.POST("/events/:id/review", moderationHandler.MarkEventReviewed)
					moderation.POST("/events/:id/process", moderationHandler.ProcessEvent)
					moderation.GET("/stats", moderationHandler.GetEventStats)

					// Abuse detection
					moderation.GET("/abuse/:userId", moderationHandler.GetUserAbuseStats)
				}
			}

			// Discovery list management (admin/moderator only)
			adminDiscoveryLists := admin.Group("/discovery-lists")
			{
				adminDiscoveryLists.GET("", discoveryListHandler.AdminListDiscoveryLists)
				adminDiscoveryLists.POST("", discoveryListHandler.AdminCreateDiscoveryList)
				adminDiscoveryLists.GET("/:id", discoveryListHandler.GetDiscoveryList)
				adminDiscoveryLists.PUT("/:id", discoveryListHandler.AdminUpdateDiscoveryList)
				adminDiscoveryLists.DELETE("/:id", discoveryListHandler.AdminDeleteDiscoveryList)
				adminDiscoveryLists.GET("/:id/clips", discoveryListHandler.GetDiscoveryListClips)
				adminDiscoveryLists.POST("/:id/clips", discoveryListHandler.AdminAddClipToList)
				adminDiscoveryLists.DELETE("/:id/clips/:clipId", discoveryListHandler.AdminRemoveClipFromList)
				adminDiscoveryLists.PUT("/:id/clips/reorder", discoveryListHandler.AdminReorderListClips)
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
	hotScoreScheduler := scheduler.NewHotScoreScheduler(clipRepo, cfg.Jobs.HotClipsRefreshIntervalMinutes)
	go hotScoreScheduler.Start(context.Background())

	// Start webhook retry scheduler (runs every 1 minute)
	webhookRetryScheduler := scheduler.NewWebhookRetryScheduler(webhookRetryService, cfg.Jobs.WebhookRetryIntervalMinutes, cfg.Jobs.WebhookRetryBatchSize)
	go webhookRetryScheduler.Start(context.Background())

	// Start outbound webhook delivery scheduler (runs every 30 seconds, batch size 50)
	outboundWebhookScheduler := scheduler.NewOutboundWebhookScheduler(outboundWebhookService, 30*time.Second, 50)
	go outboundWebhookScheduler.Start(context.Background())

	// Start embedding scheduler if embedding service is available (runs based on configured interval)
	var embeddingScheduler *scheduler.EmbeddingScheduler
	if embeddingService != nil {
		embeddingScheduler = scheduler.NewEmbeddingScheduler(db, embeddingService, cfg.Embedding.SchedulerIntervalMinutes, cfg.Embedding.Model)
		go embeddingScheduler.Start(context.Background())
	}

	// Start export scheduler (runs every 2 minutes, batch size 10)
	exportScheduler := scheduler.NewExportScheduler(exportService, exportRepo, 2, 10)
	go exportScheduler.Start(context.Background())

	// Start email metrics scheduler
	// - Calculate daily metrics every 24 hours
	// - Check alerts every 30 minutes
	// - Cleanup old logs every 7 days
	emailMetricsScheduler := scheduler.NewEmailMetricsScheduler(emailMetricsService, 24, 30, 7)
	go emailMetricsScheduler.Start(context.Background())

	// Start live status scheduler (runs every 30 seconds if Twitch client is available)
	var liveStatusScheduler *scheduler.LiveStatusScheduler
	if liveStatusService != nil {
		liveStatusScheduler = scheduler.NewLiveStatusScheduler(liveStatusService, broadcasterRepo, 30)
		go liveStatusScheduler.Start(context.Background())
	}

	// Create HTTP server
	srv := &http.Server{
		Addr:              ":" + cfg.Server.Port,
		Handler:           r,
		ReadHeaderTimeout: 10 * time.Second, // Prevent Slowloris attacks
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
	webhookRetryScheduler.Stop()
	outboundWebhookScheduler.Stop()
	exportScheduler.Stop()
	emailMetricsScheduler.Stop()
	if embeddingScheduler != nil {
		embeddingScheduler.Stop()
	}
	if liveStatusScheduler != nil {
		liveStatusScheduler.Stop()
	}

	// Close embedding service if running
	if embeddingService != nil {
		embeddingService.Close()
	}

	// Graceful shutdown with 5 second timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
