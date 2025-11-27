//go:build integration

package integration

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/middleware"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/pkg/twitch"
)

// TestSubmissionMetadataEndpoint validates GET /api/v1/submissions/metadata
func TestSubmissionMetadataEndpoint(t *testing.T) {
	// Set test DB env
	os.Setenv("DATABASE_URL", "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable")
	os.Setenv("REDIS_URL", "redis://localhost:6380/0")

	cfg, err := config.Load()
	require.NoError(t, err)

	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err)
	defer db.Close()

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err)
	defer redisClient.Close()

	// Initialize repositories
	submissionRepo := repository.NewSubmissionRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)
	userRepo := repository.NewUserRepository(db.Pool)
	auditLogRepo := repository.NewAuditLogRepository(db.Pool)
	notificationRepo := repository.NewNotificationRepository(db.Pool)
	emailNotificationRepo := repository.NewEmailNotificationRepository(db.Pool)
	commentRepo := repository.NewCommentRepository(db.Pool)
	favoriteRepo := repository.NewFavoriteRepository(db.Pool)

	// Initialize services
	emailService := services.NewEmailService(&services.EmailConfig{
		SendGridAPIKey:   "",
		FromEmail:        "test@clipper.app",
		FromName:         "Clipper Test",
		BaseURL:          "http://localhost:8080",
		Enabled:          false,
		MaxEmailsPerHour: 100,
	}, emailNotificationRepo)

	notificationService := services.NewNotificationService(notificationRepo, userRepo, commentRepo, clipRepo, favoriteRepo, emailService)

	// Initialize Twitch client if configured
	var twitchClient *twitch.Client
	if cfg.Twitch.ClientID != "" && cfg.Twitch.ClientSecret != "" {
		twitchClient, err = twitch.NewClient(&cfg.Twitch, redisClient)
		if err != nil {
			t.Logf("WARNING: Twitch client unavailable: %v (skipping live API tests)", err)
		}
	}

	// If no Twitch client, skip (this is an integration test requiring real or mocked Twitch API)
	if twitchClient == nil {
		t.Skip("Twitch client not configured; skipping metadata endpoint integration test")
	}

	submissionService := services.NewSubmissionService(submissionRepo, clipRepo, userRepo, auditLogRepo, twitchClient, notificationService, cfg, redisClient)
	submissionHandler := handlers.NewSubmissionHandler(submissionService)

	gin.SetMode(gin.TestMode)
	r := gin.Default()

	// Mock auth middleware - set a test user ID
	testUserID := uuid.New()
	r.Use(func(c *gin.Context) {
		c.Set("user_id", testUserID)
		c.Next()
	})

	// Apply basic rate limiting for this test (high limit for testing)
	r.Use(middleware.RateLimitMiddleware(redisClient, 1000, time.Minute))

	r.GET("/api/v1/submissions/metadata", submissionHandler.GetClipMetadata)

	t.Run("Valid clip URL returns metadata", func(t *testing.T) {
		// Use a known public Twitch clip (adjust if needed or use a test fixture)
		// For this test, we'll use a placeholder; in real scenarios, use a valid test clip
		testURL := "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage"

		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/submissions/metadata?url="+testURL, nil)
		r.ServeHTTP(w, req)

		// Depending on whether the clip exists, we expect either 200 or 400/502
		// For a valid format, we should not get 400 for URL validation
		if w.Code == http.StatusOK {
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)

			require.True(t, response["success"].(bool))
			data := response["data"].(map[string]interface{})
			require.NotEmpty(t, data["clip_id"])
			require.NotEmpty(t, data["title"])
			require.NotEmpty(t, data["streamer_name"])
			require.NotEmpty(t, data["url"])
			require.NotNil(t, data["view_count"])
			require.NotNil(t, data["duration"])
		} else if w.Code == http.StatusBadRequest {
			// If Twitch returns 404, service returns 400 with validation error
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			require.Contains(t, response, "error")
		} else if w.Code == http.StatusBadGateway {
			// Twitch API error
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			require.Contains(t, response, "error")
		} else {
			t.Fatalf("Unexpected status code: %d, body: %s", w.Code, w.Body.String())
		}
	})

	t.Run("Missing URL parameter returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/submissions/metadata", nil)
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusBadRequest, w.Code)
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		require.False(t, response["success"].(bool))
		require.Contains(t, response["error"], "Missing 'url' query parameter")
	})

	t.Run("Invalid URL format returns 400", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/submissions/metadata?url=invalid-url", nil)
		r.ServeHTTP(w, req)

		require.Equal(t, http.StatusBadRequest, w.Code)
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		require.False(t, response["success"].(bool))
		require.Contains(t, response, "field")
		require.Equal(t, "url", response["field"])
	})

	t.Run("Direct clip ID input works", func(t *testing.T) {
		testClipID := "AwkwardHelplessSalamanderSwiftRage"

		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/submissions/metadata?url="+testClipID, nil)
		r.ServeHTTP(w, req)

		// Should process (200, 400, or 502 depending on clip existence)
		require.Contains(t, []int{http.StatusOK, http.StatusBadRequest, http.StatusBadGateway}, w.Code)
	})

	t.Run("Caching behavior - second request faster", func(t *testing.T) {
		testURL := "https://clips.twitch.tv/TestCachingClipID"

		// Clear cache first
		ctx := context.Background()
		cacheKey := "twitch:clip:metadata:TestCachingClipID"
		_ = redisClient.Delete(ctx, cacheKey)

		// First request
		w1 := httptest.NewRecorder()
		req1 := httptest.NewRequest(http.MethodGet, "/api/v1/submissions/metadata?url="+testURL, nil)
		start1 := time.Now()
		r.ServeHTTP(w1, req1)
		duration1 := time.Since(start1)

		// If first request succeeded, second should be faster (cached)
		if w1.Code == http.StatusOK {
			w2 := httptest.NewRecorder()
			req2 := httptest.NewRequest(http.MethodGet, "/api/v1/submissions/metadata?url="+testURL, nil)
			start2 := time.Now()
			r.ServeHTTP(w2, req2)
			duration2 := time.Since(start2)

			require.Equal(t, http.StatusOK, w2.Code)
			// Cache hit should be faster (though this is a soft assertion due to timing variability)
			t.Logf("First request: %v, Second (cached) request: %v", duration1, duration2)
			require.Less(t, duration2, duration1, "Cached request should be faster")
		}
	})

	t.Run("Alternative twitch.tv URL format works", func(t *testing.T) {
		testURL := "https://www.twitch.tv/testuser/clip/AwkwardHelplessSalamanderSwiftRage"

		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/submissions/metadata?url="+testURL, nil)
		r.ServeHTTP(w, req)

		// Should normalize and process
		require.Contains(t, []int{http.StatusOK, http.StatusBadRequest, http.StatusBadGateway}, w.Code)

		if w.Code == http.StatusOK {
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			data := response["data"].(map[string]interface{})
			// URL should be normalized to clips.twitch.tv format
			require.Contains(t, data["url"], "clips.twitch.tv")
		}
	})
}
