//go:build integration

package gdpr

import (
"context"
"fmt"
"testing"
"time"

"github.com/google/uuid"
"github.com/stretchr/testify/assert"
"github.com/stretchr/testify/require"
"github.com/subculture-collective/clipper/internal/models"
"github.com/subculture-collective/clipper/internal/repository"
"github.com/subculture-collective/clipper/pkg/database"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// TestHardDeleteDataRemoval tests that hard delete removes/anonymizes all personal data
func TestHardDeleteDataRemoval(t *testing.T) {
db, redisClient, _, _ := setupGDPRTest(t)
defer db.Close()
defer redisClient.Close()

t.Run("RemovesPersonalDataFromUser", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("harddelete_%d", time.Now().UnixNano())
user := testutil.CreateTestUser(t, db, username)

userRepo := repository.NewUserRepository(db.Pool)

// Verify user exists with personal data
fetchedUser, err := userRepo.GetByID(ctx, user.ID)
require.NoError(t, err)
assert.NotNil(t, fetchedUser.Email)

// Hard delete
err = hardDeleteUser(ctx, db, user.ID)
require.NoError(t, err)

// Verify user is deleted
_, err = userRepo.GetByID(ctx, user.ID)
assert.Error(t, err)
assert.Equal(t, repository.ErrUserNotFound, err)
})

t.Run("RemovesUserOwnedResources", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("resources_%d", time.Now().UnixNano())
user := testutil.CreateTestUser(t, db, username)

// Create user-owned resources
favoriteRepo := repository.NewFavoriteRepository(db.Pool)
commentRepo := repository.NewCommentRepository(db.Pool)
voteRepo := repository.NewVoteRepository(db.Pool)
clipRepo := repository.NewClipRepository(db.Pool)

// Create a test clip
clip := &models.Clip{
ID:              uuid.New(),
TwitchClipID:    fmt.Sprintf("testclip_%d", time.Now().UnixNano()),
TwitchClipURL:   "https://clips.twitch.tv/testclip",
BroadcasterName: "testbroadcaster",
CreatorName:     "testcreator",
Title:           "Test Clip",
CreatedAt:       time.Now(),
}
err := clipRepo.Create(ctx, clip)
require.NoError(t, err)

// Add favorite
favorite := &models.Favorite{
ID:        uuid.New(),
UserID:    user.ID,
ClipID:    clip.ID,
CreatedAt: time.Now(),
}
err = favoriteRepo.Add(ctx, favorite)
require.NoError(t, err)

// Add vote
err = voteRepo.AddVote(ctx, user.ID, clip.ID, 1)
require.NoError(t, err)

// Add comment
comment := &models.Comment{
ID:        uuid.New(),
UserID:    user.ID,
ClipID:    clip.ID,
Content:   "Test comment",
CreatedAt: time.Now(),
}
err = commentRepo.Create(ctx, comment)
require.NoError(t, err)

// Verify resources exist
favorites, err := favoriteRepo.GetByUserID(ctx, user.ID, 1, 10)
require.NoError(t, err)
assert.Len(t, favorites, 1)

// Hard delete user
err = hardDeleteUser(ctx, db, user.ID)
require.NoError(t, err)

// Verify favorites are deleted (CASCADE)
favorites, err = favoriteRepo.GetByUserID(ctx, user.ID, 1, 10)
require.NoError(t, err)
assert.Empty(t, favorites)

// Verify votes are deleted
var voteCount int
err = db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM votes WHERE user_id = $1", user.ID).Scan(&voteCount)
require.NoError(t, err)
assert.Equal(t, 0, voteCount)

// Verify comments are deleted
var commentCount int
err = db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM comments WHERE user_id = $1", user.ID).Scan(&commentCount)
require.NoError(t, err)
assert.Equal(t, 0, commentCount)
})

t.Run("RemovesAuthenticationTokens", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("tokens_%d", time.Now().UnixNano())
user := testutil.CreateTestUser(t, db, username)

refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)

