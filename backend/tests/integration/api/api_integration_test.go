// +build integration

package api

import (
	"context"
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
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

func setupAPITestRouter(t *testing.T) (*gin.Engine, *database.DB, *redispkg.Client) {
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
	clipRepo := repository.NewClipRepository(db.Pool)
	categoryRepo := repository.NewCategoryRepository(db.Pool)
	gameRepo := repository.NewGameRepository(db.Pool)
	broadcasterRepo := repository.NewBroadcasterRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, cfg)
	categoryHandler := handlers.NewCategoryHandler(categoryRepo, clipRepo)
	gameHandler := handlers.NewGameHandler(gameRepo, clipRepo, authService)
	broadcasterHandler := handlers.NewBroadcasterHandler(broadcasterRepo, clipRepo, nil, authService)

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())

	v1 := r.Group("/api/v1")
	{
		// Health check
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"status": "healthy"})
		})

		// Ping
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})

		// Public config endpoint
		v1.GET("/config", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{
				"features": gin.H{
					"search":      true,
					"comments":    true,
					"favorites":   true,
					"premium":     true,
				},
			})
		})

		// Categories
		v1.GET("/categories", categoryHandler.ListCategories)
		v1.GET("/categories/:id", categoryHandler.GetCategory)

		// Games
		v1.GET("/games", gameHandler.ListGames)
		v1.GET("/games/:id", gameHandler.GetGame)

		// Broadcasters
		v1.GET("/broadcasters", broadcasterHandler.ListBroadcasters)
		v1.GET("/broadcasters/:id", broadcasterHandler.GetBroadcaster)
	}

	return r, db, redisClient
}

func getEnv(key, defaultValue string) string {
	return defaultValue
}

func generateTestJWTKey(t *testing.T) string {
	privateKey, _, err := jwtpkg.GenerateRSAKeyPair()
	require.NoError(t, err)
	return privateKey
}

func TestHealthEndpoints(t *testing.T) {
	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("HealthCheck", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "healthy")
	})

	t.Run("Ping", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/ping", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "pong")
	})
}

func TestConfigEndpoint(t *testing.T) {
	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("GetPublicConfig", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/config", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.Contains(t, w.Body.String(), "features")
	})
}

func TestCategoryEndpoints(t *testing.T) {
	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("ListCategories", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/categories", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("GetCategory", func(t *testing.T) {
		// Use a test category ID - may not exist
		req := httptest.NewRequest(http.MethodGet, "/api/v1/categories/1", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Either returns category or not found
		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound}, w.Code)
	})
}

func TestGameEndpoints(t *testing.T) {
	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("ListGames", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/games", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("GetGame", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/games/1", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound}, w.Code)
	})
}

func TestBroadcasterEndpoints(t *testing.T) {
	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("ListBroadcasters", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/broadcasters", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("GetBroadcaster", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/broadcasters/testbroadcaster", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound}, w.Code)
	})
}

func TestEndpointCoverage(t *testing.T) {
	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	// Test a variety of endpoints to ensure they're accessible
	endpoints := []struct {
		method   string
		path     string
		expected []int
	}{
		{http.MethodGet, "/api/v1/health", []int{http.StatusOK}},
		{http.MethodGet, "/api/v1/ping", []int{http.StatusOK}},
		{http.MethodGet, "/api/v1/config", []int{http.StatusOK}},
		{http.MethodGet, "/api/v1/categories", []int{http.StatusOK}},
		{http.MethodGet, "/api/v1/games", []int{http.StatusOK}},
		{http.MethodGet, "/api/v1/broadcasters", []int{http.StatusOK}},
	}

	for _, endpoint := range endpoints {
		t.Run(fmt.Sprintf("%s %s", endpoint.method, endpoint.path), func(t *testing.T) {
			req := httptest.NewRequest(endpoint.method, endpoint.path, nil)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Contains(t, endpoint.expected, w.Code, 
				"Expected status code %v for %s %s, got %d", 
				endpoint.expected, endpoint.method, endpoint.path, w.Code)
		})
	}
}

func TestNotFoundEndpoint(t *testing.T) {
	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("NotFoundEndpoint", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/nonexistent", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusNotFound, w.Code)
	})
}

func TestMethodNotAllowed(t *testing.T) {
	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("MethodNotAllowed", func(t *testing.T) {
		// Try POST on a GET-only endpoint
		req := httptest.NewRequest(http.MethodPost, "/api/v1/health", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusMethodNotAllowed, http.StatusNotFound}, w.Code)
	})
}

func TestConcurrentRequests(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping concurrent request test in short mode")
	}

	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("ConcurrentHealthChecks", func(t *testing.T) {
		concurrency := 10
		done := make(chan bool, concurrency)

		for i := 0; i < concurrency; i++ {
			go func() {
				req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
				w := httptest.NewRecorder()

				router.ServeHTTP(w, req)

				assert.Equal(t, http.StatusOK, w.Code)
				done <- true
			}()
		}

		// Wait for all requests to complete
		for i := 0; i < concurrency; i++ {
			<-done
		}
	})
}

func TestDatabaseConnection(t *testing.T) {
	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("DatabaseHealthCheck", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := db.HealthCheck(ctx)
		assert.NoError(t, err, "Database should be healthy")
	})

	t.Run("DatabaseStats", func(t *testing.T) {
		stats := db.GetStats()
		assert.NotNil(t, stats)
		assert.Greater(t, stats.MaxConns(), int32(0), "Max connections should be greater than 0")
	})
}

func TestRedisConnection(t *testing.T) {
	router, db, redisClient := setupAPITestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("RedisHealthCheck", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		err := redisClient.HealthCheck(ctx)
		assert.NoError(t, err, "Redis should be healthy")
	})
}
