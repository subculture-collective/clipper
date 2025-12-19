// +build integration

package search

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

func setupSearchTestRouter(t *testing.T) (*gin.Engine, *services.AuthService, *database.DB, *redispkg.Client) {
	gin.SetMode(gin.TestMode)

	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     getEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     getEnv("TEST_DATABASE_PORT", "5437"),
			User:     getEnv("TEST_DATABASE_USER", "clipper"),
			Password: getEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     getEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: redispkg.Config{
			Host: getEnv("TEST_REDIS_HOST", "localhost"),
			Port: getEnv("TEST_REDIS_PORT", "6380"),
		},
		JWT: config.JWTConfig{
			PrivateKey: generateTestJWTKey(t),
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

	// Search routes
	search := r.Group("/api/v1/search")
	{
		search.GET("/clips", searchHandler.SearchClips)
		search.GET("/users", searchHandler.SearchUsers)
		search.GET("/suggest", searchHandler.GetSearchSuggestions)
	}

	return r, authService, db, redisClient
}

func getEnv(key, defaultValue string) string {
	return defaultValue
}

func generateTestJWTKey(t *testing.T) string {
	privateKey, _, err := jwtpkg.GenerateRSAKeyPair()
	require.NoError(t, err)
	return privateKey
}

func TestKeywordSearch(t *testing.T) {
	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("SearchClips_ByKeyword", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("SearchClips_EmptyQuery", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should return bad request or all clips
		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest}, w.Code)
	})

	t.Run("SearchClips_LongQuery", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "this is a very long search query with multiple words")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("SearchClips_SpecialCharacters", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test & clips | search")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestSearchFilters(t *testing.T) {
	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("SearchClips_WithBroadcasterFilter", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "gameplay")
		params.Add("broadcaster", "teststreamer")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("SearchClips_WithDateFilter", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "clips")
		params.Add("from", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
		params.Add("to", time.Now().Format("2006-01-02"))
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("SearchClips_WithCategoryFilter", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "gameplay")
		params.Add("category", "Just Chatting")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("SearchClips_WithLanguageFilter", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "clips")
		params.Add("language", "en")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("SearchClips_MultipleFilters", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "gameplay")
		params.Add("broadcaster", "teststreamer")
		params.Add("category", "Fortnite")
		params.Add("language", "en")
		params.Add("from", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestSearchPagination(t *testing.T) {
	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("SearchClips_Pagination", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test")
		params.Add("page", "1")
		params.Add("limit", "10")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("SearchClips_InvalidPage", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test")
		params.Add("page", "-1")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should handle gracefully
		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest}, w.Code)
	})

	t.Run("SearchClips_LargeLimit", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "test")
		params.Add("limit", "1000")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
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
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/suggest?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("GetSuggestions_ShortQuery", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "t")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/suggest?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// May require minimum query length
		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest}, w.Code)
	})
}

func TestUserSearch(t *testing.T) {
	router, _, db, redisClient := setupSearchTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("SearchUsers_ByUsername", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "testuser")
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/users?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("SearchUsers_EmptyQuery", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/users", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest}, w.Code)
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

	t.Run("SearchClips_Typo", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "gamplay") // Intentional typo
		
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
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

	t.Run("SearchClips_ResponseTime", func(t *testing.T) {
		params := url.Values{}
		params.Add("q", "popular clips")
		
		start := time.Now()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/search/clips?"+params.Encode(), nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)
		duration := time.Since(start)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Less(t, duration, 2*time.Second, "Search should complete within 2 seconds")
	})
}