// Create refresh token
tokenHash := fmt.Sprintf("token_hash_%d", time.Now().UnixNano())
expiresAt := time.Now().Add(7 * 24 * time.Hour)
err := refreshTokenRepo.Create(ctx, user.ID, tokenHash, expiresAt)
require.NoError(t, err)

// Verify token exists
var tokenCount int
err = db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM refresh_tokens WHERE user_id = $1", user.ID).Scan(&tokenCount)
require.NoError(t, err)
assert.Equal(t, 1, tokenCount)

// Hard delete user
err = hardDeleteUser(ctx, db, user.ID)
require.NoError(t, err)

// Verify tokens are deleted (CASCADE)
err = db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM refresh_tokens WHERE user_id = $1", user.ID).Scan(&tokenCount)
require.NoError(t, err)
assert.Equal(t, 0, tokenCount)
})

t.Run("RemovesUserSettings", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("settings_%d", time.Now().UnixNano())
user := testutil.CreateTestUser(t, db, username)

// Verify settings exist (auto-created by trigger)
var settingsCount int
err := db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM user_settings WHERE user_id = $1", user.ID).Scan(&settingsCount)
require.NoError(t, err)
assert.Equal(t, 1, settingsCount)

// Hard delete user
err = hardDeleteUser(ctx, db, user.ID)
require.NoError(t, err)

// Verify settings are deleted (CASCADE)
err = db.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM user_settings WHERE user_id = $1", user.ID).Scan(&settingsCount)
require.NoError(t, err)
assert.Equal(t, 0, settingsCount)
})
}

// TestExportAfterDeletion tests that export returns no personal data after deletion
func TestExportAfterDeletion(t *testing.T) {
db, redisClient, userSettingsService, _ := setupGDPRTest(t)
defer db.Close()
defer redisClient.Close()

t.Run("ExportReturnsErrorAfterDeletion", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("exportuser_%d", time.Now().UnixNano())
user := testutil.CreateTestUser(t, db, username)

// Create some user data
favoriteRepo := repository.NewFavoriteRepository(db.Pool)
clipRepo := repository.NewClipRepository(db.Pool)

// Create a test clip to favorite
clip := &models.Clip{
ID:              uuid.New(),
TwitchClipID:    fmt.Sprintf("testclip_%d", time.Now().UnixNano()),
TwitchClipURL:   "https://clips.twitch.tv/testclip",
BroadcasterName: "testbroadcaster",
CreatorName:     "testcreator",
Title:           "Test Clip",
CreatedAt:       time.Now(),
}
err := clipRepo.Create(ctx, clip)
require.NoError(t, err)

// Add favorite
favorite := &models.Favorite{
ID:        uuid.New(),
UserID:    user.ID,
ClipID:    clip.ID,
CreatedAt: time.Now(),
}
err = favoriteRepo.Add(ctx, favorite)
require.NoError(t, err)

// Export before deletion should succeed
exportData, err := userSettingsService.ExportUserData(ctx, user.ID)
require.NoError(t, err)
assert.NotEmpty(t, exportData)

// Hard delete the user
err = hardDeleteUser(ctx, db, user.ID)
require.NoError(t, err)

// Export after deletion should fail (user not found)
_, err = userSettingsService.ExportUserData(ctx, user.ID)
assert.Error(t, err)
})
}

