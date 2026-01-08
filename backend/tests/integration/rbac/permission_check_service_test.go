//go:build integration

package rbac

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// TestPermissionCheckService_Integration tests the PermissionCheckService with real database
func TestPermissionCheckService_Integration(t *testing.T) {
	tc := testutil.SetupTestEnvironment(t)
	defer tc.Cleanup()

	ctx := context.Background()
	communityRepo := repository.NewCommunityRepository(tc.DB.Pool)
	userRepo := repository.NewUserRepository(tc.DB.Pool)

	permService := services.NewPermissionCheckService(communityRepo, userRepo, tc.RedisClient)

	// Create test users
	admin := createTestAdmin(t, tc)
	siteMod := createTestSiteModerator(t, tc)
	communityMod := createTestCommunityModerator(t, tc)
	regularUser := createTestRegularUser(t, tc)

	// Create test community
	community := createTestCommunity(t, tc, admin.ID)

	// Add community moderator to the community with mod role
	addCommunityModerator(t, tc, community.ID, communityMod.ID)

	// Update community moderator's moderation channels
	communityMod.ModerationChannels = []uuid.UUID{community.ID}
	err := userRepo.Update(ctx, communityMod)
	require.NoError(t, err)

	// Create a target user to ban
	targetUser := createTestRegularUser(t, tc)

	t.Run("AdminCanBanAnywhere", func(t *testing.T) {
		err := permService.CanBan(ctx, admin, targetUser.ID, community.ID)
		assert.NoError(t, err)
	})

	t.Run("SiteModCanBanAcrossChannels", func(t *testing.T) {
		err := permService.CanBan(ctx, siteMod, targetUser.ID, community.ID)
		assert.NoError(t, err)
	})

	t.Run("CommunityModCanBanInAssignedChannel", func(t *testing.T) {
		err := permService.CanBan(ctx, communityMod, targetUser.ID, community.ID)
		assert.NoError(t, err)
	})

	t.Run("CommunityModCannotBanInUnassignedChannel", func(t *testing.T) {
		otherCommunity := createTestCommunity(t, tc, admin.ID)
		err := permService.CanBan(ctx, communityMod, targetUser.ID, otherCommunity.ID)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "not a member")
	})

	t.Run("RegularUserCannotBan", func(t *testing.T) {
		err := permService.CanBan(ctx, regularUser, targetUser.ID, community.ID)
		assert.Error(t, err)
		denialErr, ok := err.(*services.PermissionDenialReason)
		assert.True(t, ok)
		assert.Equal(t, "NO_MODERATION_PRIVILEGES", denialErr.Code)
	})

	t.Run("CannotBanOwner", func(t *testing.T) {
		err := permService.CanBan(ctx, admin, community.OwnerID, community.ID)
		assert.Error(t, err)
		denialErr, ok := err.(*services.PermissionDenialReason)
		assert.True(t, ok)
		assert.Equal(t, "CANNOT_BAN_OWNER", denialErr.Code)
	})

	t.Run("CanModerateWithCaching", func(t *testing.T) {
		// First call - cache miss
		err := permService.CanModerate(ctx, admin, community.ID)
		assert.NoError(t, err)

		// Second call - should use cache
		err = permService.CanModerate(ctx, admin, community.ID)
		assert.NoError(t, err)

		// Invalidate cache
		err = permService.InvalidatePermissionCache(ctx, admin.ID, community.ID)
		assert.NoError(t, err)

		// Third call - cache miss again
		err = permService.CanModerate(ctx, admin, community.ID)
		assert.NoError(t, err)
	})

	t.Run("ValidateModeratorScope", func(t *testing.T) {
		// Site mod has no restrictions
		err := permService.ValidateModeratorScope(ctx, siteMod, []uuid.UUID{community.ID, uuid.New()})
		assert.NoError(t, err)

		// Community mod can only access assigned channels
		err = permService.ValidateModeratorScope(ctx, communityMod, []uuid.UUID{community.ID})
		assert.NoError(t, err)

		// Community mod cannot access unassigned channels
		err = permService.ValidateModeratorScope(ctx, communityMod, []uuid.UUID{uuid.New()})
		assert.Error(t, err)
		denialErr, ok := err.(*services.PermissionDenialReason)
		assert.True(t, ok)
		assert.Equal(t, "SCOPE_VIOLATION", denialErr.Code)
	})

	t.Run("BanAndUnbanWorkflow", func(t *testing.T) {
		// Create a new user to ban
		userToBan := createTestRegularUser(t, tc)

		// Admin can ban the user
		ban := &models.CommunityBan{
			ID:             uuid.New(),
			CommunityID:    community.ID,
			BannedUserID:   userToBan.ID,
			BannedByUserID: &admin.ID,
			BannedAt:       time.Now(),
		}
		err := communityRepo.BanMember(ctx, ban)
		require.NoError(t, err)

		// Verify ban exists
		isBanned, err := communityRepo.IsBanned(ctx, community.ID, userToBan.ID)
		require.NoError(t, err)
		assert.True(t, isBanned)

		// Admin can unban the user
		err = permService.CanUnban(ctx, admin, ban.ID)
		assert.NoError(t, err)

		// Unban the user
		err = communityRepo.UnbanMember(ctx, community.ID, userToBan.ID)
		require.NoError(t, err)

		// Verify ban is removed
		isBanned, err = communityRepo.IsBanned(ctx, community.ID, userToBan.ID)
		require.NoError(t, err)
		assert.False(t, isBanned)
	})
}

