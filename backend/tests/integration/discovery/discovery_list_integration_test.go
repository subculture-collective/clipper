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

		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=new&limit=100", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		data := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 3)

		// Verify our test clips are in the results and appear in correct order
		var foundIndices = make(map[string]int)
		for i, item := range data {
			clip := item.(map[string]interface{})
			clipID := clip["id"].(string)
			if clipID == clip1.ID.String() || clipID == clip2.ID.String() || clipID == clip3.ID.String() {
				foundIndices[clipID] = i
			}
		}

		require.Equal(t, 3, len(foundIndices), "Should find all 3 test clips in results")

		// Verify order: clip3 (newest) should appear before clip2 and clip1
		assert.Less(t, foundIndices[clip3.ID.String()], foundIndices[clip2.ID.String()], "clip3 (newest) should appear before clip2")
		assert.Less(t, foundIndices[clip2.ID.String()], foundIndices[clip1.ID.String()], "clip2 should appear before clip1 (oldest)")
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

		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=discussed&timeframe=week&limit=100", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.True(t, response["success"].(bool))
		data := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 3)

		// Verify our test clips are in results and in correct order by comment count (descending)
		var foundIndices = make(map[string]int)
		for i, item := range data {
			clip := item.(map[string]interface{})
			clipID := clip["id"].(string)
			if clipID == clip1.ID.String() || clipID == clip2.ID.String() || clipID == clip3.ID.String() {
				foundIndices[clipID] = i
			}
		}

		require.Equal(t, 3, len(foundIndices), "Should find all 3 test clips in results")

		// Verify order: clip2 (25 comments) should appear before clip1 (10 comments) and clip3 (5 comments)
		assert.Less(t, foundIndices[clip2.ID.String()], foundIndices[clip1.ID.String()], "clip2 (25 comments) should appear before clip1 (10 comments)")
		assert.Less(t, foundIndices[clip1.ID.String()], foundIndices[clip3.ID.String()], "clip1 (10 comments) should appear before clip3 (5 comments)")
	})

	t.Run("Pagination_LimitAndPage", func(t *testing.T) {
		// Create 5 test clips with explicit timestamps for deterministic ordering
		var clipIDs []uuid.UUID
		baseTime := time.Now().Add(-1 * time.Hour)
		for i := 0; i < 5; i++ {
			clip := testutil.CreateTestClip(t, db, &userID)
			clipIDs = append(clipIDs, clip.ID)

			// Set explicit creation time for deterministic ordering
			createdAt := baseTime.Add(time.Duration(i) * time.Second)
			_, err := db.Pool.Exec(ctx, "UPDATE clips SET created_at = $1 WHERE id = $2", createdAt, clip.ID)
			require.NoError(t, err)
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
		err := json.Unmarshal(w.Body.Bytes(), &firstPage)
		require.NoError(t, err)
		firstPageData := firstPage["data"].([]interface{})
		assert.Equal(t, 2, len(firstPageData))

		// Second page
		req = httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=new&limit=2&page=2", nil)
		w = httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var secondPage map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &secondPage)
		require.NoError(t, err)
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
		_, err := db.Pool.Exec(ctx, "UPDATE clips SET created_at = NOW() - INTERVAL '2 days', vote_score = 100, vote_count = 100 WHERE id = $1", oldClip.ID)
		require.NoError(t, err)

		// Set recent clip to have decent score and be created just now
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET created_at = NOW(), vote_score = 50, vote_count = 50 WHERE id = $1", recentClip.ID)
		require.NoError(t, err)

		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = ANY($1)", []uuid.UUID{oldClip.ID, recentClip.ID})
		}()

		// Test day timeframe (should only include recent clip which was created today)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=top&timeframe=day&limit=100", nil)
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

		// Test with top10k_streamers filter (use limit=100 to ensure both clips can appear if not filtered)
		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=new&top10k_streamers=true&limit=100", nil)
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
		// Create clips with different hot scores (based on vote_score and creation time)
		clip1 := testutil.CreateTestClip(t, db, &userID)
		clip2 := testutil.CreateTestClip(t, db, &userID)
		clip3 := testutil.CreateTestClip(t, db, &userID)

		// Set vote_score to control hot score calculation (hot score = vote_score / time_decay)
		// Higher vote_score = higher hot score
		_, err := db.Pool.Exec(ctx, "UPDATE clips SET vote_score = 50 WHERE id = $1", clip1.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET vote_score = 90 WHERE id = $1", clip2.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET vote_score = 30 WHERE id = $1", clip3.ID)
		require.NoError(t, err)

		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = ANY($1)", []uuid.UUID{clip1.ID, clip2.ID, clip3.ID})
		}()

		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=hot&limit=100", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		data := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 3)

		// Verify our test clips are in results and in correct order by hot score (descending)
		var foundIndices = make(map[string]int)
		for i, item := range data {
			clip := item.(map[string]interface{})
			clipID := clip["id"].(string)
			if clipID == clip1.ID.String() || clipID == clip2.ID.String() || clipID == clip3.ID.String() {
				foundIndices[clipID] = i
			}
		}

		require.Equal(t, 3, len(foundIndices), "Should find all 3 test clips in results")

		// Verify order: clip2 (90 vote_score) should appear before clip1 (50) and clip3 (30)
		assert.Less(t, foundIndices[clip2.ID.String()], foundIndices[clip1.ID.String()], "clip2 (90 vote_score) should appear before clip1 (50)")
		assert.Less(t, foundIndices[clip1.ID.String()], foundIndices[clip3.ID.String()], "clip1 (50 vote_score) should appear before clip3 (30)")
	})

	t.Run("TopList_OrderedByVotes", func(t *testing.T) {
		// Create clips with different vote counts
		clip1 := testutil.CreateTestClip(t, db, &userID)
		clip2 := testutil.CreateTestClip(t, db, &userID)
		clip3 := testutil.CreateTestClip(t, db, &userID)

		// Set different vote_score (higher values to ensure they show up in top results)
		_, err := db.Pool.Exec(ctx, "UPDATE clips SET vote_score = 150, vote_count = 150 WHERE id = $1", clip1.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET vote_score = 300, vote_count = 300 WHERE id = $1", clip2.ID)
		require.NoError(t, err)
		_, err = db.Pool.Exec(ctx, "UPDATE clips SET vote_score = 80, vote_count = 80 WHERE id = $1", clip3.ID)
		require.NoError(t, err)

		defer func() {
			_, _ = db.Pool.Exec(ctx, "DELETE FROM clips WHERE id = ANY($1)", []uuid.UUID{clip1.ID, clip2.ID, clip3.ID})
		}()

		req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?sort=top&timeframe=all&limit=100", nil)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		data := response["data"].([]interface{})
		assert.GreaterOrEqual(t, len(data), 3)

		// Verify our test clips are in results and in correct order by vote_score (descending)
		var foundIndices = make(map[string]int)
		for i, item := range data {
			clip := item.(map[string]interface{})
			clipID := clip["id"].(string)
			if clipID == clip1.ID.String() || clipID == clip2.ID.String() || clipID == clip3.ID.String() {
				foundIndices[clipID] = i
			}
		}

		require.Equal(t, 3, len(foundIndices), "Should find all 3 test clips in results")

		// Verify order: clip2 (300 vote_score) should appear before clip1 (150) and clip3 (80)
		assert.Less(t, foundIndices[clip2.ID.String()], foundIndices[clip1.ID.String()], "clip2 (300 vote_score) should appear before clip1 (150)")
		assert.Less(t, foundIndices[clip1.ID.String()], foundIndices[clip3.ID.String()], "clip1 (150 vote_score) should appear before clip3 (80)")
	})
}
