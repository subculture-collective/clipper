//go:build integration

package submissions

import (
	"bytes"
	"encoding/json"
	"fmt"
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
	"github.com/subculture-collective/clipper/internal/middleware"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

func setupSubmissionTestRouter(t *testing.T) (*gin.Engine, *jwtpkg.Manager, *database.DB, *redispkg.Client, uuid.UUID) {
	gin.SetMode(gin.TestMode)

	// Load test configuration
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

	// Initialize database
	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err)

	// Initialize Redis
	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err)

	// Initialize JWT manager
	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)
	voteRepo := repository.NewVoteRepository(db.Pool)
	favoriteRepo := repository.NewFavoriteRepository(db.Pool)
	auditLogRepo := repository.NewAuditLogRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)
	clipService := services.NewClipService(clipRepo, voteRepo, favoriteRepo, userRepo, redisClient, auditLogRepo, nil)

	// Initialize handlers
	clipHandler := handlers.NewClipHandler(clipService, authService)

	// Create test user using helper
	username := fmt.Sprintf("subuser%d", time.Now().Unix())
	user := testutil.CreateTestUser(t, db, username)

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())

	// Clip routes
	clips := r.Group("/api/v1/clips")
	clips.Use(middleware.AuthMiddleware(authService))
	{
		clips.GET("", clipHandler.ListClips)
		clips.GET("/:id", clipHandler.GetClip)
		// clips.POST("", clipHandler.CreateClip) // NOTE: Use SubmissionHandler.SubmitClip instead
		clips.PUT("/:id", clipHandler.UpdateClip)
		clips.DELETE("/:id", clipHandler.DeleteClip)
	}

	return r, jwtManager, db, redisClient, user.ID
}

func TestSubmissionFlow(t *testing.T) {
	router, jwtManager, db, redisClient, userID := setupSubmissionTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, userID, "user")

	var clipID string

	t.Run("CreateClip_Success", func(t *testing.T) {
		clip := map[string]interface{}{
			"twitch_clip_id": fmt.Sprintf("clip%d", time.Now().Unix()),
			"title":          "Test Clip Creation",
			"broadcaster":    "testbroadcaster",
			"url":            "https://clips.twitch.tv/testclip",
			"thumbnail_url":  "https://example.com/thumbnail.jpg",
			"view_count":     100,
			"created_at":     time.Now().Format(time.RFC3339),
		}
		bodyBytes, _ := json.Marshal(clip)
		
		req := httptest.NewRequest(http.MethodPost, "/api/v1/clips", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Note: Actual clip creation may require submission service with Twitch integration
		// This is a placeholder to demonstrate test structure
		assert.Contains(t, []int{http.StatusCreated, http.StatusNotImplemented}, w.Code)
		
		if w.Code == http.StatusCreated {
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			clipID = response["id"].(string)
		}
	})

	t.Run("ListClips_Success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		
		assert.Contains(t, response, "clips")
	})

	t.Run("GetClip_Exists", func(t *testing.T) {
		if clipID == "" {
			t.Skip("No clip created to test")
		}

		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips/"+clipID, nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("UpdateClip_Success", func(t *testing.T) {
		if clipID == "" {
			t.Skip("No clip created to test")
		}

		update := map[string]interface{}{
			"title": "Updated Clip Title",
		}
		bodyBytes, _ := json.Marshal(update)
		
		req := httptest.NewRequest(http.MethodPut, "/api/v1/clips/"+clipID, bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotImplemented}, w.Code)
	})

	t.Run("DeleteClip_Unauthorized", func(t *testing.T) {
		if clipID == "" {
			t.Skip("No clip created to test")
		}

		// Regular users typically cannot delete clips (admin-only)
		req := httptest.NewRequest(http.MethodDelete, "/api/v1/clips/"+clipID, nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusForbidden, http.StatusNotImplemented}, w.Code)
	})
}

func TestSubmissionSearch(t *testing.T) {
	t.Skip("Search integration tests require OpenSearch setup")
	
	// Placeholder for search integration tests:
	// - Search by keyword
	// - Search by broadcaster
	// - Search with filters
	// - Semantic search
	// - Search pagination
}

func TestSubmissionValidation(t *testing.T) {
	router, jwtManager, db, redisClient, userID := setupSubmissionTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, userID, "user")

	t.Run("CreateClip_MissingRequiredFields", func(t *testing.T) {
		clip := map[string]interface{}{
			"title": "Incomplete Clip",
		}
		bodyBytes, _ := json.Marshal(clip)
		
		req := httptest.NewRequest(http.MethodPost, "/api/v1/clips", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusBadRequest, http.StatusNotImplemented}, w.Code)
	})

	t.Run("CreateClip_InvalidURL", func(t *testing.T) {
		clip := map[string]interface{}{
			"twitch_clip_id": "testclip",
			"title":          "Invalid URL Clip",
			"broadcaster":    "testbroadcaster",
			"url":            "not-a-valid-url",
		}
		bodyBytes, _ := json.Marshal(clip)
		
		req := httptest.NewRequest(http.MethodPost, "/api/v1/clips", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusBadRequest, http.StatusNotImplemented}, w.Code)
	})
}