// Helper functions to create test data

func createTestAdmin(t *testing.T, tc *testutil.TestConfig) *models.User {
	user := testutil.CreateTestUser(t, tc.DB, "test_admin")
	user.Role = models.RoleAdmin
	user.AccountType = models.AccountTypeAdmin

	ctx := context.Background()
	userRepo := repository.NewUserRepository(tc.DB.Pool)
	err := userRepo.Update(ctx, user)
	require.NoError(t, err)

	return user
}

func createTestSiteModerator(t *testing.T, tc *testutil.TestConfig) *models.User {
	user := testutil.CreateTestUser(t, tc.DB, "test_site_mod")
	user.AccountType = models.AccountTypeModerator
	user.ModeratorScope = models.ModeratorScopeSite

	ctx := context.Background()
	userRepo := repository.NewUserRepository(tc.DB.Pool)
	err := userRepo.Update(ctx, user)
	require.NoError(t, err)

	return user
}

func createTestCommunityModerator(t *testing.T, tc *testutil.TestConfig) *models.User {
	user := testutil.CreateTestUser(t, tc.DB, "test_community_mod")
	user.AccountType = models.AccountTypeCommunityModerator
	user.ModeratorScope = models.ModeratorScopeCommunity

	ctx := context.Background()
	userRepo := repository.NewUserRepository(tc.DB.Pool)
	err := userRepo.Update(ctx, user)
	require.NoError(t, err)

	return user
}

func createTestRegularUser(t *testing.T, tc *testutil.TestConfig) *models.User {
	user := testutil.CreateTestUser(t, tc.DB, "test_user")
	return user
}

func createTestCommunity(t *testing.T, tc *testutil.TestConfig, ownerID uuid.UUID) *models.Community {
	ctx := context.Background()
	communityRepo := repository.NewCommunityRepository(tc.DB.Pool)

	slug := "test-community-" + uuid.New().String()[:8]
	community := &models.Community{
		ID:        uuid.New(),
		Name:      "Test Community",
		Slug:      slug,
		OwnerID:   ownerID,
		IsPublic:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := communityRepo.CreateCommunity(ctx, community)
	require.NoError(t, err)

	return community
}

func addCommunityModerator(t *testing.T, tc *testutil.TestConfig, communityID, userID uuid.UUID) {
	ctx := context.Background()
	communityRepo := repository.NewCommunityRepository(tc.DB.Pool)

	member := &models.CommunityMember{
		CommunityID: communityID,
		UserID:      userID,
		Role:        models.CommunityRoleMod,
		JoinedAt:    time.Now(),
	}

	err := communityRepo.AddMember(ctx, member)
	require.NoError(t, err)
}
