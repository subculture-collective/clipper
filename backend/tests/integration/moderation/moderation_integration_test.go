//go:build integration

package moderation

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// testContext holds test dependencies
type testContext struct {
	DB                *database.DB
	RedisClient       *redispkg.Client
	ModerationService *services.ModerationService
	CommunityRepo     *repository.CommunityRepository
	UserRepo          *repository.UserRepository
	AuditLogRepo      *repository.AuditLogRepository
}

// setupTestContext initializes test dependencies
func setupTestContext(t *testing.T) *testContext {
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
	}

	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err, "Failed to connect to test database")

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err, "Failed to connect to test Redis")

	// Initialize repositories
	communityRepo := repository.NewCommunityRepository(db.Pool)
	userRepo := repository.NewUserRepository(db.Pool)
	auditLogRepo := repository.NewAuditLogRepository(db.Pool)

	// Initialize moderation service
	moderationService := services.NewModerationService(db.Pool, communityRepo, userRepo, auditLogRepo)

	return &testContext{
		DB:                db,
		RedisClient:       redisClient,
		ModerationService: moderationService,
		CommunityRepo:     communityRepo,
		UserRepo:          userRepo,
		AuditLogRepo:      auditLogRepo,
	}
}

// cleanup cleans up test resources
func (tc *testContext) cleanup() {
	if tc.DB != nil {
		tc.DB.Close()
	}
	if tc.RedisClient != nil {
		tc.RedisClient.Close()
	}
}

// createTestCommunity creates a test community with owner
func createTestCommunity(t *testing.T, ctx *testContext, ownerID uuid.UUID) *models.Community {
	timestamp := time.Now().Unix()
	description := "Test community for moderation tests"
	community := &models.Community{
		ID:          uuid.New(),
		Name:        fmt.Sprintf("Test Community %d", timestamp),
		Slug:        fmt.Sprintf("test-community-%d", timestamp),
		Description: &description,
		OwnerID:     ownerID,
		IsPublic:    true,
		MemberCount: 0,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err := ctx.CommunityRepo.CreateCommunity(context.Background(), community)
	require.NoError(t, err, "Failed to create test community")

	return community
}

// createTestModerator creates a test user with moderator privileges
func createTestModerator(t *testing.T, ctx *testContext, accountType string, scope string, channels []uuid.UUID) *models.User {
	username := fmt.Sprintf("moderator_%d", time.Now().UnixNano())
	user := testutil.CreateTestUser(t, ctx.DB, username)

	// Update user to be a moderator
	query := `UPDATE users SET account_type = $1, moderator_scope = $2, moderation_channels = $3 WHERE id = $4`
	_, err := ctx.DB.Pool.Exec(context.Background(), query, accountType, scope, channels, user.ID)
	require.NoError(t, err, "Failed to update user to moderator")

	// Refetch user to get updated fields
	updatedUser, err := ctx.UserRepo.GetByID(context.Background(), user.ID)
	require.NoError(t, err, "Failed to fetch updated user")

	return updatedUser
}

// addCommunityMember adds a user as a member to a community
func addCommunityMember(t *testing.T, ctx *testContext, communityID, userID uuid.UUID, role string) {
	query := `INSERT INTO community_members (id, community_id, user_id, role, joined_at) VALUES ($1, $2, $3, $4, $5)`
	_, err := ctx.DB.Pool.Exec(context.Background(), query, uuid.New(), communityID, userID, role, time.Now())
	require.NoError(t, err, "Failed to add community member")
}

// cleanupTestData removes test data from database
func cleanupTestData(t *testing.T, ctx *testContext, communityIDs []uuid.UUID, userIDs []uuid.UUID) {
	ctxBg := context.Background()

	// Delete bans
	for _, communityID := range communityIDs {
		_, _ = ctx.DB.Pool.Exec(ctxBg, "DELETE FROM community_bans WHERE community_id = $1", communityID)
	}

	// Delete community members
	for _, communityID := range communityIDs {
		_, _ = ctx.DB.Pool.Exec(ctxBg, "DELETE FROM community_members WHERE community_id = $1", communityID)
	}

	// Delete communities
	for _, communityID := range communityIDs {
		_, _ = ctx.DB.Pool.Exec(ctxBg, "DELETE FROM communities WHERE id = $1", communityID)
	}

	// Delete users
	for _, userID := range userIDs {
		testutil.CleanupTestUser(t, ctx.DB, userID)
	}
}

// ==============================================================================
// Complete Workflow Tests
// ==============================================================================

func TestModerationWorkflow_CompleteFlow(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	// Create test data
	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, siteModerator.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("BanUser_Success", func(t *testing.T) {
		reason := "Test ban reason"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, siteModerator.ID, targetUser.ID, &reason)
		require.NoError(t, err, "Ban user should succeed")

		// Verify ban exists in database
		isBanned, err := ctx.CommunityRepo.IsBanned(ctxBg, community.ID, targetUser.ID)
		require.NoError(t, err)
		assert.True(t, isBanned, "User should be banned")
	})

	t.Run("ListBans_Success", func(t *testing.T) {
		bans, total, err := ctx.ModerationService.GetBans(ctxBg, community.ID, siteModerator.ID, 1, 20)
		require.NoError(t, err, "List bans should succeed")
		assert.Equal(t, 1, total, "Should have 1 ban")
		assert.Len(t, bans, 1, "Should return 1 ban")
		assert.Equal(t, targetUser.ID, bans[0].BannedUserID, "Banned user ID should match")
		assert.NotNil(t, bans[0].Reason, "Ban reason should be set")
		assert.Equal(t, "Test ban reason", *bans[0].Reason, "Ban reason should match")
	})

	t.Run("UnbanUser_Success", func(t *testing.T) {
		err := ctx.ModerationService.UnbanUser(ctxBg, community.ID, siteModerator.ID, targetUser.ID)
		require.NoError(t, err, "Unban user should succeed")

		// Verify ban removed from database
		isBanned, err := ctx.CommunityRepo.IsBanned(ctxBg, community.ID, targetUser.ID)
		require.NoError(t, err)
		assert.False(t, isBanned, "User should not be banned")
	})

	t.Run("ListBans_AfterUnban", func(t *testing.T) {
		bans, total, err := ctx.ModerationService.GetBans(ctxBg, community.ID, siteModerator.ID, 1, 20)
		require.NoError(t, err, "List bans should succeed")
		assert.Equal(t, 0, total, "Should have 0 bans after unban")
		assert.Len(t, bans, 0, "Should return 0 bans")
	})
}

