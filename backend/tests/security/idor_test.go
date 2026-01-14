package security

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/internal/middleware"
	"github.com/subculture-collective/clipper/internal/models"
)

// MockResourceChecker is a mock implementation for testing
type MockResourceChecker struct {
	ownerID uuid.UUID
}

func (m *MockResourceChecker) IsOwner(ctx context.Context, resourceID, userID uuid.UUID) (bool, error) {
	return m.ownerID == userID, nil
}

// TestIDORCommentUpdateAuthorization tests IDOR vulnerability in comment updates
func TestIDORCommentUpdateAuthorization(t *testing.T) {
	ownerID := uuid.New()
	otherUserID := uuid.New()
	resourceID := uuid.New()

	tests := []struct {
		name           string
		userID         uuid.UUID
		role           string
		accountType    string
		resourceID     uuid.UUID
		ownerID        uuid.UUID
		expectedAccess bool
		description    string
	}{
		{
			name:           "Owner can update own comment",
			userID:         ownerID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			resourceID:     resourceID,
			ownerID:        ownerID,
			expectedAccess: true,
			description:    "Comment owner should be able to update their own comment",
		},
		{
			name:           "Non-owner cannot update other's comment",
			userID:         otherUserID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			resourceID:     resourceID,
			ownerID:        ownerID,
			expectedAccess: false,
			description:    "Regular user should NOT be able to update another user's comment (IDOR)",
		},
		{
			name:           "Admin can update any comment",
			userID:         otherUserID,
			role:           models.RoleAdmin,
			accountType:    models.AccountTypeAdmin,
			resourceID:     resourceID,
			ownerID:        ownerID,
			expectedAccess: true,
			description:    "Admin should be able to update any comment",
		},
		{
			name:           "Moderator cannot update other's comment",
			userID:         otherUserID,
			role:           models.RoleModerator,
			accountType:    models.AccountTypeModerator,
			resourceID:     resourceID,
			ownerID:        ownerID,
			expectedAccess: false,
			description:    "Moderator should NOT be able to update content of other user's comments",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := &models.User{
				ID:          tt.userID,
				Role:        tt.role,
				AccountType: tt.accountType,
			}

			checker := &MockResourceChecker{ownerID: tt.ownerID}

			authCtx := &middleware.AuthorizationContext{
				UserID:       tt.userID,
				User:         user,
				ResourceID:   tt.resourceID,
				Action:       middleware.ActionUpdate,
				ResourceType: middleware.ResourceTypeComment,
			}

			result, err := middleware.CanAccessResource(authCtx, checker)
			assert.NoError(t, err, "Authorization check should not return error")
			assert.Equal(t, tt.expectedAccess, result.Allowed, tt.description)
		})
	}
}

// TestIDORCommentDeleteAuthorization tests IDOR vulnerability in comment deletion
func TestIDORCommentDeleteAuthorization(t *testing.T) {
	ownerID := uuid.New()
	otherUserID := uuid.New()
	resourceID := uuid.New()

	tests := []struct {
		name           string
		userID         uuid.UUID
		role           string
		accountType    string
		resourceID     uuid.UUID
		ownerID        uuid.UUID
		expectedAccess bool
		description    string
	}{
		{
			name:           "Owner can delete own comment",
			userID:         ownerID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			resourceID:     resourceID,
			ownerID:        ownerID,
			expectedAccess: true,
			description:    "Comment owner should be able to delete their own comment",
		},
		{
			name:           "Non-owner cannot delete other's comment",
			userID:         otherUserID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			resourceID:     resourceID,
			ownerID:        ownerID,
			expectedAccess: false,
			description:    "Regular user should NOT be able to delete another user's comment (IDOR)",
		},
		{
			name:           "Moderator can delete any comment",
			userID:         otherUserID,
			role:           models.RoleModerator,
			accountType:    models.AccountTypeModerator,
			resourceID:     resourceID,
			ownerID:        ownerID,
			expectedAccess: true,
			description:    "Moderator should be able to delete any comment",
		},
		{
			name:           "Admin can delete any comment",
			userID:         otherUserID,
			role:           models.RoleAdmin,
			accountType:    models.AccountTypeAdmin,
			resourceID:     resourceID,
			ownerID:        ownerID,
			expectedAccess: true,
			description:    "Admin should be able to delete any comment",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := &models.User{
				ID:          tt.userID,
				Role:        tt.role,
				AccountType: tt.accountType,
			}

			checker := &MockResourceChecker{ownerID: tt.ownerID}

			authCtx := &middleware.AuthorizationContext{
				UserID:       tt.userID,
				User:         user,
				ResourceID:   tt.resourceID,
				Action:       middleware.ActionDelete,
				ResourceType: middleware.ResourceTypeComment,
			}

			result, err := middleware.CanAccessResource(authCtx, checker)
			assert.NoError(t, err, "Authorization check should not return error")
			assert.Equal(t, tt.expectedAccess, result.Allowed, tt.description)
		})
	}
}

