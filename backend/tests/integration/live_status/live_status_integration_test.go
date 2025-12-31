//go:build integration

package live_status

import (
"context"
"database/sql"
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

// setupLiveStatusTestEnvironment creates test database and services without Twitch client dependency
func setupLiveStatusTestEnvironment(t *testing.T) (*gin.Engine, *jwtpkg.Manager, *database.DB, *redispkg.Client, *repository.BroadcasterRepository, uuid.UUID) {
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

userRepo := repository.NewUserRepository(db.Pool)
refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
broadcasterRepo := repository.NewBroadcasterRepository(db.Pool)
streamFollowRepo := repository.NewStreamFollowRepository(db.Pool)

authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)
// Create a live status service with nil Twitch client for testing
// Handler tests will use repository data without needing Twitch API calls
liveStatusService := services.NewLiveStatusService(
	broadcasterRepo,
	streamFollowRepo,
	nil, // Twitch client not needed for handler tests that only read from DB
)

liveStatusHandler := handlers.NewLiveStatusHandler(liveStatusService, authService)

username := fmt.Sprintf("livestatususer%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
t.Cleanup(func() {
	testutil.CleanupTestUser(t, db, user.ID)
})

r := gin.New()
r.Use(gin.Recovery())

api := r.Group("/api/v1")
{
api.GET("/broadcasters/:id/live-status", liveStatusHandler.GetBroadcasterLiveStatus)
api.GET("/broadcasters/live", liveStatusHandler.ListLiveBroadcasters)
api.GET("/feed/live", middleware.AuthMiddleware(authService), liveStatusHandler.GetFollowedLiveBroadcasters)
}

return r, jwtManager, db, redisClient, broadcasterRepo, user.ID
}

// TestLiveStatusPersistence tests that live status data is correctly persisted and retrieved
func TestLiveStatusPersistence(t *testing.T) {
_, _, db, redisClient, broadcasterRepo, userID := setupLiveStatusTestEnvironment(t)
defer db.Close()
defer redisClient.Close()

ctx := context.Background()
broadcasterID := "persist123"
broadcasterName := "persiststreamer"

// Follow the broadcaster
err := broadcasterRepo.FollowBroadcaster(ctx, userID, broadcasterID, broadcasterName)
require.NoError(t, err)

defer func() {
_, _ = db.Pool.Exec(ctx, "DELETE FROM broadcaster_follows WHERE broadcaster_id = $1", broadcasterID)
_, _ = db.Pool.Exec(ctx, "DELETE FROM broadcaster_live_status WHERE broadcaster_id = $1", broadcasterID)
_, _ = db.Pool.Exec(ctx, "DELETE FROM broadcaster_sync_status WHERE broadcaster_id = $1", broadcasterID)
}()

t.Run("UpsertLiveStatus_Online", func(t *testing.T) {
// Create live status
userLogin := "persiststreamer"
userName := "Persist Streamer"
streamTitle := "Test Stream"
gameName := "Test Game"
startedAt := time.Now().Add(-1 * time.Hour)

status := &models.BroadcasterLiveStatus{
BroadcasterID: broadcasterID,
UserLogin:     &userLogin,
UserName:      &userName,
IsLive:        true,
StreamTitle:   &streamTitle,
GameName:      &gameName,
ViewerCount:   1500,
StartedAt:     &startedAt,
LastChecked:   time.Now(),
}

err := broadcasterRepo.UpsertLiveStatus(ctx, status)
require.NoError(t, err)

// Retrieve and verify
retrieved, err := broadcasterRepo.GetLiveStatus(ctx, broadcasterID)
require.NoError(t, err)
assert.True(t, retrieved.IsLive)
assert.Equal(t, 1500, retrieved.ViewerCount)
assert.Equal(t, streamTitle, *retrieved.StreamTitle)
assert.Equal(t, gameName, *retrieved.GameName)
})

t.Run("UpsertLiveStatus_Update", func(t *testing.T) {
// Update viewer count
userLogin := "persiststreamer"
userName := "Persist Streamer"
streamTitle := "Updated Stream Title"
gameName := "Test Game"
startedAt := time.Now().Add(-1 * time.Hour)

status := &models.BroadcasterLiveStatus{
BroadcasterID: broadcasterID,
UserLogin:     &userLogin,
UserName:      &userName,
IsLive:        true,
StreamTitle:   &streamTitle,
GameName:      &gameName,
ViewerCount:   2000,
StartedAt:     &startedAt,
LastChecked:   time.Now(),
}

err := broadcasterRepo.UpsertLiveStatus(ctx, status)
require.NoError(t, err)

// Verify update
retrieved, err := broadcasterRepo.GetLiveStatus(ctx, broadcasterID)
require.NoError(t, err)
assert.True(t, retrieved.IsLive)
assert.Equal(t, 2000, retrieved.ViewerCount)
assert.Equal(t, streamTitle, *retrieved.StreamTitle)
})

t.Run("UpsertLiveStatus_Offline", func(t *testing.T) {
// Set broadcaster offline
status := &models.BroadcasterLiveStatus{
BroadcasterID: broadcasterID,
IsLive:        false,
ViewerCount:   0,
LastChecked:   time.Now(),
}

err := broadcasterRepo.UpsertLiveStatus(ctx, status)
require.NoError(t, err)

// Verify offline
retrieved, err := broadcasterRepo.GetLiveStatus(ctx, broadcasterID)
require.NoError(t, err)
assert.False(t, retrieved.IsLive)
assert.Equal(t, 0, retrieved.ViewerCount)
})
}

// TestLiveStatusAPIEndpoints tests the HTTP API endpoints
func TestLiveStatusAPIEndpoints(t *testing.T) {
router, jwtManager, db, redisClient, broadcasterRepo, userID := setupLiveStatusTestEnvironment(t)
defer db.Close()
defer redisClient.Close()

ctx := context.Background()
broadcasterID1 := "api111"
broadcasterID2 := "api222"

// Setup test data
userLogin1 := "apistreamer1"
userName1 := "API Streamer 1"
streamTitle1 := "API Stream 1"
gameName1 := "API Game 1"
startedAt1 := time.Now().Add(-2 * time.Hour)

status1 := &models.BroadcasterLiveStatus{
BroadcasterID: broadcasterID1,
UserLogin:     &userLogin1,
UserName:      &userName1,
IsLive:        true,
StreamTitle:   &streamTitle1,
GameName:      &gameName1,
ViewerCount:   5000,
StartedAt:     &startedAt1,
LastChecked:   time.Now(),
}

userLogin2 := "apistreamer2"
userName2 := "API Streamer 2"
streamTitle2 := "API Stream 2"
gameName2 := "API Game 2"
startedAt2 := time.Now().Add(-1 * time.Hour)

status2 := &models.BroadcasterLiveStatus{
BroadcasterID: broadcasterID2,
UserLogin:     &userLogin2,
UserName:      &userName2,
IsLive:        true,
StreamTitle:   &streamTitle2,
GameName:      &gameName2,
ViewerCount:   3000,
StartedAt:     &startedAt2,
LastChecked:   time.Now(),
}

err := broadcasterRepo.UpsertLiveStatus(ctx, status1)
require.NoError(t, err)
err = broadcasterRepo.UpsertLiveStatus(ctx, status2)
require.NoError(t, err)

// Follow broadcaster1
err = broadcasterRepo.FollowBroadcaster(ctx, userID, broadcasterID1, userLogin1)
require.NoError(t, err)

defer func() {
_, _ = db.Pool.Exec(ctx, "DELETE FROM broadcaster_follows WHERE broadcaster_id = ANY($1)", []string{broadcasterID1, broadcasterID2})
_, _ = db.Pool.Exec(ctx, "DELETE FROM broadcaster_live_status WHERE broadcaster_id = ANY($1)", []string{broadcasterID1, broadcasterID2})
}()

t.Run("GetBroadcasterLiveStatus_Online", func(t *testing.T) {
req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/broadcasters/%s/live-status", broadcasterID1), nil)
w := httptest.NewRecorder()

router.ServeHTTP(w, req)

assert.Equal(t, http.StatusOK, w.Code)

var response models.BroadcasterLiveStatus
err := json.Unmarshal(w.Body.Bytes(), &response)
require.NoError(t, err)

assert.Equal(t, broadcasterID1, response.BroadcasterID)
assert.True(t, response.IsLive)
assert.Equal(t, 5000, response.ViewerCount)
})

t.Run("GetBroadcasterLiveStatus_NotFound", func(t *testing.T) {
req := httptest.NewRequest(http.MethodGet, "/api/v1/broadcasters/nonexistent/live-status", nil)
w := httptest.NewRecorder()

router.ServeHTTP(w, req)

assert.Equal(t, http.StatusOK, w.Code)

var response map[string]interface{}
err := json.Unmarshal(w.Body.Bytes(), &response)
require.NoError(t, err)

assert.Equal(t, "nonexistent", response["broadcaster_id"])
assert.False(t, response["is_live"].(bool))
})

t.Run("ListLiveBroadcasters", func(t *testing.T) {
req := httptest.NewRequest(http.MethodGet, "/api/v1/broadcasters/live?limit=10", nil)
w := httptest.NewRecorder()

router.ServeHTTP(w, req)

assert.Equal(t, http.StatusOK, w.Code)

var response map[string]interface{}
err := json.Unmarshal(w.Body.Bytes(), &response)
require.NoError(t, err)

assert.True(t, response["success"].(bool))
data := response["data"].([]interface{})
assert.GreaterOrEqual(t, len(data), 2, "Should have at least 2 live broadcasters")

// Verify ordering by viewer count
if len(data) >= 2 {
first := data[0].(map[string]interface{})
second := data[1].(map[string]interface{})
assert.GreaterOrEqual(t, first["viewer_count"].(float64), second["viewer_count"].(float64))
}
})

t.Run("GetFollowedLiveBroadcasters_Authenticated", func(t *testing.T) {
userToken, _ := testutil.GenerateTestTokens(t, jwtManager, userID, "user")

req := httptest.NewRequest(http.MethodGet, "/api/v1/feed/live", nil)
req.Header.Set("Authorization", "Bearer "+userToken)
w := httptest.NewRecorder()

router.ServeHTTP(w, req)

assert.Equal(t, http.StatusOK, w.Code)

var response map[string]interface{}
err := json.Unmarshal(w.Body.Bytes(), &response)
require.NoError(t, err)

assert.True(t, response["success"].(bool))
data := response["data"].([]interface{})
assert.Equal(t, 1, len(data))

first := data[0].(map[string]interface{})
assert.Equal(t, broadcasterID1, first["broadcaster_id"])
assert.True(t, first["is_live"].(bool))
})

t.Run("GetFollowedLiveBroadcasters_Unauthenticated", func(t *testing.T) {
req := httptest.NewRequest(http.MethodGet, "/api/v1/feed/live", nil)
w := httptest.NewRecorder()

router.ServeHTTP(w, req)

assert.Equal(t, http.StatusUnauthorized, w.Code)
})
}

// TestSyncStatusAndLogging tests sync status tracking and logging
func TestSyncStatusAndLogging(t *testing.T) {
_, _, db, redisClient, broadcasterRepo, userID := setupLiveStatusTestEnvironment(t)
defer db.Close()
defer redisClient.Close()

ctx := context.Background()
broadcasterID := "sync123"
broadcasterName := "syncstreamer"

err := broadcasterRepo.FollowBroadcaster(ctx, userID, broadcasterID, broadcasterName)
require.NoError(t, err)

defer func() {
_, _ = db.Pool.Exec(ctx, "DELETE FROM broadcaster_follows WHERE broadcaster_id = $1", broadcasterID)
_, _ = db.Pool.Exec(ctx, "DELETE FROM broadcaster_sync_status WHERE broadcaster_id = $1", broadcasterID)
_, _ = db.Pool.Exec(ctx, "DELETE FROM broadcaster_sync_log WHERE broadcaster_id = $1", broadcasterID)
}()

t.Run("UpsertSyncStatus", func(t *testing.T) {
gameName := "Sync Game"
streamTitle := "Sync Stream"
startedAt := time.Now().Add(-30 * time.Minute)

syncStatus := &models.BroadcasterSyncStatus{
BroadcasterID:   broadcasterID,
IsLive:          true,
StreamStartedAt: &startedAt,
LastSynced:      time.Now(),
GameName:        &gameName,
ViewerCount:     1200,
StreamTitle:     &streamTitle,
}

err := broadcasterRepo.UpsertSyncStatus(ctx, syncStatus)
require.NoError(t, err)

// Retrieve and verify
retrieved, err := broadcasterRepo.GetSyncStatus(ctx, broadcasterID)
require.NoError(t, err)
assert.True(t, retrieved.IsLive)
assert.Equal(t, 1200, retrieved.ViewerCount)
assert.Equal(t, gameName, *retrieved.GameName)
})

t.Run("CreateSyncLog", func(t *testing.T) {
statusChange := "went_live"
syncLog := &models.BroadcasterSyncLog{
ID:            uuid.New(),
BroadcasterID: broadcasterID,
SyncTime:      time.Now(),
StatusChange:  &statusChange,
Error:         nil,
CreatedAt:     time.Now(),
}

err := broadcasterRepo.CreateSyncLog(ctx, syncLog)
require.NoError(t, err)

// Verify log was created
var count int
err = db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM broadcaster_sync_log WHERE broadcaster_id = $1 AND status_change = $2", broadcasterID, statusChange).Scan(&count)
require.NoError(t, err)
assert.Equal(t, 1, count)
})

t.Run("CreateSyncLog_WithError", func(t *testing.T) {
errorMsg := "test error: connection timeout"
syncLog := &models.BroadcasterSyncLog{
ID:            uuid.New(),
BroadcasterID: broadcasterID,
SyncTime:      time.Now(),
StatusChange:  nil,
Error:         &errorMsg,
CreatedAt:     time.Now(),
}

err := broadcasterRepo.CreateSyncLog(ctx, syncLog)
require.NoError(t, err)

// Verify error log
var retrievedError sql.NullString
err = db.Pool.QueryRow(ctx, "SELECT error FROM broadcaster_sync_log WHERE broadcaster_id = $1 AND error IS NOT NULL ORDER BY created_at DESC LIMIT 1", broadcasterID).Scan(&retrievedError)
require.NoError(t, err)
assert.True(t, retrievedError.Valid)
assert.Contains(t, retrievedError.String, "connection timeout")
})
}

// TestCacheInvalidationViaTimestamp tests that status updates modify timestamps
func TestCacheInvalidationViaTimestamp(t *testing.T) {
_, _, db, redisClient, broadcasterRepo, userID := setupLiveStatusTestEnvironment(t)
defer db.Close()
defer redisClient.Close()

ctx := context.Background()
broadcasterID := "timestamp123"
broadcasterName := "timestampstreamer"

err := broadcasterRepo.FollowBroadcaster(ctx, userID, broadcasterID, broadcasterName)
require.NoError(t, err)

defer func() {
_, _ = db.Pool.Exec(ctx, "DELETE FROM broadcaster_follows WHERE broadcaster_id = $1", broadcasterID)
_, _ = db.Pool.Exec(ctx, "DELETE FROM broadcaster_live_status WHERE broadcaster_id = $1", broadcasterID)
}()

t.Run("StatusUpdate_ChangesTimestamp", func(t *testing.T) {
// Initial status
status1 := &models.BroadcasterLiveStatus{
BroadcasterID: broadcasterID,
IsLive:        false,
ViewerCount:   0,
LastChecked:   time.Now(),
}

err := broadcasterRepo.UpsertLiveStatus(ctx, status1)
require.NoError(t, err)

retrieved1, err := broadcasterRepo.GetLiveStatus(ctx, broadcasterID)
require.NoError(t, err)
initialTime := retrieved1.UpdatedAt

// Wait to ensure timestamp difference
time.Sleep(100 * time.Millisecond)

// Update status
userLogin := "timestampstreamer"
streamTitle := "Timestamp Test"
startedAt := time.Now()
status2 := &models.BroadcasterLiveStatus{
BroadcasterID: broadcasterID,
UserLogin:     &userLogin,
IsLive:        true,
StreamTitle:   &streamTitle,
ViewerCount:   1000,
StartedAt:     &startedAt,
LastChecked:   time.Now(),
}

err = broadcasterRepo.UpsertLiveStatus(ctx, status2)
require.NoError(t, err)

retrieved2, err := broadcasterRepo.GetLiveStatus(ctx, broadcasterID)
require.NoError(t, err)

// Verify timestamp changed
assert.True(t, retrieved2.UpdatedAt.After(initialTime), "UpdatedAt should be newer after update")
assert.True(t, retrieved2.IsLive)
})
}
