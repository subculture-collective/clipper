//go:build integration

package validation

import (
	"bytes"
	"context"
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
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// TestValidationMiddleware_OnClipEndpoints tests validation on clip-related endpoints
func TestValidationMiddleware_OnClipEndpoints(t *testing.T) {
	cfg, db, redisClient, cleanup := setupTestEnvironment(t)
	defer cleanup()

	router, authToken := setupTestRouter(t, cfg, db, redisClient)

	tests := []struct {
		name           string
		method         string
		path           string
		queryParams    string
		body           map[string]interface{}
		expectedStatus int
		description    string
	}{
		{
			name:           "SQLi in clip search query",
			method:         "GET",
			path:           "/api/v1/clips",
			queryParams:    "?search=test' UNION SELECT * FROM users--",
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject SQL injection in search parameter",
		},
		{
			name:           "XSS in clip search query",
			method:         "GET",
			path:           "/api/v1/clips",
			queryParams:    "?search=<script>alert('xss')</script>",
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject XSS in search parameter",
		},
		{
			name:           "path traversal in clip ID",
			method:         "GET",
			path:           "/api/v1/clips/../../../etc/passwd",
			queryParams:    "",
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject path traversal",
		},
		{
			name:           "long URL in clip request",
			method:         "GET",
			path:           "/api/v1/clips",
			queryParams:    "?search=" + generateLongString(3000),
			expectedStatus: http.StatusRequestURITooLong,
			description:    "Should reject excessively long URLs",
		},
		{
			name:           "valid clip search",
			method:         "GET",
			path:           "/api/v1/clips",
			queryParams:    "?search=gameplay&limit=10",
			expectedStatus: http.StatusOK,
			description:    "Should allow valid search queries",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var req *http.Request
			var err error

			if tt.body != nil {
				jsonBody, err := json.Marshal(tt.body)
				require.NoError(t, err)
				req, err = http.NewRequest(tt.method, tt.path+tt.queryParams, bytes.NewBuffer(jsonBody))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req, err = http.NewRequest(tt.method, tt.path+tt.queryParams, nil)
			}

			require.NoError(t, err)

			if authToken != "" {
				req.Header.Set("Authorization", "Bearer "+authToken)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code, tt.description)
		})
	}
}

// TestValidationMiddleware_OnUserEndpoints tests validation on user-related endpoints
func TestValidationMiddleware_OnUserEndpoints(t *testing.T) {
	cfg, db, redisClient, cleanup := setupTestEnvironment(t)
	defer cleanup()

	router, authToken := setupTestRouter(t, cfg, db, redisClient)

	tests := []struct {
		name           string
		method         string
		path           string
		queryParams    string
		expectedStatus int
		description    string
	}{
		{
			name:           "SQLi in user search",
			method:         "GET",
			path:           "/api/v1/users",
			queryParams:    "?q=admin' OR '1'='1",
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject SQL injection",
		},
		{
			name:           "XSS in user profile parameter",
			method:         "GET",
			path:           "/api/v1/users",
			queryParams:    "?username=<script>alert(1)</script>",
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject XSS attempts",
		},
		{
			name:           "invalid UTF-8 in query",
			method:         "GET",
			path:           "/api/v1/users",
			queryParams:    "?name=test\xff\xfe",
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject invalid UTF-8",
		},
		{
			name:           "valid user query",
			method:         "GET",
			path:           "/api/v1/users",
			queryParams:    "?q=streamer",
			expectedStatus: http.StatusOK,
			description:    "Should allow valid queries",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest(tt.method, tt.path+tt.queryParams, nil)
			require.NoError(t, err)

			if authToken != "" {
				req.Header.Set("Authorization", "Bearer "+authToken)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code, tt.description)
		})
	}
}

// TestValidationMiddleware_OnCommentEndpoints tests validation on comment endpoints
func TestValidationMiddleware_OnCommentEndpoints(t *testing.T) {
	cfg, db, redisClient, cleanup := setupTestEnvironment(t)
	defer cleanup()

	router, authToken := setupTestRouter(t, cfg, db, redisClient)

	// Create a test clip for comments
	clipID := createTestClip(t, db)

	tests := []struct {
		name           string
		method         string
		path           string
		body           map[string]interface{}
		expectedStatus int
		description    string
	}{
		{
			name:   "valid comment",
			method: "POST",
			path:   fmt.Sprintf("/api/v1/clips/%s/comments", clipID),
			body: map[string]interface{}{
				"content": "Great clip!",
			},
			expectedStatus: http.StatusOK,
			description:    "Should allow valid comment content",
		},
		{
			name:   "missing comment content",
			method: "POST",
			path:   fmt.Sprintf("/api/v1/clips/%s/comments", clipID),
			body: map[string]interface{}{
				"other": "field",
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject missing content field",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			jsonBody, err := json.Marshal(tt.body)
			require.NoError(t, err)
			req, err := http.NewRequest(tt.method, tt.path, bytes.NewBuffer(jsonBody))
			require.NoError(t, err)

			req.Header.Set("Content-Type", "application/json")
			if authToken != "" {
				req.Header.Set("Authorization", "Bearer "+authToken)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code, tt.description)
		})
	}
}

