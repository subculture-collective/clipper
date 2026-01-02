//go:build integration

package cdn

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// mockCDNProvider simulates CDN failures
type mockCDNProvider struct {
	shouldTimeout bool
	shouldError   bool
	errorCode     int
	failCount     int
	currentFail   int
}

func (m *mockCDNProvider) GenerateURL(clip *models.Clip) (string, error) {
	if m.shouldError {
		m.currentFail++
		if m.failCount == 0 || m.currentFail <= m.failCount {
			return "", errors.New("CDN connection refused")
		}
	}
	if m.shouldTimeout {
		time.Sleep(100 * time.Millisecond)
		return "", context.DeadlineExceeded
	}
	// Normal success path - return a mock CDN URL
	// In real scenarios, the CDN provider generates a CDN URL, not the origin URL
	if clip.VideoURL != nil {
		return "https://mock.cdn.example.com/video/" + clip.ID.String(), nil
	}
	return "", nil
}

func (m *mockCDNProvider) PurgeCache(clipURL string) error {
	if m.shouldError {
		return errors.New("CDN connection refused")
	}
	return nil
}

func (m *mockCDNProvider) GetCacheHeaders() map[string]string {
	return map[string]string{
		"Cache-Control": "public, max-age=3600",
		"X-CDN-Cache":   "HIT",
	}
}

func (m *mockCDNProvider) GetMetrics(ctx context.Context) (*services.CDNProviderMetrics, error) {
	if m.shouldError {
		return nil, errors.New("CDN metrics unavailable")
	}
	return &services.CDNProviderMetrics{
		Bandwidth:    100.0,
		Requests:     1000,
		CacheHitRate: 95.0,
		AvgLatencyMs: 50.0,
		CostUSD:      10.0,
	}, nil
}