// TestIDORUserSettingsAccess tests IDOR vulnerability in user settings access
func TestIDORUserSettingsAccess(t *testing.T) {
	userAID := uuid.New()
	userBID := uuid.New()

	tests := []struct {
		name           string
		userID         uuid.UUID
		role           string
		accountType    string
		targetUserID   uuid.UUID
		action         middleware.Action
		expectedAccess bool
		description    string
	}{
		{
			name:           "User can read own settings",
			userID:         userAID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			targetUserID:   userAID,
			action:         middleware.ActionRead,
			expectedAccess: true,
			description:    "User should be able to read their own settings",
		},
		{
			name:           "User can read other user's public profile",
			userID:         userBID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			targetUserID:   userAID,
			action:         middleware.ActionRead,
			expectedAccess: true,
			description:    "User profiles are public, so anyone can read them",
		},
		{
			name:           "User can update own profile",
			userID:         userAID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			targetUserID:   userAID,
			action:         middleware.ActionUpdate,
			expectedAccess: true,
			description:    "User should be able to update their own profile",
		},
		{
			name:           "User cannot update other user's profile",
			userID:         userBID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			targetUserID:   userAID,
			action:         middleware.ActionUpdate,
			expectedAccess: false,
			description:    "User should NOT be able to update another user's profile (IDOR)",
		},
		{
			name:           "User can delete own account",
			userID:         userAID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			targetUserID:   userAID,
			action:         middleware.ActionDelete,
			expectedAccess: true,
			description:    "User should be able to delete their own account",
		},
		{
			name:           "User cannot delete other user's account",
			userID:         userBID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			targetUserID:   userAID,
			action:         middleware.ActionDelete,
			expectedAccess: false,
			description:    "Regular user should NOT be able to delete another user's account (IDOR)",
		},
		{
			name:           "Admin can delete any account",
			userID:         userBID,
			role:           models.RoleAdmin,
			accountType:    models.AccountTypeAdmin,
			targetUserID:   userAID,
			action:         middleware.ActionDelete,
			expectedAccess: true,
			description:    "Admin should be able to delete any account",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := &models.User{
				ID:          tt.userID,
				Role:        tt.role,
				AccountType: tt.accountType,
			}

			checker := middleware.NewUserOwnershipChecker()

			authCtx := &middleware.AuthorizationContext{
				UserID:       tt.userID,
				User:         user,
				ResourceID:   tt.targetUserID,
				Action:       tt.action,
				ResourceType: middleware.ResourceTypeUser,
			}

			result, err := middleware.CanAccessResource(authCtx, checker)
			assert.NoError(t, err, "Authorization check should not return error")
			assert.Equal(t, tt.expectedAccess, result.Allowed, tt.description)
		})
	}
}

