//go:build integration

package discovery

import (
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
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// NOTE: The Discovery Lists feature (Top/New/Discussed) is implemented via the
// /api/v1/clips endpoint with sort parameters (hot, new, top, discussed).
// This is documented in docs/product/discovery-lists.md
// These integration tests verify the pagination, filtering, and ordering of
// those discovery lists through the clips endpoint.

// setupDiscoveryTestRouter creates a test router with discovery and clip routes
func setupDiscoveryTestRouter(t *testing.T) (*gin.Engine, *jwtpkg.Manager, *database.DB, *redispkg.Client, uuid.UUID, uuid.UUID, *repository.ClipRepository) {
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

	// Create test users
	username := fmt.Sprintf("discoveryuser%d", time.Now().Unix())
	user := testutil.CreateTestUser(t, db, username)

	adminUsername := fmt.Sprintf("discoveryadmin%d", time.Now().Unix())
	admin := testutil.CreateTestUserWithRole(t, db, adminUsername, "admin")

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())

	// Clip routes for listing with sort/filter
	clips := r.Group("/api/v1/clips")
	{
		clips.GET("", clipHandler.ListClips)
		clips.POST("/:id/vote", middleware.AuthMiddleware(authService), clipHandler.VoteOnClip)
	}

	return r, jwtManager, db, redisClient, user.ID, admin.ID, clipRepo
}

// TestDiscoveryListPagination tests pagination for discovery lists (Top/New/Discussed)
func TestDiscoveryListPagination(t *testing.T) {
	router, jwtManager, db, redisClient, userID, _, _ := setupDiscoveryTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	userToken, _ := testutil.GenerateTestTokens(t, jwtManager, userID, "user")

	ctx := context.Background()

	t.Run("TopList_EmptyResults", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=top&timeframe=day&limit=10", nil)
		req.Header.Set("Authorization", "Bearer "+userToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		data := response["data"].([]interface{})
		assert.Equal(t, 0, len(data))
	})

	t.Run("NewList_WithClips", func(t *testing.T) {
		// Create test clips
		clip1 := testutil.CreateTestClip(t, db, &userID)
		time.Sleep(10 * time.Millisecond)
		clip2 := testutil.CreateTestClip(t, db, &userID)
		time.Sleep(10 * time.Millisecond)
		clip3 := testutil.CreateTestClip(t, db, &userID)

		// Clean up clips after test
		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = ANY($1)", []uuid.UUID{clip1.ID, clip2.ID, clip3.ID})
		}()

		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=new&limit=10", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		data := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 3)

		// Verify newest clips appear first
		firstClip := data[0].(map[string]interface{})
		assert.Equal(t, clip3.ID.String(), firstClip["id"].(string))
	})

	t.Run("DiscussedList_OrderedByComments", func(t *testing.T) {
		// Create clips with different comment counts
		clip1 := testutil.CreateTestClip(t, db, &userID)
		clip2 := testutil.CreateTestClip(t, db, &userID)
		clip3 := testutil.CreateTestClip(t, db, &userID)

		// Set comment counts
		_, err := db.Pool.Exec(ctx, "UPDATE clips SET comment_count = 10 WHERE id = $1", clip1.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET comment_count = 25 WHERE id = $1", clip2.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET comment_count = 5 WHERE id = $1", clip3.ID)
		require.NoError(t, err)

		// Clean up clips after test
		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = ANY($1)", []uuid.UUID{clip1.ID, clip2.ID, clip3.ID})
		}()

		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=discussed&timeframe=week&limit=10", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		data := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 3)

		// Verify clips are ordered by comment count (descending)
		firstClip := data[0].(map[string]interface{})
		assert.Equal(t, clip2.ID.String(), firstClip["id"].(string))
	})

	t.Run("Pagination_LimitAndPage", func(t *testing.T) {
		// Create 5 test clips
		var clipIDs []uuid.UUID
		for i := 0; i < 5; i++ {
			clip := testutil.CreateTestClip(t, db, &userID)
			clipIDs = append(clipIDs, clip.ID)
			time.Sleep(10 * time.Millisecond)
		}

		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = ANY($1)", clipIDs)
		}()

		// First page
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=new&limit=2&page=1", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var firstPage map[string]interface{}
		err2 := json.Unmarshal(w.Body.Bytes(), &firstPage)
		require.NoError(t, err2)
		firstPageData := firstPage["data"].([]interface{})
		assert.Equal(t, 2, len(firstPageData))

		// Second page
		req = httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=new&limit=2&page=2", nil)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var secondPage map[string]interface{}
		err3 := json.Unmarshal(w.Body.Bytes(), &secondPage)
		require.NoError(t, err3)
		secondPageData := secondPage["data"].([]interface{})
		assert.Equal(t, 2, len(secondPageData))

		// Verify different clips on different pages
		firstID := firstPageData[0].(map[string]interface{})["id"].(string)
		secondID := secondPageData[0].(map[string]interface{})["id"].(string)
		assert.NotEqual(t, firstID, secondID)
	})

	t.Run("Pagination_BoundaryValues", func(t *testing.T) {
		// Test with limit exceeding max
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=new&limit=200", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		// Test with zero limit (should use default)
		req = httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=new&limit=0", nil)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		// Test with negative page (should use default)
		req = httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=new&page=-1", nil)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// TestDiscoveryListFilters tests filter parameters for discovery lists
func TestDiscoveryListFilters(t *testing.T) {
	router, jwtManager, db, redisClient, userID, _, _ := setupDiscoveryTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	userToken, _ := testutil.GenerateTestTokens(t, jwtManager, userID, "user")
	ctx := context.Background()

	t.Run("TimeframeFilter_TopList", func(t *testing.T) {
		// Create clips at different times
		oldClip := testutil.CreateTestClip(t, db, &userID)
		recentClip := testutil.CreateTestClip(t, db, &userID)

		// Make old clip created 2 days ago
		_, err := db.Pool.Exec(ctx, "UPDATE clips SET created_at = NOW() - INTERVAL '2 days' WHERE id = $1", oldClip.ID)
		require.NoError(t, err)

		// Set vote counts (both positive for top sorting)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET vote_count = 10 WHERE id = $1", oldClip.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET vote_count = 5 WHERE id = $1", recentClip.ID)
		require.NoError(t, err)

		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = ANY($1)", []uuid.UUID{oldClip.ID, recentClip.ID})
		}()

		// Test day timeframe (should only include recent clip)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=top&timeframe=day", nil)
		req.Header.Set("Authorization", "Bearer "+userToken)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		data := response["data"].([]interface{})
		// Should include recent clip but not old clip
		hasRecent := false
		hasOld := false
		for _, item := range data {
			clip := item.(map[string]interface{})
			if clip["id"].(string) == recentClip.ID.String() {
				hasRecent = true
			}
			if clip["id"].(string) == oldClip.ID.String() {
				hasOld = true
			}
		}
		assert.True(t, hasRecent, "Recent clip should be in results")
		assert.False(t, hasOld, "Old clip should not be in day timeframe")
	})

	t.Run("Top10kStreamersFilter", func(t *testing.T) {
		// Create clips with different broadcasters
		topStreamerClip := testutil.CreateTestClip(t, db, &userID)
		regularStreamerClip := testutil.CreateTestClip(t, db, &userID)

		// Add broadcaster to top streamers table for topStreamerClip
		broadcasterID := "top_streamer_123"
		_, err := db.Pool.Exec(ctx, "UPDATE clips SET broadcaster_id = $1 WHERE id = $2", broadcasterID, topStreamerClip.ID)
		require.NoError(t, err)

		_, err = db.Pool.Exec(ctx, `
			INSERT INTO top_streamers (broadcaster_id, broadcaster_name, rank)
			VALUES ($1, 'TopStreamer', 1)
			ON CONFLICT (broadcaster_id) DO NOTHING
		`, broadcasterID)
		require.NoError(t, err)

		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = ANY($1)", []uuid.UUID{topStreamerClip.ID, regularStreamerClip.ID})
			_, _ = db.Pool.Exec(ctx, "DELETE FROM top_streamers WHERE broadcaster_id = $1", broadcasterID)
		}()

		// Test with top10k_streamers filter
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=new&top10k_streamers=true", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		data := response["data"].([]interface{})
		// Should include top streamer clip
		hasTopStreamer := false
		hasRegular := false
		for _, item := range data {
			clip := item.(map[string]interface{})
			if clip["id"].(string) == topStreamerClip.ID.String() {
				hasTopStreamer = true
			}
			if clip["id"].(string) == regularStreamerClip.ID.String() {
				hasRegular = true
			}
		}
		assert.True(t, hasTopStreamer, "Top streamer clip should be in results")
		assert.False(t, hasRegular, "Regular streamer clip should not be in top10k results")
	})

	t.Run("CombinedFilters", func(t *testing.T) {
		// Test combining top10k_streamers and timeframe
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=top&timeframe=week&top10k_streamers=true", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		// Just verify the endpoint works with combined filters
	})
}