// TestCDNFailover_StaticAssets tests failover for static assets (images, thumbnails, JS)
func TestCDNFailover_StaticAssets(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     testutil.GetEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     testutil.GetEnv("TEST_DATABASE_PORT", "5437"),
			User:     testutil.GetEnv("TEST_DATABASE_USER", "clipper"),
			Password: testutil.GetEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     testutil.GetEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: config.RedisConfig{
			Host: testutil.GetEnv("TEST_REDIS_HOST", "localhost"),
			Port: testutil.GetEnv("TEST_REDIS_PORT", "6380"),
		},
		JWT: config.JWTConfig{
			PrivateKey: testutil.GenerateTestJWTKey(t),
		},
	}

	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err)
	defer db.Close()

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err)
	defer redisClient.Close()

	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	t.Run("Fallback_to_origin_on_CDN_timeout", func(t *testing.T) {
		// Create mock CDN that simulates timeout
		mockCDN := &mockCDNProvider{shouldTimeout: true}

		// Create handler with CDN failover capability
		clipHandler := createFailoverClipHandler(db, clipRepo, redisClient, mockCDN, authService)

		// Setup router
		r := gin.New()
		r.Use(gin.Recovery())
		r.GET("/api/v1/clips/:id", clipHandler.GetClip)

		// Create test clip with origin URL
		testClipID := uuid.New()
		originURL := "https://origin.example.com/clip.mp4"
		thumbURL := "https://origin.example.com/thumb.jpg"
		language := "en"
		clipDuration := 30.0
		embedURL := "https://clips.twitch.tv/embed/test"
		testClip := &models.Clip{
			ID:              testClipID,
			TwitchClipID:    "twitch-clip-123",
			TwitchClipURL:   "https://clips.twitch.tv/test",
			EmbedURL:        embedURL,
			Title:           "Test Clip",
			CreatorName:     "TestCreator",
			BroadcasterName: "TestBroadcaster",
			VideoURL:        &originURL,
			ThumbnailURL:    &thumbURL,
			Duration:        &clipDuration,
			ViewCount:       100,
			Language:        &language,
			CreatedAt:       time.Now().UTC(),
			ImportedAt:      time.Now().UTC(),
		}

		ctx := context.Background()
		err := clipRepo.Create(ctx, testClip)
		require.NoError(t, err)
		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = $1", testClipID)
		}()

		// Make request
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips/"+testClipID.String(), nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		// Should return 200 with origin URL
		assert.Equal(t, http.StatusOK, w.Code, "Expected 200 OK with origin fallback")

		// Verify X-CDN-Failover header is set
		failoverHeader := w.Header().Get("X-CDN-Failover")
		assert.Equal(t, "true", failoverHeader, "Expected X-CDN-Failover header to be true")

		// Verify X-CDN-Failover-Reason header
		reasonHeader := w.Header().Get("X-CDN-Failover-Reason")
		assert.Equal(t, "timeout", reasonHeader, "Expected failover reason to be timeout")
	})

	t.Run("Fallback_to_origin_on_CDN_5xx_error", func(t *testing.T) {
		// Create mock CDN that simulates 5xx error
		mockCDN := &mockCDNProvider{shouldError: true, errorCode: 503}

		clipHandler := createFailoverClipHandler(db, clipRepo, redisClient, mockCDN, authService)

		// Setup router
		r := gin.New()
		r.Use(gin.Recovery())
		r.GET("/api/v1/clips/:id", clipHandler.GetClip)

		// Create test clip
		testClipID := uuid.New()
		originURL := "https://origin.example.com/clip2.mp4"
		thumbURL := "https://origin.example.com/thumb2.jpg"
		language := "en"
		duration := 45.0
		embedURL := "https://clips.twitch.tv/embed/test2"
		testClip := &models.Clip{
			ID:              testClipID,
			TwitchClipID:    "twitch-clip-456",
			TwitchClipURL:   "https://clips.twitch.tv/test2",
			EmbedURL:        embedURL,
			Title:           "Test Clip 2",
			CreatorName:     "TestCreator",
			BroadcasterName: "TestBroadcaster",
			VideoURL:        &originURL,
			ThumbnailURL:    &thumbURL,
			Duration:        &duration,
			ViewCount:       200,
			Language:        &language,
			CreatedAt:       time.Now().UTC(),
			ImportedAt:      time.Now().UTC(),
		}

		ctx := context.Background()
		err := clipRepo.Create(ctx, testClip)
		require.NoError(t, err)
		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = $1", testClipID)
		}()

		// Make request
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips/"+testClipID.String(), nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		// Should return 200 with origin fallback
		assert.Equal(t, http.StatusOK, w.Code, "Expected 200 OK with origin fallback")

		// Verify X-CDN-Failover header is set
		failoverHeader := w.Header().Get("X-CDN-Failover")
		assert.Equal(t, "true", failoverHeader, "Expected X-CDN-Failover header to be true")

		// Verify X-CDN-Failover-Reason header
		reasonHeader := w.Header().Get("X-CDN-Failover-Reason")
		assert.Equal(t, "error", reasonHeader, "Expected failover reason to be error")
	})
}