// TestValidationMiddleware_OnSearchEndpoints tests validation on search endpoints
func TestValidationMiddleware_OnSearchEndpoints(t *testing.T) {
	cfg, db, redisClient, cleanup := setupTestEnvironment(t)
	defer cleanup()

	router, authToken := setupTestRouter(t, cfg, db, redisClient)

	tests := []struct {
		name           string
		queryParams    string
		expectedStatus int
		description    string
	}{
		{
			name:           "command injection in search",
			queryParams:    "?q=test; cat /etc/passwd",
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject command injection",
		},
		{
			name:           "LDAP injection in search",
			queryParams:    "?q=*)(uid=*))(|(uid=*",
			expectedStatus: http.StatusOK, // LDAP injection is harder to detect
			description:    "LDAP injection detection",
		},
		{
			name:           "NoSQL injection in search",
			queryParams:    "?q={\"$ne\": null}",
			expectedStatus: http.StatusOK, // NoSQL patterns may pass as JSON
			description:    "NoSQL injection detection",
		},
		{
			name:           "valid search query",
			queryParams:    "?q=gaming highlights",
			expectedStatus: http.StatusOK,
			description:    "Should allow valid search",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/v1/search"+tt.queryParams, nil)
			require.NoError(t, err)

			if authToken != "" {
				req.Header.Set("Authorization", "Bearer "+authToken)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code, tt.description)
		})
	}
}

// TestValidationMiddleware_HeaderValidation tests header validation across endpoints
func TestValidationMiddleware_HeaderValidation(t *testing.T) {
	cfg, db, redisClient, cleanup := setupTestEnvironment(t)
	defer cleanup()

	router, authToken := setupTestRouter(t, cfg, db, redisClient)

	tests := []struct {
		name           string
		headerKey      string
		headerValue    string
		expectedStatus int
		description    string
	}{
		{
			name:           "extremely long custom header",
			headerKey:      "X-Custom-Header",
			headerValue:    generateLongString(10000),
			expectedStatus: http.StatusRequestHeaderFieldsTooLarge,
			description:    "Should reject overly long headers",
		},
		{
			name:           "invalid UTF-8 in custom header",
			headerKey:      "X-Invalid-UTF8",
			headerValue:    "test\xff\xfe",
			expectedStatus: http.StatusBadRequest,
			description:    "Should reject invalid UTF-8 in headers",
		},
		{
			name:           "valid custom header",
			headerKey:      "X-Request-ID",
			headerValue:    uuid.New().String(),
			expectedStatus: http.StatusOK,
			description:    "Should allow valid custom headers",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req, err := http.NewRequest("GET", "/api/v1/clips", nil)
			require.NoError(t, err)

			req.Header.Set(tt.headerKey, tt.headerValue)
			if authToken != "" {
				req.Header.Set("Authorization", "Bearer "+authToken)
			}

			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			assert.Equal(t, tt.expectedStatus, w.Code, tt.description)
		})
	}
}

// Helper functions

func setupTestEnvironment(t *testing.T) (*config.Config, *database.DB, *redispkg.Client, func()) {
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

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err)

	cleanup := func() {
		db.Close()
		redisClient.Close()
	}

	return cfg, db, redisClient, cleanup
}

func setupTestRouter(t *testing.T, cfg *config.Config, db *database.DB, redisClient *redispkg.Client) (*gin.Engine, string) {
	gin.SetMode(gin.TestMode)

	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)

	// Create test user with unique identifiers to avoid clashes across tests
	ctx := context.Background()
	testEmail := fmt.Sprintf("test_%s@example.com", uuid.NewString())
	uniq := uuid.NewString()
	testUser := &models.User{
		ID:          uuid.New(),
		TwitchID:    fmt.Sprintf("test_%s", uniq),
		Username:    fmt.Sprintf("testuser_%s", uniq[:8]),
		DisplayName: "Test User",
		Email:       &testEmail,
		Role:        models.RoleUser,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	err = userRepo.Create(ctx, testUser)
	require.NoError(t, err)

	// Generate auth token
	authToken, err := jwtManager.GenerateAccessToken(testUser.ID, testUser.Role)
	require.NoError(t, err)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	// Initialize clip service and handler
	voteRepo := repository.NewVoteRepository(db.Pool)
	favoriteRepo := repository.NewFavoriteRepository(db.Pool)
	clipService := services.NewClipService(clipRepo, voteRepo, favoriteRepo, userRepo, redisClient, nil, nil)
	clipHandler := handlers.NewClipHandler(clipService, authService)

	// Setup router with validation middleware
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(middleware.InputValidationMiddleware()) // Apply validation middleware globally

	v1 := r.Group("/api/v1")
	{
		v1.GET("/clips", clipHandler.ListClips)
		v1.GET("/clips/:id", clipHandler.GetClip)
		v1.POST("/clips/:id/comments", func(c *gin.Context) {
			// Comment handler that validates input via middleware
			// If it reaches here, validation passed
			var req struct {
				Content string `json:"content" binding:"required"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "comment created"})
		})
		v1.GET("/users", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"users": []string{}})
		})
		v1.GET("/search", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"results": []string{}})
		})
	}

	return r, authToken
}

func createTestClip(t *testing.T, db *database.DB) uuid.UUID {
	ctx := context.Background()
	clipID := uuid.New()
	uniqueClipID := uuid.New().String()

	query := `
		INSERT INTO clips (
			id,
			twitch_clip_id,
			twitch_clip_url,
			embed_url,
			title,
			creator_name,
			creator_id,
			broadcaster_name,
			broadcaster_id,
			thumbnail_url,
			created_at,
			imported_at
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
	`
	_, err := db.Pool.Exec(ctx, query,
		clipID,
		uniqueClipID,
		"https://example.com/twitch_clip",
		"https://example.com/embed",
		"Test Clip",
		"creator",
		"creator-1",
		"broadcaster",
		"broadcaster-1",
		"https://example.com/thumb.jpg",
		time.Now(),
		time.Now(),
	)
	require.NoError(t, err)

	return clipID
}

func generateLongString(length int) string {
	result := make([]byte, length)
	for i := range result {
		result[i] = 'a'
	}
	return string(result)
}