// TestIDORClipOperations tests IDOR vulnerability in clip operations
func TestIDORClipOperations(t *testing.T) {
	ownerID := uuid.New()
	otherUserID := uuid.New()
	resourceID := uuid.New()

	tests := []struct {
		name           string
		userID         uuid.UUID
		role           string
		accountType    string
		resourceID     uuid.UUID
		ownerID        uuid.UUID
		action         middleware.Action
		expectedAccess bool
		description    string
	}{
		{
			name:           "Owner can update own clip metadata",
			userID:         ownerID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			resourceID:     resourceID,
			ownerID:        ownerID,
			action:         middleware.ActionUpdate,
			expectedAccess: true,
			description:    "Clip submitter should be able to update their clip metadata",
		},
		{
			name:           "Non-owner cannot update other's clip",
			userID:         otherUserID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			resourceID:     resourceID,
			ownerID:        ownerID,
			action:         middleware.ActionUpdate,
			expectedAccess: false,
			description:    "Regular user should NOT be able to update another user's clip (IDOR)",
		},
		{
			name:           "Admin can update any clip",
			userID:         otherUserID,
			role:           models.RoleAdmin,
			accountType:    models.AccountTypeAdmin,
			resourceID:     resourceID,
			ownerID:        ownerID,
			action:         middleware.ActionUpdate,
			expectedAccess: true,
			description:    "Admin should be able to update any clip",
		},
		{
			name:           "Owner cannot delete clip (admin only)",
			userID:         ownerID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			resourceID:     resourceID,
			ownerID:        ownerID,
			action:         middleware.ActionDelete,
			expectedAccess: false,
			description:    "Even clip owner cannot delete clips (admin-only operation)",
		},
		{
			name:           "Admin can delete any clip",
			userID:         otherUserID,
			role:           models.RoleAdmin,
			accountType:    models.AccountTypeAdmin,
			resourceID:     resourceID,
			ownerID:        ownerID,
			action:         middleware.ActionDelete,
			expectedAccess: true,
			description:    "Admin should be able to delete any clip",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := &models.User{
				ID:          tt.userID,
				Role:        tt.role,
				AccountType: tt.accountType,
			}

			checker := &MockResourceChecker{ownerID: tt.ownerID}

			authCtx := &middleware.AuthorizationContext{
				UserID:       tt.userID,
				User:         user,
				ResourceID:   tt.resourceID,
				Action:       tt.action,
				ResourceType: middleware.ResourceTypeClip,
			}

			result, err := middleware.CanAccessResource(authCtx, checker)
			assert.NoError(t, err, "Authorization check should not return error")
			assert.Equal(t, tt.expectedAccess, result.Allowed, tt.description)
		})
	}
}

// TestIDORFavoriteOperations tests IDOR vulnerability in favorite operations
func TestIDORFavoriteOperations(t *testing.T) {
	userAID := uuid.New()
	userBID := uuid.New()
	favoriteID := uuid.New()

	tests := []struct {
		name           string
		userID         uuid.UUID
		role           string
		accountType    string
		favoriteID     uuid.UUID
		ownerID        uuid.UUID
		action         middleware.Action
		expectedAccess bool
		description    string
	}{
		{
			name:           "User can create own favorite",
			userID:         userAID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			favoriteID:     favoriteID,
			ownerID:        userAID,
			action:         middleware.ActionCreate,
			expectedAccess: true,
			description:    "User should be able to create their own favorites",
		},
		{
			name:           "User can read own favorites",
			userID:         userAID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			favoriteID:     favoriteID,
			ownerID:        userAID,
			action:         middleware.ActionRead,
			expectedAccess: true,
			description:    "User should be able to read their own favorites",
		},
		{
			name:           "User cannot read other's favorites",
			userID:         userBID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			favoriteID:     favoriteID,
			ownerID:        userAID,
			action:         middleware.ActionRead,
			expectedAccess: false,
			description:    "User should NOT be able to read another user's favorites (IDOR)",
		},
		{
			name:           "User can delete own favorite",
			userID:         userAID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			favoriteID:     favoriteID,
			ownerID:        userAID,
			action:         middleware.ActionDelete,
			expectedAccess: true,
			description:    "User should be able to delete their own favorites",
		},
		{
			name:           "User cannot delete other's favorite",
			userID:         userBID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			favoriteID:     favoriteID,
			ownerID:        userAID,
			action:         middleware.ActionDelete,
			expectedAccess: false,
			description:    "User should NOT be able to delete another user's favorite (IDOR)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := &models.User{
				ID:          tt.userID,
				Role:        tt.role,
				AccountType: tt.accountType,
			}

			checker := &MockResourceChecker{ownerID: tt.ownerID}

			authCtx := &middleware.AuthorizationContext{
				UserID:       tt.userID,
				User:         user,
				ResourceID:   tt.favoriteID,
				Action:       tt.action,
				ResourceType: middleware.ResourceTypeFavorite,
			}

			result, err := middleware.CanAccessResource(authCtx, checker)
			assert.NoError(t, err, "Authorization check should not return error")
			assert.Equal(t, tt.expectedAccess, result.Allowed, tt.description)
		})
	}
}