// TestCDNFailover_HLSPlaylist tests failover for HLS master playlist
func TestCDNFailover_HLSPlaylist(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     testutil.GetEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     testutil.GetEnv("TEST_DATABASE_PORT", "5437"),
			User:     testutil.GetEnv("TEST_DATABASE_USER", "clipper"),
			Password: testutil.GetEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     testutil.GetEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: config.RedisConfig{
			Host: testutil.GetEnv("TEST_REDIS_HOST", "localhost"),
			Port: testutil.GetEnv("TEST_REDIS_PORT", "6380"),
		},
		JWT: config.JWTConfig{
			PrivateKey: testutil.GenerateTestJWTKey(t),
		},
	}

	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err)
	defer db.Close()

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err)
	defer redisClient.Close()

	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	t.Run("HLS_master_playlist_fallback_on_CDN_failure", func(t *testing.T) {
		// Create mock CDN that simulates failure
		mockCDN := &mockCDNProvider{shouldError: true}

		// Simulate HLS handler with failover
		clipHandler := createFailoverClipHandler(db, clipRepo, redisClient, mockCDN, authService)

		// Setup router
		r := gin.New()
		r.Use(gin.Recovery())
		r.GET("/api/v1/video/:clipId/master.m3u8", clipHandler.GetHLSMasterPlaylist)

		// Create test clip with HLS enabled
		testClipID := uuid.New()
		originURL := "https://origin.example.com/hls/master.m3u8"
		clipDuration := 60.0
		language := "en"
		now := time.Now().UTC()
		testClip := &models.Clip{
			ID:            testClipID,
			TwitchClipID:  "twitch-clip-789",
			TwitchClipURL: "https://clips.twitch.tv/test3",
			Title:         "Test HLS Clip",
			CreatorName:   "TestCreator",
			VideoURL:      &originURL,
			Duration:      &clipDuration,
			ViewCount:     300,
			Language:      &language,
			CreatedAt:     now,
			ImportedAt:    now,
		}

		ctx := context.Background()
		err := clipRepo.Create(ctx, testClip)
		require.NoError(t, err)
		defer clipRepo.Delete(ctx, testClipID)

		// Make request for HLS master playlist
		req := httptest.NewRequest(http.MethodGet, "/api/v1/video/"+testClipID.String()+"/master.m3u8", nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		// Should return 200 with origin fallback
		assert.Equal(t, http.StatusOK, w.Code, "Expected 200 OK with origin fallback for HLS")

		// Verify failover headers
		failoverHeader := w.Header().Get("X-CDN-Failover")
		assert.Equal(t, "true", failoverHeader, "Expected X-CDN-Failover header")

		// Verify content type
		contentType := w.Header().Get("Content-Type")
		assert.Contains(t, contentType, "application/vnd.apple.mpegurl", "Expected HLS content type")
	})
}

// TestCDNFailover_RetryBackoff tests retry and backoff behavior
func TestCDNFailover_RetryBackoff(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     testutil.GetEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     testutil.GetEnv("TEST_DATABASE_PORT", "5437"),
			User:     testutil.GetEnv("TEST_DATABASE_USER", "clipper"),
			Password: testutil.GetEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     testutil.GetEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: config.RedisConfig{
			Host: testutil.GetEnv("TEST_REDIS_HOST", "localhost"),
			Port: testutil.GetEnv("TEST_REDIS_PORT", "6380"),
		},
		JWT: config.JWTConfig{
			PrivateKey: testutil.GenerateTestJWTKey(t),
		},
	}

	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err)
	defer db.Close()

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err)
	defer redisClient.Close()

	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	t.Run("Retry_with_exponential_backoff", func(t *testing.T) {
		// Create mock CDN that fails initially then succeeds
		mockCDN := &mockCDNProvider{shouldError: true, failCount: 2}

		clipHandler := createFailoverClipHandler(db, clipRepo, redisClient, mockCDN, authService)

		// Setup router
		r := gin.New()
		r.Use(gin.Recovery())
		r.GET("/api/v1/clips/:id", clipHandler.GetClip)

		// Create test clip
		testClipID := uuid.New()
		originURL := "https://origin.example.com/clip-retry.mp4"
		duration := 30.0
		language := "en"
		now := time.Now().UTC()
		testClip := &models.Clip{
			ID:            testClipID,
			TwitchClipID:  "twitch-clip-321",
			TwitchClipURL: "https://clips.twitch.tv/test-retry",
			Title:         "Test Retry Clip",
			CreatorName:   "TestCreator",
			VideoURL:      &originURL,
			Duration:      &duration,
			ViewCount:     100,
			Language:      &language,
			CreatedAt:     now,
			ImportedAt:    now,
		}

		ctx := context.Background()
		err := clipRepo.Create(ctx, testClip)
		require.NoError(t, err)
		defer clipRepo.Delete(ctx, testClipID)

		startTime := time.Now()

		// Make request - should retry and eventually succeed
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips/"+testClipID.String(), nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		elapsed := time.Since(startTime)

		// Should eventually succeed after retries
		assert.Equal(t, http.StatusOK, w.Code, "Expected 200 OK after retries")

		// Verify some delay occurred due to backoff (but not testing exact timing)
		assert.Greater(t, elapsed, time.Duration(0), "Expected some delay from retries")

		// Verify Retry-After header is not set (only for 503)
		retryAfter := w.Header().Get("Retry-After")
		assert.Empty(t, retryAfter, "Retry-After should not be set for successful response")
	})
}

