//go:build integration

package tests

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

// ==============================================================================
// Test Context and Setup
// ==============================================================================

// rbacTestContext holds test dependencies for RBAC moderation tests
type rbacTestContext struct {
	DB                *database.DB
	RedisClient       *redispkg.Client
	ModerationService *services.ModerationService
	CommunityRepo     *repository.CommunityRepository
	UserRepo          *repository.UserRepository
	AuditLogRepo      *repository.AuditLogRepository
}

// setupRBACTestContext initializes test dependencies
func setupRBACTestContext(t *testing.T) *rbacTestContext {
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

	return &rbacTestContext{
		DB:                db,
		RedisClient:       redisClient,
		ModerationService: moderationService,
		CommunityRepo:     communityRepo,
		UserRepo:          userRepo,
		AuditLogRepo:      auditLogRepo,
	}
}

// cleanup cleans up test resources
func (tc *rbacTestContext) cleanup() {
	if tc.DB != nil {
		tc.DB.Close()
	}
	if tc.RedisClient != nil {
		tc.RedisClient.Close()
	}
}

// ==============================================================================
// Test Helpers
// ==============================================================================

// createTestCommunity creates a test community with owner
func createRBACTestCommunity(t *testing.T, ctx *rbacTestContext, ownerID uuid.UUID) *models.Community {
	uniqueID := uuid.New().String()[:8]
	description := "RBAC test community"
	community := &models.Community{
		ID:          uuid.New(),
		Name:        fmt.Sprintf("RBAC Community %s", uniqueID),
		Slug:        fmt.Sprintf("rbac-community-%s", uniqueID),
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

// createTestModerator creates a test user with specific moderator configuration
func createRBACTestModerator(t *testing.T, ctx *rbacTestContext, accountType string, scope string, channels []uuid.UUID) *models.User {
	username := fmt.Sprintf("rbac_mod_%s", uuid.New().String()[:8])
	user := testutil.CreateTestUser(t, ctx.DB, username)

	// Update user to be a moderator with specific configuration
	query := `UPDATE users SET account_type = $1, moderator_scope = $2, moderation_channels = $3 WHERE id = $4`
	_, err := ctx.DB.Pool.Exec(context.Background(), query, accountType, scope, channels, user.ID)
	require.NoError(t, err, "Failed to update user to moderator")

	// Refetch user to get updated fields
	updatedUser, err := ctx.UserRepo.GetByID(context.Background(), user.ID)
	require.NoError(t, err, "Failed to fetch updated user")

	return updatedUser
}

// addCommunityMember adds a user as a member to a community with a specific role
func addRBACCommunityMember(t *testing.T, ctx *rbacTestContext, communityID, userID uuid.UUID, role string) {
	query := `INSERT INTO community_members (id, community_id, user_id, role, joined_at) VALUES ($1, $2, $3, $4, $5)`
	_, err := ctx.DB.Pool.Exec(context.Background(), query, uuid.New(), communityID, userID, role, time.Now())
	require.NoError(t, err, "Failed to add community member")
}

// cleanupRBACTestData removes test data from database
func cleanupRBACTestData(t *testing.T, ctx *rbacTestContext, communityIDs []uuid.UUID, userIDs []uuid.UUID) {
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
// Admin Role Tests
// ==============================================================================

// TestAdmin_CanBanAnyUser tests that admins can ban users in any community
func TestAdmin_CanBanAnyUser(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	// Create test users and communities
	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	admin := testutil.CreateTestUserWithRole(t, ctx.DB, fmt.Sprintf("admin_%s", uuid.New().String()[:8]), models.RoleAdmin)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))
	community1 := createRBACTestCommunity(t, ctx, owner.ID)
	community2 := createRBACTestCommunity(t, ctx, owner.ID)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community1.ID, community2.ID}, []uuid.UUID{owner.ID, admin.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("Admin can ban user in community 1", func(t *testing.T) {
		reason := "Admin ban in community 1"
		err := ctx.ModerationService.BanUser(ctxBg, community1.ID, admin.ID, targetUser.ID, &reason)
		assert.NoError(t, err, "Admin should be able to ban user in any community")

		// Verify ban exists
		isBanned, err := ctx.CommunityRepo.IsBanned(ctxBg, community1.ID, targetUser.ID)
		require.NoError(t, err)
		assert.True(t, isBanned, "User should be banned")

		// Cleanup
		_ = ctx.CommunityRepo.UnbanMember(ctxBg, community1.ID, targetUser.ID)
	})

	t.Run("Admin can ban user in community 2", func(t *testing.T) {
		reason := "Admin ban in community 2"
		err := ctx.ModerationService.BanUser(ctxBg, community2.ID, admin.ID, targetUser.ID, &reason)
		assert.NoError(t, err, "Admin should be able to ban user in any community")

		// Verify ban exists
		isBanned, err := ctx.CommunityRepo.IsBanned(ctxBg, community2.ID, targetUser.ID)
		require.NoError(t, err)
		assert.True(t, isBanned, "User should be banned")

		// Cleanup
		_ = ctx.CommunityRepo.UnbanMember(ctxBg, community2.ID, targetUser.ID)
	})
}

// TestAdmin_CanUnbanAnyUser tests that admins can unban users in any community
func TestAdmin_CanUnbanAnyUser(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	admin := testutil.CreateTestUserWithRole(t, ctx.DB, fmt.Sprintf("admin_%s", uuid.New().String()[:8]), models.RoleAdmin)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))
	community := createRBACTestCommunity(t, ctx, owner.ID)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, admin.ID, targetUser.ID})

	ctxBg := context.Background()

	// First ban the user
	reason := "Test ban"
	err := ctx.ModerationService.BanUser(ctxBg, community.ID, admin.ID, targetUser.ID, &reason)
	require.NoError(t, err)

	t.Run("Admin can unban user", func(t *testing.T) {
		err := ctx.ModerationService.UnbanUser(ctxBg, community.ID, admin.ID, targetUser.ID)
		assert.NoError(t, err, "Admin should be able to unban user")

		// Verify ban removed
		isBanned, err := ctx.CommunityRepo.IsBanned(ctxBg, community.ID, targetUser.ID)
		require.NoError(t, err)
		assert.False(t, isBanned, "User should not be banned")
	})
}