// ==============================================================================
// Permission Boundary Tests
// ==============================================================================

func TestModerationPermissions_SiteModerator(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, siteModerator.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("SiteModerator_CanBanInAnyCommunity", func(t *testing.T) {
		reason := "Site moderator ban"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, siteModerator.ID, targetUser.ID, &reason)
		assert.NoError(t, err, "Site moderator should be able to ban in any community")

		// Cleanup
		_ = ctx.CommunityRepo.UnbanMember(ctxBg, community.ID, targetUser.ID)
	})

	t.Run("SiteModerator_CanListBans", func(t *testing.T) {
		bans, _, err := ctx.ModerationService.GetBans(ctxBg, community.ID, siteModerator.ID, 1, 20)
		assert.NoError(t, err, "Site moderator should be able to list bans")
		assert.NotNil(t, bans)
	})
}

func TestModerationPermissions_CommunityModerator(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	// Create community moderator authorized for this community
	authorizedModerator := createTestModerator(t, ctx, models.AccountTypeCommunityModerator, models.ModeratorScopeCommunity, []uuid.UUID{community.ID})
	addCommunityMember(t, ctx, community.ID, authorizedModerator.ID, models.CommunityRoleMod)

	// Create community moderator NOT authorized for this community
	otherCommunity := createTestCommunity(t, ctx, owner.ID)
	unauthorizedModerator := createTestModerator(t, ctx, models.AccountTypeCommunityModerator, models.ModeratorScopeCommunity, []uuid.UUID{otherCommunity.ID})

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID, otherCommunity.ID}, []uuid.UUID{owner.ID, authorizedModerator.ID, unauthorizedModerator.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("AuthorizedCommunityModerator_CanBan", func(t *testing.T) {
		reason := "Community moderator ban"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, authorizedModerator.ID, targetUser.ID, &reason)
		assert.NoError(t, err, "Authorized community moderator should be able to ban")

		// Cleanup
		_ = ctx.CommunityRepo.UnbanMember(ctxBg, community.ID, targetUser.ID)
	})

	t.Run("UnauthorizedCommunityModerator_CannotBan", func(t *testing.T) {
		reason := "Unauthorized ban attempt"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, unauthorizedModerator.ID, targetUser.ID, &reason)
		assert.Error(t, err, "Unauthorized community moderator should not be able to ban")
		assert.Equal(t, services.ErrModerationNotAuthorized, err, "Should return not authorized error")
	})
}