// TestDiscoveryListOrdering tests that clips are returned in correct order
func TestDiscoveryListOrdering(t *testing.T) {
	router, _, db, redisClient, userID, _, _ := setupDiscoveryTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()

	t.Run("HotList_OrderedByHotScore", func(t *testing.T) {
		// Create clips with different hot scores
		clip1 := testutil.CreateTestClip(t, db, &userID)
		clip2 := testutil.CreateTestClip(t, db, &userID)
		clip3 := testutil.CreateTestClip(t, db, &userID)

		// Set different hot scores
		_, err := db.Pool.Exec(ctx, "UPDATE clips SET hot_score = 0.5 WHERE id = $1", clip1.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET hot_score = 0.9 WHERE id = $1", clip2.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET hot_score = 0.3 WHERE id = $1", clip3.ID)
		require.NoError(t, err)

		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = ANY($1)", []uuid.UUID{clip1.ID, clip2.ID, clip3.ID})
		}()

		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=hot&limit=10", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		data := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 3)

		// Verify highest hot score is first
		firstClip := data[0].(map[string]interface{})
		assert.Equal(t, clip2.ID.String(), firstClip["id"].(string))
	})

	t.Run("TopList_OrderedByVotes", func(t *testing.T) {
		// Create clips with different vote counts
		clip1 := testutil.CreateTestClip(t, db, &userID)
		clip2 := testutil.CreateTestClip(t, db, &userID)
		clip3 := testutil.CreateTestClip(t, db, &userID)

		// Set different vote counts
		_, err := db.Pool.Exec(ctx, "UPDATE clips SET vote_count = 15 WHERE id = $1", clip1.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET vote_count = 30 WHERE id = $1", clip2.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET vote_count = 8 WHERE id = $1", clip3.ID)
		require.NoError(t, err)

		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = ANY($1)", []uuid.UUID{clip1.ID, clip2.ID, clip3.ID})
		}()

		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=top&timeframe=all&limit=10", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		data := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 3)

		// Verify highest vote count is first
		firstClip := data[0].(map[string]interface{})
		assert.Equal(t, clip2.ID.String(), firstClip["id"].(string))
	})
}