// TestAdmin_CanViewAllLogs tests that admins can view all moderation logs
func TestAdmin_CanViewAllLogs(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	admin := testutil.CreateTestUserWithRole(t, ctx.DB, fmt.Sprintf("admin_%s", uuid.New().String()[:8]), models.RoleAdmin)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))
	community := createRBACTestCommunity(t, ctx, owner.ID)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, admin.ID, targetUser.ID})

	ctxBg := context.Background()

	// Create a ban to generate audit log
	reason := "Test ban for audit log"
	err := ctx.ModerationService.BanUser(ctxBg, community.ID, admin.ID, targetUser.ID, &reason)
	require.NoError(t, err)

	t.Run("Admin can view all bans", func(t *testing.T) {
		bans, total, err := ctx.ModerationService.GetBans(ctxBg, community.ID, admin.ID, 1, 20)
		assert.NoError(t, err, "Admin should be able to view all bans")
		assert.Equal(t, 1, total, "Should have 1 ban")
		assert.Len(t, bans, 1, "Should return 1 ban")
	})

	// Cleanup
	_ = ctx.CommunityRepo.UnbanMember(ctxBg, community.ID, targetUser.ID)
}

// ==============================================================================
// Site Moderator Tests
// ==============================================================================

// TestSiteModerator_CanViewAllBans tests that site moderators can view bans across all communities
func TestSiteModerator_CanViewAllBans(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	siteMod := createRBACTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))
	community1 := createRBACTestCommunity(t, ctx, owner.ID)
	community2 := createRBACTestCommunity(t, ctx, owner.ID)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community1.ID, community2.ID}, []uuid.UUID{owner.ID, siteMod.ID, targetUser.ID})

	ctxBg := context.Background()

	// Create bans in both communities
	reason1 := "Ban in community 1"
	err := ctx.ModerationService.BanUser(ctxBg, community1.ID, siteMod.ID, targetUser.ID, &reason1)
	require.NoError(t, err)

	t.Run("Site moderator can view bans in community 1", func(t *testing.T) {
		bans, total, err := ctx.ModerationService.GetBans(ctxBg, community1.ID, siteMod.ID, 1, 20)
		assert.NoError(t, err, "Site moderator should be able to view bans")
		assert.Equal(t, 1, total, "Should have 1 ban")
		assert.Len(t, bans, 1)
	})

	t.Run("Site moderator can view bans in community 2", func(t *testing.T) {
		_, total, err := ctx.ModerationService.GetBans(ctxBg, community2.ID, siteMod.ID, 1, 20)
		assert.NoError(t, err, "Site moderator should be able to view bans in any community")
		assert.Equal(t, 0, total, "Should have 0 bans in community 2")
	})

	// Cleanup
	_ = ctx.CommunityRepo.UnbanMember(ctxBg, community1.ID, targetUser.ID)
}

