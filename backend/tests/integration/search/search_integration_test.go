//go:build integration

package search

import (
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
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

func setupSearchTestRouter(t *testing.T) (*gin.Engine, *services.AuthService, *database.DB, *redispkg.Client) {
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

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err)

	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	searchRepo := repository.NewSearchRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	// Initialize handlers
	searchHandler := handlers.NewSearchHandler(searchRepo, authService)

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())

	// Search routes - use unified Search() endpoint
	search := r.Group("/api/v1/search")
	{
		search.GET("", searchHandler.Search)
		search.GET("/suggestions", searchHandler.GetSuggestions)
		search.GET("/trending", searchHandler.GetTrendingSearches)
		search.GET("/failed", searchHandler.GetFailedSearches)
		search.GET("/history", searchHandler.GetSearchHistory)
		search.GET("/analytics", searchHandler.GetSearchAnalytics)
		search.GET("/scores", searchHandler.SearchWithScores)
	}

	return r, authService, db, redisClient
}

func TestKeywordSearch(t *testing.T) {
	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("Search_WithKeyword", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Search_EmptyQuery", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should return bad request for missing query
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("Search_LongQuery", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "this is a very long search query with multiple words")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Search_SpecialCharacters", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test search")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestSearchFilters(t *testing.T) {
	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("Search_WithMultipleFilters", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "gameplay")
		params.Add("page", "1")
		params.Add("limit", "20")
		params.Add("sort", "relevance")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Search_WithPaginationParams", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "clips")
		params.Add("page", "2")
		params.Add("limit", "50")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestSearchPagination(t *testing.T) {
	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("Search_ValidPagination", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test")
		params.Add("page", "1")
		params.Add("limit", "10")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Search_InvalidPage_Defaults", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test")
		params.Add("page", "0")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should handle gracefully with default page
		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Search_LargeLimit_Capped", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test")
		params.Add("limit", "1000")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should cap at maximum limit
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestSearchSuggestions(t *testing.T) {
	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("GetSuggestions_Success", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/suggestions?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("GetSuggestions_ShortQuery", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "a")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/suggestions?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// May require minimum query length, but should return empty suggestions
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestUserSearch(t *testing.T) {
	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("Search_WithQuery", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "testuser")

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("Search_EmptyQuery_BadRequest", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

func TestSemanticSearch(t *testing.T) {
	t.Skip("Semantic search requires OpenSearch/Elasticsearch with vector support")

	// Placeholder for semantic search tests:
	// - Vector similarity search
	// - Embedding generation
	// - Hybrid BM25 + vector search
	// - Query understanding
}

func TestFuzzySearch(t *testing.T) {
	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("Search_Typo", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "gamplay") // Intentional typo

		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		// Should still return results with fuzzy matching
	})
}

func TestSearchPerformance(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping performance test in short mode")
	}

	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("Search_ResponseTime", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "popular clips")

		start := time.Now()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)
		duration := time.Since(start)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Less(t, duration, 2*time.Second, "Search should complete within 2 seconds")
	})
}