// TestIDORSubscriptionAccess tests IDOR vulnerability in subscription operations
func TestIDORSubscriptionAccess(t *testing.T) {
	userAID := uuid.New()
	userBID := uuid.New()
	subscriptionID := uuid.New()

	tests := []struct {
		name           string
		userID         uuid.UUID
		role           string
		accountType    string
		subscriptionID uuid.UUID
		ownerID        uuid.UUID
		action         middleware.Action
		expectedAccess bool
		description    string
	}{
		{
			name:           "User can read own subscription",
			userID:         userAID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			subscriptionID: subscriptionID,
			ownerID:        userAID,
			action:         middleware.ActionRead,
			expectedAccess: true,
			description:    "User should be able to read their own subscription details",
		},
		{
			name:           "User cannot read other's subscription",
			userID:         userBID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			subscriptionID: subscriptionID,
			ownerID:        userAID,
			action:         middleware.ActionRead,
			expectedAccess: false,
			description:    "User should NOT be able to read another user's subscription (IDOR)",
		},
		{
			name:           "User can update own subscription",
			userID:         userAID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			subscriptionID: subscriptionID,
			ownerID:        userAID,
			action:         middleware.ActionUpdate,
			expectedAccess: true,
			description:    "User should be able to update their own subscription",
		},
		{
			name:           "User cannot update other's subscription",
			userID:         userBID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			subscriptionID: subscriptionID,
			ownerID:        userAID,
			action:         middleware.ActionUpdate,
			expectedAccess: false,
			description:    "User should NOT be able to update another user's subscription (IDOR)",
		},
		{
			name:           "User can cancel own subscription",
			userID:         userAID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			subscriptionID: subscriptionID,
			ownerID:        userAID,
			action:         middleware.ActionDelete,
			expectedAccess: true,
			description:    "User should be able to cancel their own subscription",
		},
		{
			name:           "User cannot cancel other's subscription",
			userID:         userBID,
			role:           models.RoleUser,
			accountType:    models.AccountTypeMember,
			subscriptionID: subscriptionID,
			ownerID:        userAID,
			action:         middleware.ActionDelete,
			expectedAccess: false,
			description:    "User should NOT be able to cancel another user's subscription (IDOR)",
		},
		{
			name:           "Admin can cancel any subscription",
			userID:         userBID,
			role:           models.RoleAdmin,
			accountType:    models.AccountTypeAdmin,
			subscriptionID: subscriptionID,
			ownerID:        userAID,
			action:         middleware.ActionDelete,
			expectedAccess: true,
			description:    "Admin should be able to cancel any subscription",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := &models.User{
				ID:          tt.userID,
				Role:        tt.role,
				AccountType: tt.accountType,
			}

			checker := &MockResourceChecker{ownerID: tt.ownerID}

			authCtx := &middleware.AuthorizationContext{
				UserID:       tt.userID,
				User:         user,
				ResourceID:   tt.subscriptionID,
				Action:       tt.action,
				ResourceType: middleware.ResourceTypeSubscription,
			}

			result, err := middleware.CanAccessResource(authCtx, checker)
			require.NoError(t, err, "Authorization check should not return error")
			assert.Equal(t, tt.expectedAccess, result.Allowed, tt.description)
		})
	}
}

// TestPermissionMatrixCompleteness ensures all resource types have required rules
func TestPermissionMatrixCompleteness(t *testing.T) {
	resourceTypes := []middleware.ResourceType{
		middleware.ResourceTypeComment,
		middleware.ResourceTypeClip,
		middleware.ResourceTypeUser,
		middleware.ResourceTypeFavorite,
		middleware.ResourceTypeSubscription,
	}

	actions := []middleware.Action{
		middleware.ActionCreate,
		middleware.ActionRead,
		middleware.ActionUpdate,
		middleware.ActionDelete,
	}

	for _, resourceType := range resourceTypes {
		for _, action := range actions {
			found := false
			for _, perm := range middleware.PermissionMatrix {
				if perm.Resource == resourceType && perm.Action == action {
					found = true
					break
				}
			}

			// Not all combinations are required, but we log which ones are missing
			if !found {
				t.Logf("No permission rule for %s:%s (may be intentional)", resourceType, action)
			}
		}
	}
}