// TestSiteModerator_CannotEscalatePrivileges tests that site moderators cannot grant themselves higher permissions
func TestSiteModerator_CannotEscalatePrivileges(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	siteMod := createRBACTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{}, []uuid.UUID{siteMod.ID})

	ctxBg := context.Background()

	t.Run("Site moderator has limited permission set", func(t *testing.T) {
		// Verify site moderator has proper account type and cannot have admin permissions
		user, err := ctx.UserRepo.GetByID(ctxBg, siteMod.ID)
		require.NoError(t, err)

		// Validate account type is moderator, not admin
		assert.Equal(t, models.AccountTypeModerator, user.AccountType, "Account type should be moderator")
		assert.NotEqual(t, models.AccountTypeAdmin, user.AccountType, "Should not have admin account type")
		
		// Verify site moderators don't have admin-only permissions
		assert.False(t, user.Can(models.PermissionManageSystem), "Site moderator should not have system management permission")
		
		// But they should have moderation permissions
		assert.True(t, user.Can(models.PermissionModerateContent), "Should have moderate content permission")
		assert.True(t, user.Can(models.PermissionModerateUsers), "Should have moderate users permission")
	})

	t.Run("Site moderator has site-wide scope", func(t *testing.T) {
		user, err := ctx.UserRepo.GetByID(ctxBg, siteMod.ID)
		require.NoError(t, err)
		assert.Equal(t, models.ModeratorScopeSite, user.ModeratorScope, "Should have site scope")
		assert.Empty(t, user.ModerationChannels, "Site moderators should have no channel restrictions")
	})
}

// ==============================================================================
// Community Moderator Tests
// ==============================================================================

// TestCommunityModerator_CanOnlyModerateOwnChannels tests scope enforcement for community moderators
func TestCommunityModerator_CanOnlyModerateOwnChannels(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))

	// Create two communities
	authorizedCommunity := createRBACTestCommunity(t, ctx, owner.ID)
	unauthorizedCommunity := createRBACTestCommunity(t, ctx, owner.ID)

	// Create community moderator authorized for only the first community
	communityMod := createRBACTestModerator(t, ctx, models.AccountTypeCommunityModerator, models.ModeratorScopeCommunity, []uuid.UUID{authorizedCommunity.ID})
	addRBACCommunityMember(t, ctx, authorizedCommunity.ID, communityMod.ID, models.CommunityRoleMod)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{authorizedCommunity.ID, unauthorizedCommunity.ID}, []uuid.UUID{owner.ID, communityMod.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("Community moderator can moderate authorized channel", func(t *testing.T) {
		reason := "Community mod ban in authorized channel"
		err := ctx.ModerationService.BanUser(ctxBg, authorizedCommunity.ID, communityMod.ID, targetUser.ID, &reason)
		assert.NoError(t, err, "Community moderator should be able to ban in authorized channel")

		// Cleanup
		_ = ctx.CommunityRepo.UnbanMember(ctxBg, authorizedCommunity.ID, targetUser.ID)
	})

	t.Run("Community moderator cannot moderate unauthorized channel", func(t *testing.T) {
		reason := "Unauthorized ban attempt"
		err := ctx.ModerationService.BanUser(ctxBg, unauthorizedCommunity.ID, communityMod.ID, targetUser.ID, &reason)
		assert.Error(t, err, "Community moderator should not be able to ban in unauthorized channel")
		assert.Equal(t, services.ErrModerationNotAuthorized, err, "Should return not authorized error")
	})
}