func TestModerationPermissions_RegularUser(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	regularUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("regular_%d", time.Now().UnixNano()))
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, regularUser.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("RegularUser_CannotBan", func(t *testing.T) {
		reason := "Unauthorized ban"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, regularUser.ID, targetUser.ID, &reason)
		assert.Error(t, err, "Regular user should not be able to ban")
		assert.Equal(t, services.ErrModerationPermissionDenied, err, "Should return permission denied error")
	})

	t.Run("RegularUser_CannotListBans", func(t *testing.T) {
		_, _, err := ctx.ModerationService.GetBans(ctxBg, community.ID, regularUser.ID, 1, 20)
		assert.Error(t, err, "Regular user should not be able to list bans")
		assert.Equal(t, services.ErrModerationPermissionDenied, err, "Should return permission denied error")
	})
}

func TestModerationPermissions_AdminUser(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	adminUser := testutil.CreateTestUserWithRole(t, ctx.DB, fmt.Sprintf("admin_%d", time.Now().UnixNano()), models.RoleAdmin)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, adminUser.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("Admin_CanBanInAnyCommunity", func(t *testing.T) {
		reason := "Admin ban"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, adminUser.ID, targetUser.ID, &reason)
		assert.NoError(t, err, "Admin should be able to ban in any community")

		// Cleanup
		_ = ctx.CommunityRepo.UnbanMember(ctxBg, community.ID, targetUser.ID)
	})
}

// ==============================================================================
// Error Cases and Constraints
// ==============================================================================

func TestModerationConstraints_CannotBanOwner(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, siteModerator.ID})

	ctxBg := context.Background()

	t.Run("CannotBanCommunityOwner", func(t *testing.T) {
		reason := "Attempting to ban owner"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, siteModerator.ID, owner.ID, &reason)
		assert.Error(t, err, "Should not be able to ban community owner")
		assert.Equal(t, services.ErrModerationCannotBanOwner, err, "Should return cannot ban owner error")
	})
}

func TestModerationConstraints_UnbanNonBannedUser(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, siteModerator.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("UnbanUserNotBanned", func(t *testing.T) {
		err := ctx.ModerationService.UnbanUser(ctxBg, community.ID, siteModerator.ID, targetUser.ID)
		assert.Error(t, err, "Should error when unbanning user that is not banned")
		assert.Equal(t, services.ErrModerationNotBanned, err, "Should return not banned error")
	})
}

func TestModerationConstraints_UpdateBan(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, siteModerator.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("UpdateBan_Success", func(t *testing.T) {
		// First ban the user
		originalReason := "Original ban reason"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, siteModerator.ID, targetUser.ID, &originalReason)
		require.NoError(t, err)

		// Update the ban reason
		newReason := "Updated ban reason"
		err = ctx.ModerationService.UpdateBan(ctxBg, community.ID, siteModerator.ID, targetUser.ID, &newReason)
		require.NoError(t, err, "Update ban should succeed")

		// Verify the ban still exists with updated reason
		bans, total, err := ctx.ModerationService.GetBans(ctxBg, community.ID, siteModerator.ID, 1, 20)
		require.NoError(t, err)
		assert.Equal(t, 1, total, "Should still have 1 ban")
		assert.Len(t, bans, 1)
		assert.NotNil(t, bans[0].Reason)
		assert.Equal(t, newReason, *bans[0].Reason, "Ban reason should be updated")

		// Cleanup
		_ = ctx.CommunityRepo.UnbanMember(ctxBg, community.ID, targetUser.ID)
	})

	t.Run("UpdateBan_UserNotBanned", func(t *testing.T) {
		// Try to update ban for user that isn't banned
		unbannedUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("unbanned_%d", time.Now().UnixNano()))
		defer testutil.CleanupTestUser(t, ctx.DB, unbannedUser.ID)

		newReason := "Should not work"
		err := ctx.ModerationService.UpdateBan(ctxBg, community.ID, siteModerator.ID, unbannedUser.ID, &newReason)
		assert.Error(t, err, "Should error when updating ban for non-banned user")
	})
}

