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
"github.com/subculture-collective/clipper/internal/services"
"github.com/subculture-collective/clipper/pkg/database"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// TestAccountDeletionRequest tests the initial deletion request with grace period
func TestAccountDeletionRequest(t *testing.T) {
db, redisClient, userSettingsService, auditLogRepo := setupGDPRTest(t)
defer db.Close()
defer redisClient.Close()

t.Run("CreatesDeletionWithGracePeriod", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("deleteuser_%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

reason := "No longer need the service"
deletion, err := userSettingsService.RequestAccountDeletion(ctx, user.ID, &reason)
require.NoError(t, err)
require.NotNil(t, deletion)

// Verify deletion is scheduled 30 days in the future
expectedScheduledFor := time.Now().Add(30 * 24 * time.Hour)
assert.WithinDuration(t, expectedScheduledFor, deletion.ScheduledFor, 5*time.Second)
assert.Equal(t, user.ID, deletion.UserID)
assert.Equal(t, reason, *deletion.Reason)
assert.False(t, deletion.IsCancelled)
assert.Nil(t, deletion.CompletedAt)

// Verify audit log entry
logs, err := auditLogRepo.GetByEntityID(ctx, user.ID, "user", 10, 0)
require.NoError(t, err)
assert.NotEmpty(t, logs)

found := false
for _, log := range logs {
if log.Action == "account_deletion_requested" {
found = true
assert.Equal(t, user.ID, log.EntityID)
assert.Equal(t, user.ID, log.ModeratorID)
break
}
}
assert.True(t, found, "Expected account_deletion_requested audit log entry")
})

t.Run("PreventsDuplicateRequests", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("deleteuser_%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

// First request should succeed
_, err := userSettingsService.RequestAccountDeletion(ctx, user.ID, nil)
require.NoError(t, err)

// Second request should fail
_, err = userSettingsService.RequestAccountDeletion(ctx, user.ID, nil)
assert.Error(t, err)
assert.Contains(t, err.Error(), "already requested")
})

t.Run("AllowsNewRequestAfterCancellation", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("deleteuser_%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

// Request deletion
_, err := userSettingsService.RequestAccountDeletion(ctx, user.ID, nil)
require.NoError(t, err)

// Cancel deletion
err = userSettingsService.CancelAccountDeletion(ctx, user.ID)
require.NoError(t, err)

// New request should succeed after cancellation
reason := "Changed my mind again"
deletion, err := userSettingsService.RequestAccountDeletion(ctx, user.ID, &reason)
require.NoError(t, err)
assert.NotNil(t, deletion)
assert.Equal(t, reason, *deletion.Reason)
})
}

// TestAccountDeletionCancellation tests the cancellation flow
func TestAccountDeletionCancellation(t *testing.T) {
db, redisClient, userSettingsService, auditLogRepo := setupGDPRTest(t)
defer db.Close()
defer redisClient.Close()

t.Run("CancelsPendingDeletion", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("canceluser_%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

// Request deletion
deletion, err := userSettingsService.RequestAccountDeletion(ctx, user.ID, nil)
require.NoError(t, err)
require.NotNil(t, deletion)

// Cancel deletion
err = userSettingsService.CancelAccountDeletion(ctx, user.ID)
require.NoError(t, err)

// Verify no pending deletion
pending, err := userSettingsService.GetPendingDeletion(ctx, user.ID)
require.NoError(t, err)
assert.Nil(t, pending)

// Verify audit log entry
logs, err := auditLogRepo.GetByEntityID(ctx, user.ID, "user", 10, 0)
require.NoError(t, err)

found := false
for _, log := range logs {
if log.Action == "account_deletion_cancelled" {
found = true
assert.Equal(t, user.ID, log.EntityID)
break
}
}
assert.True(t, found, "Expected account_deletion_cancelled audit log entry")
})

t.Run("ErrorsWhenNoPendingDeletion", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("nodeleteuser_%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

// Try to cancel without pending deletion
err := userSettingsService.CancelAccountDeletion(ctx, user.ID)
assert.Error(t, err)
assert.Contains(t, err.Error(), "no pending")
})

t.Run("RestoresAccountAccess", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("restoreuser_%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

userRepo := repository.NewUserRepository(testConfig.DB.Pool)

// Request deletion
_, err := userSettingsService.RequestAccountDeletion(ctx, user.ID, nil)
require.NoError(t, err)

// Cancel deletion
err = userSettingsService.CancelAccountDeletion(ctx, user.ID)
require.NoError(t, err)

// Verify user can still be accessed (not deleted)
fetchedUser, err := userRepo.GetByID(ctx, user.ID)
require.NoError(t, err)
assert.Equal(t, user.ID, fetchedUser.ID)
assert.Equal(t, user.Username, fetchedUser.Username)
})
}