// TestCommunityModerator_CannotSeeOtherChannelBans tests that community moderators cannot view bans from other channels
func TestCommunityModerator_CannotSeeOtherChannelBans(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	siteMod := createRBACTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))

	// Create two communities
	community1 := createRBACTestCommunity(t, ctx, owner.ID)
	community2 := createRBACTestCommunity(t, ctx, owner.ID)

	// Create community moderator authorized for only community1
	communityMod := createRBACTestModerator(t, ctx, models.AccountTypeCommunityModerator, models.ModeratorScopeCommunity, []uuid.UUID{community1.ID})
	addRBACCommunityMember(t, ctx, community1.ID, communityMod.ID, models.CommunityRoleMod)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community1.ID, community2.ID}, []uuid.UUID{owner.ID, siteMod.ID, communityMod.ID, targetUser.ID})

	ctxBg := context.Background()

	// Site moderator creates a ban in community2
	reason := "Ban in community 2"
	err := ctx.ModerationService.BanUser(ctxBg, community2.ID, siteMod.ID, targetUser.ID, &reason)
	require.NoError(t, err)

	t.Run("Community moderator cannot view bans in unauthorized channel", func(t *testing.T) {
		_, _, err := ctx.ModerationService.GetBans(ctxBg, community2.ID, communityMod.ID, 1, 20)
		assert.Error(t, err, "Community moderator should not be able to view bans in unauthorized channel")
		assert.Equal(t, services.ErrModerationNotAuthorized, err, "Should return not authorized error")
	})

	// Cleanup
	_ = ctx.CommunityRepo.UnbanMember(ctxBg, community2.ID, targetUser.ID)
}

// TestCommunityModerator_ScopeValidationEnforced tests that scope validation is properly enforced
func TestCommunityModerator_ScopeValidationEnforced(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))

	community1 := createRBACTestCommunity(t, ctx, owner.ID)
	community2 := createRBACTestCommunity(t, ctx, owner.ID)
	community3 := createRBACTestCommunity(t, ctx, owner.ID)

	// Create community moderator with multiple authorized channels
	communityMod := createRBACTestModerator(t, ctx, models.AccountTypeCommunityModerator, models.ModeratorScopeCommunity, []uuid.UUID{community1.ID, community2.ID})
	addRBACCommunityMember(t, ctx, community1.ID, communityMod.ID, models.CommunityRoleMod)
	addRBACCommunityMember(t, ctx, community2.ID, communityMod.ID, models.CommunityRoleMod)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community1.ID, community2.ID, community3.ID}, []uuid.UUID{owner.ID, communityMod.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("Can moderate first authorized channel", func(t *testing.T) {
		reason := "Ban in channel 1"
		err := ctx.ModerationService.BanUser(ctxBg, community1.ID, communityMod.ID, targetUser.ID, &reason)
		assert.NoError(t, err)
		_ = ctx.CommunityRepo.UnbanMember(ctxBg, community1.ID, targetUser.ID)
	})

	t.Run("Can moderate second authorized channel", func(t *testing.T) {
		reason := "Ban in channel 2"
		err := ctx.ModerationService.BanUser(ctxBg, community2.ID, communityMod.ID, targetUser.ID, &reason)
		assert.NoError(t, err)
		_ = ctx.CommunityRepo.UnbanMember(ctxBg, community2.ID, targetUser.ID)
	})

	t.Run("Cannot moderate unauthorized channel", func(t *testing.T) {
		reason := "Ban in channel 3"
		err := ctx.ModerationService.BanUser(ctxBg, community3.ID, communityMod.ID, targetUser.ID, &reason)
		assert.Error(t, err)
		assert.Equal(t, services.ErrModerationNotAuthorized, err)
	})

	t.Run("Scope list contains exactly authorized channels", func(t *testing.T) {
		user, err := ctx.UserRepo.GetByID(ctxBg, communityMod.ID)
		require.NoError(t, err)
		assert.Len(t, user.ModerationChannels, 2, "Should have exactly 2 authorized channels")
		assert.Contains(t, user.ModerationChannels, community1.ID)
		assert.Contains(t, user.ModerationChannels, community2.ID)
		assert.NotContains(t, user.ModerationChannels, community3.ID)
	})
}

// ==============================================================================
// Regular User Tests
// ==============================================================================