// ==============================================================================
// Audit Logging Tests
// ==============================================================================

func TestModerationAuditLog_BanUser(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, siteModerator.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("BanCreatesAuditLog", func(t *testing.T) {
		reason := "Test ban for audit log"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, siteModerator.ID, targetUser.ID, &reason)
		require.NoError(t, err)

		// Query audit logs
		filters := repository.AuditLogFilters{
			Action:      "ban_user",
			ModeratorID: &siteModerator.ID,
		}
		logs, total, err := ctx.AuditLogRepo.List(ctxBg, filters, 1, 10)
		require.NoError(t, err, "Failed to fetch audit logs")
		assert.Greater(t, total, 0, "Should have at least one audit log")
		
		// Find the specific log for this ban
		var banLog *models.ModerationAuditLogWithUser
		for _, log := range logs {
			if log.Action == "ban_user" && log.Metadata != nil {
				if communityID, ok := log.Metadata["community_id"].(string); ok && communityID == community.ID.String() {
					banLog = log
					break
				}
			}
		}

		require.NotNil(t, banLog, "Should have audit log for ban action")
		assert.Equal(t, "ban_user", banLog.Action)
		assert.Equal(t, "community_ban", banLog.EntityType)
		assert.Equal(t, siteModerator.ID, banLog.ModeratorID)
		assert.NotNil(t, banLog.Reason)
		assert.Equal(t, reason, *banLog.Reason)
		assert.NotNil(t, banLog.Metadata)
		assert.Equal(t, community.ID.String(), banLog.Metadata["community_id"])
		assert.Equal(t, targetUser.ID.String(), banLog.Metadata["banned_user_id"])

		// Cleanup
		_ = ctx.CommunityRepo.UnbanMember(ctxBg, community.ID, targetUser.ID)
	})
}

func TestModerationAuditLog_UnbanUser(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, siteModerator.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("UnbanCreatesAuditLog", func(t *testing.T) {
		// First ban the user
		reason := "Test ban before unban"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, siteModerator.ID, targetUser.ID, &reason)
		require.NoError(t, err)

		// Now unban
		err = ctx.ModerationService.UnbanUser(ctxBg, community.ID, siteModerator.ID, targetUser.ID)
		require.NoError(t, err)

		// Query audit logs for unban action
		filters := repository.AuditLogFilters{
			Action:      "unban_user",
			ModeratorID: &siteModerator.ID,
		}
		logs, total, err := ctx.AuditLogRepo.List(ctxBg, filters, 1, 10)
		require.NoError(t, err, "Failed to fetch audit logs")
		assert.Greater(t, total, 0, "Should have at least one audit log for unban")

		// Find the specific log for this unban
		var unbanLog *models.ModerationAuditLogWithUser
		for _, log := range logs {
			if log.Action == "unban_user" && log.Metadata != nil {
				if communityID, ok := log.Metadata["community_id"].(string); ok && communityID == community.ID.String() {
					unbanLog = log
					break
				}
			}
		}

		require.NotNil(t, unbanLog, "Should have audit log for unban action")
		assert.Equal(t, "unban_user", unbanLog.Action)
		assert.Equal(t, siteModerator.ID, unbanLog.ModeratorID)
		assert.NotNil(t, unbanLog.Metadata)
		assert.Equal(t, community.ID.String(), unbanLog.Metadata["community_id"])
		assert.Equal(t, targetUser.ID.String(), unbanLog.Metadata["banned_user_id"])
	})
}

// ==============================================================================
// Data Persistence Tests
// ==============================================================================

func TestModerationPersistence_BanSurvivesServiceRestart(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, siteModerator.ID, targetUser.ID})

	ctxBg := context.Background()

	// Create a ban
	reason := "Persistent ban"
	err := ctx.ModerationService.BanUser(ctxBg, community.ID, siteModerator.ID, targetUser.ID, &reason)
	require.NoError(t, err)

	// Simulate service restart by creating a new service instance
	newService := services.NewModerationService(ctx.DB.Pool, ctx.CommunityRepo, ctx.UserRepo, ctx.AuditLogRepo)

	// Verify ban still exists via new service
	bans, total, err := newService.GetBans(ctxBg, community.ID, siteModerator.ID, 1, 20)
	require.NoError(t, err)
	assert.Equal(t, 1, total, "Ban should persist after service restart")
	assert.Len(t, bans, 1)
	assert.Equal(t, targetUser.ID, bans[0].BannedUserID)

	// Cleanup
	_ = ctx.CommunityRepo.UnbanMember(ctxBg, community.ID, targetUser.ID)
}

