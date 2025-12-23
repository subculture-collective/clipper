//go:build integration

package auth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
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

// setupTestRouter creates a test router with auth routes
func setupTestRouter(t *testing.T) (*gin.Engine, *services.AuthService, *database.DB, *redispkg.Client, *jwtpkg.Manager) {
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
	require.NoError(t, err, "Failed to connect to test database")

	// Initialize Redis
	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err, "Failed to connect to test Redis")

	// Initialize JWT manager
	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err, "Failed to initialize JWT manager")

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, cfg)

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())

	// Auth routes
	auth := r.Group("/api/v1/auth")
	{
		auth.GET("/me", middleware.AuthMiddleware(authService), authHandler.GetCurrentUser)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)
	}

	return r, authService, db, redisClient, jwtManager
}

func TestAuthenticationFlow(t *testing.T) {
	router, _, db, redisClient, jwtManager := setupTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("GetCurrentUser_Authenticated", func(t *testing.T) {
		// Create test user using helper
		user := testutil.CreateTestUser(t, db, "testuser")
		
		// Generate JWT token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		// Make authenticated request
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		
		assert.Equal(t, "testuser", response["username"])
		assert.Equal(t, "Test User testuser", response["display_name"])
	})

	t.Run("GetCurrentUser_Unauthenticated", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("Logout_ValidToken", func(t *testing.T) {
		// Create test user using helper
		username := fmt.Sprintf("testuser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)
		
		// Generate tokens
		accessToken, refreshToken := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		// Logout request
		body := map[string]string{"refresh_token": refreshToken}
		bodyBytes, _ := json.Marshal(body)
		
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestRefreshTokenFlow(t *testing.T) {
	router, _, db, redisClient, jwtManager := setupTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("RefreshToken_Success", func(t *testing.T) {
		// Create test user using helper
		username := fmt.Sprintf("refreshuser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)
		
		// Generate tokens
		_, refreshToken := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		// Refresh token request
		body := map[string]string{"refresh_token": refreshToken}
		bodyBytes, _ := json.Marshal(body)
		
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		
		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		
		assert.NotEmpty(t, response["access_token"])
		assert.NotEmpty(t, response["refresh_token"])
	})

	t.Run("RefreshToken_InvalidToken", func(t *testing.T) {
		body := map[string]string{"refresh_token": "invalid_token"}
		bodyBytes, _ := json.Marshal(body)
		
		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestMFAFlow(t *testing.T) {
	t.Skip("MFA integration tests require full setup with MFA service")
	
	// Placeholder for MFA integration tests:
	// - MFA enrollment
	// - MFA verification
	// - Backup codes generation
	// - Trusted device management
}

func TestOAuthFlow(t *testing.T) {
	t.Skip("OAuth integration tests require Twitch API mocking")
	
	// Placeholder for OAuth integration tests:
	// - Initiate OAuth flow
	// - Handle OAuth callback
	// - PKCE flow
	// - Reauthorization
}