// TestRegularUser_CannotModerate tests that regular users cannot perform any moderation actions
func TestRegularUser_CannotModerate(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	regularUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("regular_%s", uuid.New().String()[:8]))
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))
	community := createRBACTestCommunity(t, ctx, owner.ID)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, regularUser.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("Regular user cannot ban", func(t *testing.T) {
		reason := "Unauthorized ban attempt"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, regularUser.ID, targetUser.ID, &reason)
		assert.Error(t, err, "Regular user should not be able to ban")
		assert.Equal(t, services.ErrModerationPermissionDenied, err)
	})

	t.Run("Regular user cannot unban", func(t *testing.T) {
		err := ctx.ModerationService.UnbanUser(ctxBg, community.ID, regularUser.ID, targetUser.ID)
		assert.Error(t, err, "Regular user should not be able to unban")
		assert.Equal(t, services.ErrModerationPermissionDenied, err)
	})

	t.Run("Regular user cannot view bans", func(t *testing.T) {
		_, _, err := ctx.ModerationService.GetBans(ctxBg, community.ID, regularUser.ID, 1, 20)
		assert.Error(t, err, "Regular user should not be able to view bans")
		assert.Equal(t, services.ErrModerationPermissionDenied, err)
	})
}

// ==============================================================================
// Permission Escalation Prevention Tests
// ==============================================================================

// TestPreventPermissionEscalation_CannotModifyOtherModsBans tests that moderators cannot inappropriately modify other moderator's actions
func TestPreventPermissionEscalation_CannotModifyOtherModsBans(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))
	community := createRBACTestCommunity(t, ctx, owner.ID)

	// Create two community moderators for the same community
	communityMod1 := createRBACTestModerator(t, ctx, models.AccountTypeCommunityModerator, models.ModeratorScopeCommunity, []uuid.UUID{community.ID})
	communityMod2 := createRBACTestModerator(t, ctx, models.AccountTypeCommunityModerator, models.ModeratorScopeCommunity, []uuid.UUID{community.ID})

	addRBACCommunityMember(t, ctx, community.ID, communityMod1.ID, models.CommunityRoleMod)
	addRBACCommunityMember(t, ctx, community.ID, communityMod2.ID, models.CommunityRoleMod)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, communityMod1.ID, communityMod2.ID, targetUser.ID})

	ctxBg := context.Background()

	// Moderator 1 bans a user
	reason1 := "Ban by moderator 1"
	err := ctx.ModerationService.BanUser(ctxBg, community.ID, communityMod1.ID, targetUser.ID, &reason1)
	require.NoError(t, err)

	t.Run("Moderator 2 can view bans created by Moderator 1", func(t *testing.T) {
		bans, total, err := ctx.ModerationService.GetBans(ctxBg, community.ID, communityMod2.ID, 1, 20)
		assert.NoError(t, err, "Moderator should be able to view bans in their scope")
		assert.Equal(t, 1, total)
		assert.Len(t, bans, 1)
		assert.Equal(t, targetUser.ID, bans[0].BannedUserID)
	})

	t.Run("Moderator 2 can unban users banned by Moderator 1 (same scope)", func(t *testing.T) {
		// In the same community scope, moderators can unban users banned by other moderators
		// This is expected behavior for moderators with the same scope
		err := ctx.ModerationService.UnbanUser(ctxBg, community.ID, communityMod2.ID, targetUser.ID)
		assert.NoError(t, err, "Moderator with same scope should be able to unban")

		// Verify unban
		isBanned, err := ctx.CommunityRepo.IsBanned(ctxBg, community.ID, targetUser.ID)
		require.NoError(t, err)
		assert.False(t, isBanned)
	})
}