// ==============================================================================
// Pagination Tests
// ==============================================================================

func TestModerationPagination_ListBans(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	community := createTestCommunity(t, ctx, owner.ID)

	// Create multiple banned users
	users := make([]*models.User, 5)
	for i := 0; i < 5; i++ {
		users[i] = testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d_%d", time.Now().UnixNano(), i))
		reason := fmt.Sprintf("Ban reason %d", i)
		err := ctx.ModerationService.BanUser(context.Background(), community.ID, siteModerator.ID, users[i].ID, &reason)
		require.NoError(t, err)
	}

	userIDs := []uuid.UUID{owner.ID, siteModerator.ID}
	for _, user := range users {
		userIDs = append(userIDs, user.ID)
	}
	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, userIDs)

	ctxBg := context.Background()

	t.Run("Pagination_FirstPage", func(t *testing.T) {
		bans, total, err := ctx.ModerationService.GetBans(ctxBg, community.ID, siteModerator.ID, 1, 3)
		require.NoError(t, err)
		assert.Equal(t, 5, total, "Total should be 5")
		assert.Len(t, bans, 3, "Should return 3 bans on first page")
	})

	t.Run("Pagination_SecondPage", func(t *testing.T) {
		bans, total, err := ctx.ModerationService.GetBans(ctxBg, community.ID, siteModerator.ID, 2, 3)
		require.NoError(t, err)
		assert.Equal(t, 5, total, "Total should be 5")
		assert.Len(t, bans, 2, "Should return 2 bans on second page")
	})
}

// ==============================================================================
// Database Constraint Tests
// ==============================================================================

func TestModerationConstraints_ForeignKeys(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%d", time.Now().UnixNano()))
	community := createTestCommunity(t, ctx, owner.ID)

	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, siteModerator.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("CannotBanWithInvalidCommunity", func(t *testing.T) {
		invalidCommunityID := uuid.New()
		reason := "Ban in non-existent community"
		err := ctx.ModerationService.BanUser(ctxBg, invalidCommunityID, siteModerator.ID, targetUser.ID, &reason)
		assert.Error(t, err, "Should error when community doesn't exist")
	})

	t.Run("CannotBanNonExistentUser", func(t *testing.T) {
		invalidUserID := uuid.New()
		reason := "Ban non-existent user"
		// This will fail at the foreign key constraint when trying to insert into community_bans
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, siteModerator.ID, invalidUserID, &reason)
		assert.Error(t, err, "Should error when target user doesn't exist")
	})
}

// ==============================================================================
// Concurrent Access Tests
// ==============================================================================

func TestModerationConcurrency_MultipleBans(t *testing.T) {
	ctx := setupTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%d", time.Now().UnixNano()))
	siteModerator := createTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	community := createTestCommunity(t, ctx, owner.ID)

	// Create multiple users to ban concurrently
	users := make([]*models.User, 3)
	for i := 0; i < 3; i++ {
		users[i] = testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("concurrent_%d_%d", time.Now().UnixNano(), i))
	}

	userIDs := []uuid.UUID{owner.ID, siteModerator.ID}
	for _, user := range users {
		userIDs = append(userIDs, user.ID)
	}
	defer cleanupTestData(t, ctx, []uuid.UUID{community.ID}, userIDs)

	// Ban users concurrently
	done := make(chan bool, len(users))
	for i, user := range users {
		go func(idx int, u *models.User) {
			reason := fmt.Sprintf("Concurrent ban %d", idx)
			err := ctx.ModerationService.BanUser(context.Background(), community.ID, siteModerator.ID, u.ID, &reason)
			assert.NoError(t, err, "Concurrent ban should succeed")
			done <- true
		}(i, user)
	}

	// Wait for all goroutines to complete
	for i := 0; i < len(users); i++ {
		<-done
	}

	// Verify all bans were created
	bans, total, err := ctx.ModerationService.GetBans(context.Background(), community.ID, siteModerator.ID, 1, 20)
	require.NoError(t, err)
	assert.Equal(t, 3, total, "Should have 3 bans from concurrent operations")
	assert.Len(t, bans, 3)
}