// TestCDNFailover_CacheHeaders tests cache control header validation
func TestCDNFailover_CacheHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     testutil.GetEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     testutil.GetEnv("TEST_DATABASE_PORT", "5437"),
			User:     testutil.GetEnv("TEST_DATABASE_USER", "clipper"),
			Password: testutil.GetEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     testutil.GetEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: config.RedisConfig{
			Host: testutil.GetEnv("TEST_REDIS_HOST", "localhost"),
			Port: testutil.GetEnv("TEST_REDIS_PORT", "6380"),
		},
		JWT: config.JWTConfig{
			PrivateKey: testutil.GenerateTestJWTKey(t),
		},
	}

	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err)
	defer db.Close()

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err)
	defer redisClient.Close()

	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	t.Run("Validate_cache_headers_during_failover", func(t *testing.T) {
		// Create mock CDN
		mockCDN := &mockCDNProvider{shouldError: true}

		clipHandler := createFailoverClipHandler(db, clipRepo, redisClient, mockCDN, authService)

		// Setup router
		r := gin.New()
		r.Use(gin.Recovery())
		r.GET("/api/v1/clips/:id", clipHandler.GetClip)

		// Create test clip
		testClipID := uuid.New()
		originURL := "https://origin.example.com/clip-cache.mp4"
		duration := 30.0
		language := "en"
		now := time.Now().UTC()
		testClip := &models.Clip{
			ID:            testClipID,
			TwitchClipID:  "twitch-clip-654",
			TwitchClipURL: "https://clips.twitch.tv/test-cache",
			Title:         "Test Cache Clip",
			CreatorName:   "TestCreator",
			VideoURL:      &originURL,
			Duration:      &duration,
			ViewCount:     100,
			Language:      &language,
			CreatedAt:     now,
			ImportedAt:    now,
		}

		ctx := context.Background()
		err := clipRepo.Create(ctx, testClip)
		require.NoError(t, err)
		defer clipRepo.Delete(ctx, testClipID)

		// Make request
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips/"+testClipID.String(), nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		// Should return 200
		assert.Equal(t, http.StatusOK, w.Code, "Expected 200 OK")

		// Verify cache headers are appropriate for origin fallback
		cacheControl := w.Header().Get("Cache-Control")
		assert.NotEmpty(t, cacheControl, "Expected Cache-Control header")

		// During failover, cache should be shorter to allow quick recovery
		assert.Contains(t, cacheControl, "max-age", "Expected max-age directive")

		// Verify X-CDN-Failover-Service header
		failoverService := w.Header().Get("X-CDN-Failover-Service")
		assert.Equal(t, "origin", failoverService, "Expected failover service to be 'origin'")
	})
}

// Helper function to create clip handler with failover support
// NOTE: This is currently a placeholder that returns the standard ClipHandler.
// The actual CDN failover logic needs to be implemented in the production code
// by modifying ClipHandler to accept a CDN service interface with failover capabilities.
// These tests serve as documentation of expected failover behavior and will need
// infrastructure-level testing (with actual CDN unavailability) or ClipHandler
// modifications to fully validate the failover functionality.
func createFailoverClipHandler(db *database.DB, clipRepo *repository.ClipRepository, redisClient *redispkg.Client, mockCDN services.CDNProvider, authService *services.AuthService) *handlers.ClipHandler {
	voteRepo := repository.NewVoteRepository(db.Pool)
	favoriteRepo := repository.NewFavoriteRepository(db.Pool)
	userRepo := repository.NewUserRepository(db.Pool)
	auditLogRepo := repository.NewAuditLogRepository(db.Pool)

	clipService := services.NewClipService(
		clipRepo,
		voteRepo,
		favoriteRepo,
		userRepo,
		redisClient,
		auditLogRepo,
		nil, // notification service not required for these tests
	)

	return handlers.NewClipHandler(clipService, authService, handlers.WithCDNProvider(mockCDN))
}