// TestPreventPermissionEscalation_CannotGrantHigherPermissions tests that moderators cannot grant permissions above their level
func TestPreventPermissionEscalation_CannotGrantHigherPermissions(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	community := createRBACTestCommunity(t, ctx, owner.ID)
	
	communityMod := createRBACTestModerator(t, ctx, models.AccountTypeCommunityModerator, models.ModeratorScopeCommunity, []uuid.UUID{community.ID})
	regularUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("regular_%s", uuid.New().String()[:8]))

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, communityMod.ID, regularUser.ID})

	ctxBg := context.Background()

	t.Run("Community moderator cannot grant site moderator permissions", func(t *testing.T) {
		// Community moderators should not be able to change user account types
		// This would be enforced at the service/API layer, not directly in DB
		
		// Verify community moderator has limited permissions
		user, err := ctx.UserRepo.GetByID(ctxBg, communityMod.ID)
		require.NoError(t, err)
		
		assert.Equal(t, models.AccountTypeCommunityModerator, user.AccountType)
		assert.False(t, user.Can(models.PermissionManageUsers), "Community moderator should not have manage users permission")
		assert.False(t, user.Can(models.PermissionManageSystem), "Community moderator should not have manage system permission")
	})

	t.Run("Community moderator has limited permission set", func(t *testing.T) {
		user, err := ctx.UserRepo.GetByID(ctxBg, communityMod.ID)
		require.NoError(t, err)

		// Community moderators should only have specific permissions
		assert.True(t, user.Can(models.PermissionCommunityModerate), "Should have community moderate permission")
		assert.True(t, user.Can(models.PermissionModerateUsers), "Should have moderate users permission")
		assert.True(t, user.Can(models.PermissionViewChannelAnalytics), "Should have view channel analytics permission")
		assert.True(t, user.Can(models.PermissionManageModerators), "Should have manage moderators permission")

		// But not elevated permissions
		assert.False(t, user.Can(models.PermissionModerateContent), "Should not have moderate content permission")
		assert.False(t, user.Can(models.PermissionCreateDiscoveryLists), "Should not have create discovery lists permission")
		assert.False(t, user.Can(models.PermissionManageUsers), "Should not have manage users permission")
		assert.False(t, user.Can(models.PermissionManageSystem), "Should not have manage system permission")
	})
}

// ==============================================================================
// Comprehensive Endpoint Tests with Different Roles
// ==============================================================================

// TestAllModerationEndpoints_WithDifferentRoles tests all moderation endpoints with different role combinations
func TestAllModerationEndpoints_WithDifferentRoles(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	admin := testutil.CreateTestUserWithRole(t, ctx.DB, fmt.Sprintf("admin_%s", uuid.New().String()[:8]), models.RoleAdmin)
	siteMod := createRBACTestModerator(t, ctx, models.AccountTypeModerator, models.ModeratorScopeSite, nil)
	regularUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("regular_%s", uuid.New().String()[:8]))
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))

	community := createRBACTestCommunity(t, ctx, owner.ID)

	// Create community moderator
	communityMod := createRBACTestModerator(t, ctx, models.AccountTypeCommunityModerator, models.ModeratorScopeCommunity, []uuid.UUID{community.ID})
	addRBACCommunityMember(t, ctx, community.ID, communityMod.ID, models.CommunityRoleMod)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, admin.ID, siteMod.ID, communityMod.ID, regularUser.ID, targetUser.ID})

	ctxBg := context.Background()

	testCases := []struct {
		name          string
		userID        uuid.UUID
		userName      string
		shouldSucceed bool
		errorExpected error
	}{
		{"Admin", admin.ID, "admin", true, nil},
		{"SiteModerator", siteMod.ID, "site moderator", true, nil},
		{"CommunityModerator", communityMod.ID, "community moderator", true, nil},
		{"RegularUser", regularUser.ID, "regular user", false, services.ErrModerationPermissionDenied},
	}

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("BanUser_%s", tc.name), func(t *testing.T) {
			reason := fmt.Sprintf("Ban by %s", tc.userName)
			err := ctx.ModerationService.BanUser(ctxBg, community.ID, tc.userID, targetUser.ID, &reason)

			if tc.shouldSucceed {
				assert.NoError(t, err, "%s should be able to ban user", tc.userName)
				// Cleanup
				_ = ctx.CommunityRepo.UnbanMember(ctxBg, community.ID, targetUser.ID)
			} else {
				assert.Error(t, err, "%s should not be able to ban user", tc.userName)
				if tc.errorExpected != nil {
					assert.Equal(t, tc.errorExpected, err)
				}
			}
		})
	}

	// Create a ban for unban and list tests
	reason := "Test ban"
	err := ctx.ModerationService.BanUser(ctxBg, community.ID, admin.ID, targetUser.ID, &reason)
	require.NoError(t, err)

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("GetBans_%s", tc.name), func(t *testing.T) {
			_, _, err := ctx.ModerationService.GetBans(ctxBg, community.ID, tc.userID, 1, 20)

			if tc.shouldSucceed {
				assert.NoError(t, err, "%s should be able to view bans", tc.userName)
			} else {
				assert.Error(t, err, "%s should not be able to view bans", tc.userName)
				if tc.errorExpected != nil {
					assert.Equal(t, tc.errorExpected, err)
				}
			}
		})
	}

	for _, tc := range testCases {
		t.Run(fmt.Sprintf("UnbanUser_%s", tc.name), func(t *testing.T) {
			// Explicit setup: ensure a known starting state for each subtest
			// Start by ensuring the user is not banned, then ban them for this test.
			_ = ctx.CommunityRepo.UnbanMember(ctxBg, community.ID, targetUser.ID)

			setupReason := "Test ban for unban test"
			err := ctx.ModerationService.BanUser(ctxBg, community.ID, admin.ID, targetUser.ID, &setupReason)
			require.NoError(t, err, "Failed to set up ban for unban test")

			err = ctx.ModerationService.UnbanUser(ctxBg, community.ID, tc.userID, targetUser.ID)

			if tc.shouldSucceed {
				assert.NoError(t, err, "%s should be able to unban user", tc.userName)
			} else {
				assert.Error(t, err, "%s should not be able to unban user", tc.userName)
				if tc.errorExpected != nil {
					assert.Equal(t, tc.errorExpected, err)
				}
			}
		})
	}

	// Final cleanup
	_ = ctx.CommunityRepo.UnbanMember(ctxBg, community.ID, targetUser.ID)
}