// TestScheduledDeletionExecution tests the execution of scheduled deletions
func TestScheduledDeletionExecution(t *testing.T) {
db, redisClient, userSettingsService, _ := setupGDPRTest(t)
defer db.Close()
defer redisClient.Close()

t.Run("ExecutesScheduledDeletions", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("scheduled_%d", time.Now().UnixNano())
user := testutil.CreateTestUser(t, db, username)

accountDeletionRepo := repository.NewAccountDeletionRepository(db.Pool)
userRepo := repository.NewUserRepository(db.Pool)

// Request deletion with immediate schedule (for testing)
deletion := &models.AccountDeletion{
ID:           uuid.New(),
UserID:       user.ID,
ScheduledFor: time.Now().Add(-1 * time.Hour), // Past time, ready for execution
}
err := accountDeletionRepo.Create(ctx, deletion)
require.NoError(t, err)

// Get scheduled deletions
scheduledDeletions, err := accountDeletionRepo.GetScheduledDeletions(ctx)
require.NoError(t, err)
assert.NotEmpty(t, scheduledDeletions)

// Find our deletion in the list
var ourDeletion *models.AccountDeletion
for _, d := range scheduledDeletions {
if d.UserID == user.ID {
ourDeletion = d
break
}
}
require.NotNil(t, ourDeletion)

// Execute hard delete
err = hardDeleteUser(ctx, db, user.ID)
require.NoError(t, err)

// Mark deletion as completed
err = accountDeletionRepo.MarkCompleted(ctx, deletion.ID)
require.NoError(t, err)

// Verify user is deleted
_, err = userRepo.GetByID(ctx, user.ID)
assert.Error(t, err)
assert.Equal(t, repository.ErrUserNotFound, err)

// Verify deletion is marked as completed
var completedAt *time.Time
err = db.Pool.QueryRow(ctx, "SELECT completed_at FROM account_deletions WHERE id = $1", deletion.ID).Scan(&completedAt)
require.NoError(t, err)
assert.NotNil(t, completedAt)
})

t.Run("DoesNotExecuteUnscheduledDeletions", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("unscheduled_%d", time.Now().UnixNano())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

accountDeletionRepo := repository.NewAccountDeletionRepository(db.Pool)

// Request deletion with future schedule
_, err := userSettingsService.RequestAccountDeletion(ctx, user.ID, nil)
require.NoError(t, err)

// Get scheduled deletions (should not include future ones)
scheduledDeletions, err := accountDeletionRepo.GetScheduledDeletions(ctx)
require.NoError(t, err)

// Our deletion should not be in the list (scheduled for future)
for _, d := range scheduledDeletions {
assert.NotEqual(t, user.ID, d.UserID, "Future deletion should not be in scheduled list")
}
})

t.Run("DoesNotExecuteCancelledDeletions", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("cancelled_%d", time.Now().UnixNano())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

accountDeletionRepo := repository.NewAccountDeletionRepository(db.Pool)

// Request and cancel deletion with past schedule
deletion := &models.AccountDeletion{
ID:           uuid.New(),
UserID:       user.ID,
ScheduledFor: time.Now().Add(-1 * time.Hour),
}
err := accountDeletionRepo.Create(ctx, deletion)
require.NoError(t, err)

err = accountDeletionRepo.Cancel(ctx, deletion.ID)
require.NoError(t, err)

// Get scheduled deletions (should not include cancelled ones)
scheduledDeletions, err := accountDeletionRepo.GetScheduledDeletions(ctx)
require.NoError(t, err)

// Our deletion should not be in the list (cancelled)
for _, d := range scheduledDeletions {
assert.NotEqual(t, user.ID, d.UserID, "Cancelled deletion should not be in scheduled list")
}
})
}

// TestNegativeFlows tests error cases and edge conditions
func TestNegativeFlows(t *testing.T) {
db, redisClient, userSettingsService, _ := setupGDPRTest(t)
defer db.Close()
defer redisClient.Close()

t.Run("RequestDeletionForNonExistentUser", func(t *testing.T) {
ctx := context.Background()
nonExistentID := uuid.New()

_, err := userSettingsService.RequestAccountDeletion(ctx, nonExistentID, nil)
assert.Error(t, err)
})

t.Run("CancelNonExistentDeletion", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("nocancel_%d", time.Now().UnixNano())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

err := userSettingsService.CancelAccountDeletion(ctx, user.ID)
assert.Error(t, err)
assert.Contains(t, err.Error(), "no pending")
})

t.Run("ExportDataForDeletedUser", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("exportdeleted_%d", time.Now().UnixNano())
user := testutil.CreateTestUser(t, db, username)

// Delete user
err := hardDeleteUser(ctx, db, user.ID)
require.NoError(t, err)

// Try to export
_, err = userSettingsService.ExportUserData(ctx, user.ID)
assert.Error(t, err)
})
}
