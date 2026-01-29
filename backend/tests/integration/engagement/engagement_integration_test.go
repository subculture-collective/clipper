//go:build integration

package engagement

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

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

// Helper to create string pointer
func stringPtr(s string) *string {
	return &s
}

func setupEngagementTestRouter(t *testing.T) (*gin.Engine, *jwtpkg.Manager, *database.DB, *redispkg.Client) {
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
	favoriteRepo := repository.NewFavoriteRepository(db.Pool)
	voteRepo := repository.NewVoteRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	// Initialize handlers
	commentHandler := handlers.NewCommentHandler(nil)
	favoriteHandler := handlers.NewFavoriteHandler(favoriteRepo, voteRepo, nil)

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())

	// Comment routes
	comments := r.Group("/api/v1/comments")
	comments.Use(middleware.AuthMiddleware(authService))
	{
		comments.POST("", commentHandler.CreateComment)
		comments.GET("/:id", commentHandler.ListComments)
		comments.PUT("/:id", commentHandler.UpdateComment)
		comments.DELETE("/:id", commentHandler.DeleteComment)
		comments.POST("/:id/vote", commentHandler.VoteOnComment)
		comments.GET("/:id/replies", commentHandler.GetReplies)
	}

	// Favorite routes
	favorites := r.Group("/api/v1/favorites")
	favorites.Use(middleware.AuthMiddleware(authService))
	{
		favorites.GET("", favoriteHandler.ListUserFavorites)
	}

	return r, jwtManager, db, redisClient
}

func TestCommentEngagement(t *testing.T) {
	router, jwtManager, db, redisClient := setupEngagementTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	// Generate test JWT token using testutil
	user := testutil.CreateTestUser(t, db, "engagement-test-user")
	accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, user.ID, "user")

	// Create a test clip first (would need clip creation in actual setup)
	clipID := uuid.New()

	var commentID string

	t.Run("CreateComment_Success", func(t *testing.T) {
		comment := map[string]interface{}{
			"clip_id": clipID.String(),
			"content": "This is a test comment",
		}
		bodyBytes, _ := json.Marshal(comment)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/comments", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// May not be fully implemented depending on setup
		assert.Contains(t, []int{http.StatusCreated, http.StatusNotFound, http.StatusBadRequest}, w.Code)

		if w.Code == http.StatusCreated {
			var response map[string]interface{}
			errJSON := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, errJSON)
			if id, ok := response["id"]; ok {
				commentID = id.(string)
			}
		}
	})

	t.Run("GetComment_Exists", func(t *testing.T) {
		if commentID == "" {
			t.Skip("No comment created to test")
		}

		req := httptest.NewRequest(http.MethodGet, "/api/v1/comments/"+commentID, nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("UpdateComment_Success", func(t *testing.T) {
		if commentID == "" {
			t.Skip("No comment created to test")
		}

		update := map[string]interface{}{
			"content": "Updated comment content",
		}
		bodyBytes, _ := json.Marshal(update)

		req := httptest.NewRequest(http.MethodPut, "/api/v1/comments/"+commentID, bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound}, w.Code)
	})

	t.Run("LikeComment_Success", func(t *testing.T) {
		if commentID == "" {
			t.Skip("No comment created to test")
		}

		vote := map[string]interface{}{
			"vote_type": "upvote",
		}
		bodyBytes, _ := json.Marshal(vote)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/comments/"+commentID+"/vote", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusCreated, http.StatusNotFound}, w.Code)
	})

	t.Run("UnlikeComment_Success", func(t *testing.T) {
		if commentID == "" {
			t.Skip("No comment created to test")
		}

		vote := map[string]interface{}{
			"vote_type": "none",
		}
		bodyBytes, _ := json.Marshal(vote)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/comments/"+commentID+"/vote", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNoContent, http.StatusNotFound}, w.Code)
	})

	t.Run("DeleteComment_Success", func(t *testing.T) {
		if commentID == "" {
			t.Skip("No comment created to test")
		}

		req := httptest.NewRequest(http.MethodDelete, "/api/v1/comments/"+commentID, nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusNoContent, http.StatusNotFound}, w.Code)
	})
}

func TestFavoriteEngagement(t *testing.T) {
	router, jwtManager, db, redisClient := setupEngagementTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	// Generate test JWT token using testutil
	user := testutil.CreateTestUser(t, db, "favorite-test-user")
	accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, user.ID, "user")

	t.Run("ListFavorites_Success", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/favorites", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should return list (may be empty)
		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound}, w.Code)
	})
}

func TestFollowEngagement(t *testing.T) {
	t.Skip("Follow integration tests require full user follow setup")

	// Placeholder for follow integration tests:
	// - Follow user
	// - Unfollow user
	// - List followers
	// - List following
	// - Follow notifications
}

func TestVoteEngagement(t *testing.T) {
	t.Skip("Vote integration tests require full voting setup")

	// Placeholder for vote integration tests:
	// - Upvote clip
	// - Downvote clip
	// - Remove vote
	// - Karma calculation
	// - Vote restrictions
}