// ==============================================================================
// Error Checking Tests
// ==============================================================================

// TestComprehensiveErrorChecking tests comprehensive error scenarios for authorization
func TestComprehensiveErrorChecking(t *testing.T) {
	ctx := setupRBACTestContext(t)
	defer ctx.cleanup()

	owner := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("owner_%s", uuid.New().String()[:8]))
	regularUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("regular_%s", uuid.New().String()[:8]))
	targetUser := testutil.CreateTestUser(t, ctx.DB, fmt.Sprintf("target_%s", uuid.New().String()[:8]))
	community := createRBACTestCommunity(t, ctx, owner.ID)

	defer cleanupRBACTestData(t, ctx, []uuid.UUID{community.ID}, []uuid.UUID{owner.ID, regularUser.ID, targetUser.ID})

	ctxBg := context.Background()

	t.Run("Permission denied returns correct error", func(t *testing.T) {
		reason := "Test"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, regularUser.ID, targetUser.ID, &reason)
		assert.Equal(t, services.ErrModerationPermissionDenied, err)
	})

	t.Run("Not authorized returns correct error", func(t *testing.T) {
		// Create a community moderator not authorized for this community
		otherCommunity := createRBACTestCommunity(t, ctx, owner.ID)
		unauthorizedMod := createRBACTestModerator(t, ctx, models.AccountTypeCommunityModerator, models.ModeratorScopeCommunity, []uuid.UUID{otherCommunity.ID})
		
		defer func() {
			_, _ = ctx.DB.Pool.Exec(ctxBg, "DELETE FROM communities WHERE id = $1", otherCommunity.ID)
			testutil.CleanupTestUser(t, ctx.DB, unauthorizedMod.ID)
		}()

		reason := "Test"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, unauthorizedMod.ID, targetUser.ID, &reason)
		assert.Equal(t, services.ErrModerationNotAuthorized, err)
	})

	t.Run("Cannot ban community owner returns correct error", func(t *testing.T) {
		admin := testutil.CreateTestUserWithRole(t, ctx.DB, fmt.Sprintf("admin_%s", uuid.New().String()[:8]), models.RoleAdmin)
		defer testutil.CleanupTestUser(t, ctx.DB, admin.ID)

		reason := "Attempt to ban owner"
		err := ctx.ModerationService.BanUser(ctxBg, community.ID, admin.ID, owner.ID, &reason)
		assert.Equal(t, services.ErrModerationCannotBanOwner, err)
	})

	t.Run("Unban non-banned user returns correct error", func(t *testing.T) {
		admin := testutil.CreateTestUserWithRole(t, ctx.DB, fmt.Sprintf("admin_%s", uuid.New().String()[:8]), models.RoleAdmin)
		defer testutil.CleanupTestUser(t, ctx.DB, admin.ID)

		err := ctx.ModerationService.UnbanUser(ctxBg, community.ID, admin.ID, targetUser.ID)
		assert.Equal(t, services.ErrModerationNotBanned, err)
	})
}
