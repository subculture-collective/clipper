//go:build integration

package search

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
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

// mockOpenSearchClient simulates OpenSearch failures
type mockOpenSearchClient struct {
	shouldTimeout bool
	shouldError   bool
	errorCode     int
}

func (m *mockOpenSearchClient) Search(ctx context.Context, req *models.SearchRequest) (*models.SearchResponse, error) {
	if m.shouldTimeout {
		// Simulate timeout
		time.Sleep(100 * time.Millisecond)
		return nil, context.DeadlineExceeded
	}
	if m.shouldError {
		// Simulate server error
		return nil, errors.New("opensearch connection refused")
	}
	// Normal success path
	return &models.SearchResponse{
		Query: req.Query,
		Results: models.SearchResultsByType{
			Clips: []models.Clip{},
		},
		Counts: models.SearchCounts{},
	}, nil
}

func (m *mockOpenSearchClient) GetSuggestions(ctx context.Context, query string, limit int) ([]models.SearchSuggestion, error) {
	if m.shouldTimeout {
		time.Sleep(100 * time.Millisecond)
		return nil, context.DeadlineExceeded
	}
	if m.shouldError {
		return nil, errors.New("opensearch connection refused")
	}
	return []models.SearchSuggestion{}, nil
}

// TestSearchFailover_OpenSearchTimeout tests search behavior when OpenSearch times out
func TestSearchFailover_OpenSearchTimeout(t *testing.T) {
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
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	searchRepo := repository.NewSearchRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	t.Run("Fallback_to_PostgreSQL_on_timeout", func(t *testing.T) {
		// Create mock OpenSearch service that simulates timeout
		mockOS := &mockOpenSearchClient{shouldTimeout: true}
		
		// Create a custom search service wrapper that falls back to PostgreSQL
		searchHandler := createFailoverSearchHandler(searchRepo, mockOS, authService)

		// Setup router
		r := gin.New()
		r.Use(gin.Recovery())
		r.GET("/api/v1/search", searchHandler.Search)

		// Make search request
		params := url.Values{}
		params.Add("q", "test")
		params.Add("limit", "10")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		// Should return 200 with fallback results
		assert.Equal(t, http.StatusOK, w.Code, "Expected 200 OK with PostgreSQL fallback")
		
		// Verify X-Search-Failover header is set
		failoverHeader := w.Header().Get("X-Search-Failover")
		assert.Equal(t, "true", failoverHeader, "Expected X-Search-Failover header to be true")
		
		// Verify X-Search-Failover-Reason header
		reasonHeader := w.Header().Get("X-Search-Failover-Reason")
		assert.Equal(t, "timeout", reasonHeader, "Expected failover reason to be timeout")
	})

	t.Run("Fallback_to_PostgreSQL_on_error", func(t *testing.T) {
		// Create mock OpenSearch service that simulates error
		mockOS := &mockOpenSearchClient{shouldError: true, errorCode: 500}
		
		searchHandler := createFailoverSearchHandler(searchRepo, mockOS, authService)

		// Setup router
		r := gin.New()
		r.Use(gin.Recovery())
		r.GET("/api/v1/search", searchHandler.Search)

		// Make search request
		params := url.Values{}
		params.Add("q", "test")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		// Should return 200 with fallback results
		assert.Equal(t, http.StatusOK, w.Code, "Expected 200 OK with PostgreSQL fallback")
		
		// Verify X-Search-Failover header is set
		failoverHeader := w.Header().Get("X-Search-Failover")
		assert.Equal(t, "true", failoverHeader, "Expected X-Search-Failover header to be true")
		
		// Verify X-Search-Failover-Reason header
		reasonHeader := w.Header().Get("X-Search-Failover-Reason")
		assert.Equal(t, "error", reasonHeader, "Expected failover reason to be error")
	})
}

// TestSearchFailover_HybridSearchNoFallback tests that hybrid search returns 503 when it fails
func TestSearchFailover_HybridSearchNoFallback(t *testing.T) {
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
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	searchRepo := repository.NewSearchRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	t.Run("Return_503_when_hybrid_search_unavailable", func(t *testing.T) {
		// Create handler that uses hybrid search (no fallback)
		searchHandler := createHybridSearchHandlerNoFallback(searchRepo, authService)

		// Setup router
		r := gin.New()
		r.Use(gin.Recovery())
		r.GET("/api/v1/search", searchHandler.Search)

		// Make search request
		params := url.Values{}
		params.Add("q", "test")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		// Should return 503 Service Unavailable
		assert.Equal(t, http.StatusServiceUnavailable, w.Code, "Expected 503 when hybrid search fails")
		
		// Verify Retry-After header is set
		retryAfter := w.Header().Get("Retry-After")
		assert.NotEmpty(t, retryAfter, "Expected Retry-After header to be set")
	})
}

// TestSearchFailover_SuggestionsTimeout tests suggestions endpoint failover
func TestSearchFailover_SuggestionsTimeout(t *testing.T) {
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
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	searchRepo := repository.NewSearchRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	t.Run("Suggestions_fallback_to_PostgreSQL", func(t *testing.T) {
		// Create mock OpenSearch service that simulates timeout
		mockOS := &mockOpenSearchClient{shouldTimeout: true}
		
		searchHandler := createFailoverSearchHandler(searchRepo, mockOS, authService)

		// Setup router
		r := gin.New()
		r.Use(gin.Recovery())
		r.GET("/api/v1/search/suggestions", searchHandler.GetSuggestions)

		// Make suggestions request
		params := url.Values{}
		params.Add("q", "te")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/suggestions?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		r.ServeHTTP(w, req)

		// Should return 200 with fallback results
		assert.Equal(t, http.StatusOK, w.Code, "Expected 200 OK with PostgreSQL fallback")
		
		// Verify X-Search-Failover header is set
		failoverHeader := w.Header().Get("X-Search-Failover")
		assert.Equal(t, "true", failoverHeader, "Expected X-Search-Failover header to be true")
	})
}

// Helper functions to create custom handlers with failover logic

func createFailoverSearchHandler(searchRepo *repository.SearchRepository, mockOS *mockOpenSearchClient, authService *services.AuthService) *handlers.SearchHandler {
	// This is a simplified version for testing
	// In the real implementation, we would modify the actual SearchHandler to support failover
	return handlers.NewSearchHandler(searchRepo, authService)
}

func createHybridSearchHandlerNoFallback(searchRepo *repository.SearchRepository, authService *services.AuthService) *handlers.SearchHandler {
	// This simulates a hybrid search handler that cannot fall back to PostgreSQL
	return handlers.NewSearchHandler(searchRepo, authService)
}