// TestAccountDeletionGracePeriod tests behavior during grace period
func TestAccountDeletionGracePeriod(t *testing.T) {
db, redisClient, userSettingsService, _ := setupGDPRTest(t)
defer db.Close()
defer redisClient.Close()

t.Run("UserDataRemainsAccessibleDuringGrace", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("graceuser_%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

userRepo := repository.NewUserRepository(testConfig.DB.Pool)

// Request deletion
_, err := userSettingsService.RequestAccountDeletion(ctx, user.ID, nil)
require.NoError(t, err)

// Verify user data is still accessible during grace period
fetchedUser, err := userRepo.GetByID(ctx, user.ID)
require.NoError(t, err)
assert.Equal(t, user.ID, fetchedUser.ID)
assert.NotNil(t, fetchedUser.Email)

// Verify can export data during grace period
exportData, err := userSettingsService.ExportUserData(ctx, user.ID)
require.NoError(t, err)
assert.NotEmpty(t, exportData)
})

t.Run("GetDeletionStatusReturnsPendingInfo", func(t *testing.T) {
ctx := context.Background()
username := fmt.Sprintf("statususer_%d", time.Now().Unix())
user := testutil.CreateTestUser(t, db, username)
defer testutil.CleanupTestUser(t, db, user.ID)

// No pending deletion initially
pending, err := userSettingsService.GetPendingDeletion(ctx, user.ID)
require.NoError(t, err)
assert.Nil(t, pending)

// Request deletion
deletion, err := userSettingsService.RequestAccountDeletion(ctx, user.ID, nil)
require.NoError(t, err)

// Get deletion status
pending, err = userSettingsService.GetPendingDeletion(ctx, user.ID)
require.NoError(t, err)
require.NotNil(t, pending)
assert.Equal(t, deletion.ID, pending.ID)
assert.Equal(t, user.ID, pending.UserID)
assert.False(t, pending.IsCancelled)
assert.Nil(t, pending.CompletedAt)
})
}

// Helper functions

func setupGDPRTest(t *testing.T) (*database.DB, *redispkg.Client, *services.UserSettingsService, *repository.AuditLogRepository) {
testConfig := testutil.SetupTestEnvironment(t)

// Initialize repositories
userRepo := repository.NewUserRepository(testConfig.DB.Pool)
userSettingsRepo := repository.NewUserSettingsRepository(testConfig.DB.Pool)
accountDeletionRepo := repository.NewAccountDeletionRepository(testConfig.DB.Pool)
clipRepo := repository.NewClipRepository(testConfig.DB.Pool)
voteRepo := repository.NewVoteRepository(testConfig.DB.Pool)
favoriteRepo := repository.NewFavoriteRepository(testConfig.DB.Pool)
commentRepo := repository.NewCommentRepository(testConfig.DB.Pool)
submissionRepo := repository.NewSubmissionRepository(testConfig.DB.Pool)
subscriptionRepo := repository.NewSubscriptionRepository(testConfig.DB.Pool)
consentRepo := repository.NewConsentRepository(testConfig.DB.Pool)
auditLogRepo := repository.NewAuditLogRepository(testConfig.DB.Pool)

// Initialize audit log service
auditLogService := services.NewAuditLogService(auditLogRepo)

// Initialize user settings service
userSettingsService := services.NewUserSettingsService(
userRepo,
userSettingsRepo,
accountDeletionRepo,
clipRepo,
voteRepo,
favoriteRepo,
commentRepo,
submissionRepo,
subscriptionRepo,
consentRepo,
auditLogService,
)

return testConfig.DB, testConfig.RedisClient, userSettingsService, auditLogRepo
}

// hardDeleteUser performs a hard delete of a user and all their data
// This is a helper function for testing - in production this would be in a service
func hardDeleteUser(ctx context.Context, db *database.DB, userID uuid.UUID) error {
// In a real implementation, this would:
// 1. Delete/anonymize user-owned resources
// 2. Remove authentication tokens (CASCADE)
// 3. Remove user settings (CASCADE)
// 4. Delete the user record
// 5. Log audit event

// For now, we rely on CASCADE deletes in the database schema
// Most foreign keys are set with ON DELETE CASCADE
_, err := testConfig.DB.Pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
return err
}
