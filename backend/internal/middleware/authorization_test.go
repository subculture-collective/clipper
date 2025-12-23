package middleware

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/internal/models"
)

// MockChecker is a mock ResourceOwnershipChecker for testing
type MockChecker struct {
	isOwner bool
	err     error
}

func (m *MockChecker) IsOwner(ctx context.Context, resourceID, userID uuid.UUID) (bool, error) {
	return m.isOwner, m.err
}

func TestCanAccessResource_OwnershipRequired(t *testing.T) {
	userID := uuid.New()
	resourceID := uuid.New()

	tests := []struct {
		name           string
		user           *models.User
		isOwner        bool
		expectedAccess bool
	}{
		{
			name: "Owner has access",
			user: &models.User{
				ID:          userID,
				Role:        models.RoleUser,
				AccountType: models.AccountTypeMember,
			},
			isOwner:        true,
			expectedAccess: true,
		},
		{
			name: "Non-owner regular user denied",
			user: &models.User{
				ID:          userID,
				Role:        models.RoleUser,
				AccountType: models.AccountTypeMember,
			},
			isOwner:        false,
			expectedAccess: false,
		},
		{
			name: "Non-owner admin has access",
			user: &models.User{
				ID:          userID,
				Role:        models.RoleAdmin,
				AccountType: models.AccountTypeAdmin,
			},
			isOwner:        false,
			expectedAccess: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			checker := &MockChecker{isOwner: tt.isOwner}

			authCtx := &AuthorizationContext{
				UserID:       userID,
				User:         tt.user,
				ResourceID:   resourceID,
				Action:       ActionUpdate,
				ResourceType: ResourceTypeComment,
			}

			hasAccess, err := CanAccessResource(authCtx, checker)
			require.NoError(t, err)
			assert.Equal(t, tt.expectedAccess, hasAccess)
		})
	}
}

func TestCanAccessResource_RoleBasedAccess(t *testing.T) {
	userID := uuid.New()
	resourceID := uuid.New()

	tests := []struct {
		name           string
		user           *models.User
		action         Action
		expectedAccess bool
	}{
		{
			name: "Admin can delete clips",
			user: &models.User{
				ID:          userID,
				Role:        models.RoleAdmin,
				AccountType: models.AccountTypeAdmin,
			},
			action:         ActionDelete,
			expectedAccess: true,
		},
		{
			name: "Regular user cannot delete clips",
			user: &models.User{
				ID:          userID,
				Role:        models.RoleUser,
				AccountType: models.AccountTypeMember,
			},
			action:         ActionDelete,
			expectedAccess: false,
		},
		{
			name: "Moderator cannot delete clips",
			user: &models.User{
				ID:          userID,
				Role:        models.RoleModerator,
				AccountType: models.AccountTypeModerator,
			},
			action:         ActionDelete,
			expectedAccess: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			checker := &MockChecker{isOwner: false}

			authCtx := &AuthorizationContext{
				UserID:       userID,
				User:         tt.user,
				ResourceID:   resourceID,
				Action:       tt.action,
				ResourceType: ResourceTypeClip,
			}

			hasAccess, err := CanAccessResource(authCtx, checker)
			require.NoError(t, err)
			assert.Equal(t, tt.expectedAccess, hasAccess)
		})
	}
}

func TestCanAccessResource_PublicAccess(t *testing.T) {
	userID := uuid.New()
	resourceID := uuid.New()

	// Test public read access to clips
	user := &models.User{
		ID:          userID,
		Role:        models.RoleUser,
		AccountType: models.AccountTypeMember,
	}

	checker := &MockChecker{isOwner: false}

	authCtx := &AuthorizationContext{
		UserID:       userID,
		User:         user,
		ResourceID:   resourceID,
		Action:       ActionRead,
		ResourceType: ResourceTypeClip,
	}

	hasAccess, err := CanAccessResource(authCtx, checker)
	require.NoError(t, err)
	assert.True(t, hasAccess, "Anyone should be able to read public clips")
}

func TestCanAccessResource_AccountTypePermissions(t *testing.T) {
	userID := uuid.New()
	resourceID := uuid.New()

	tests := []struct {
		name           string
		accountType    string
		action         Action
		resourceType   ResourceType
		expectedAccess bool
	}{
		{
			name:           "Member can create comments",
			accountType:    models.AccountTypeMember,
			action:         ActionCreate,
			resourceType:   ResourceTypeComment,
			expectedAccess: true,
		},
		{
			name:           "Broadcaster can create comments",
			accountType:    models.AccountTypeBroadcaster,
			action:         ActionCreate,
			resourceType:   ResourceTypeComment,
			expectedAccess: true,
		},
		{
			name:           "Moderator can create comments",
			accountType:    models.AccountTypeModerator,
			action:         ActionCreate,
			resourceType:   ResourceTypeComment,
			expectedAccess: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			user := &models.User{
				ID:          userID,
				Role:        models.RoleUser,
				AccountType: tt.accountType,
			}

			checker := &MockChecker{isOwner: false}

			authCtx := &AuthorizationContext{
				UserID:       userID,
				User:         user,
				ResourceID:   resourceID,
				Action:       tt.action,
				ResourceType: tt.resourceType,
			}

			hasAccess, err := CanAccessResource(authCtx, checker)
			require.NoError(t, err)
			assert.Equal(t, tt.expectedAccess, hasAccess)
		})
	}
}

func TestUserOwnershipChecker(t *testing.T) {
	userAID := uuid.New()
	userBID := uuid.New()

	checker := NewUserOwnershipChecker()

	// Test same user
	isOwner, err := checker.IsOwner(context.Background(), userAID, userAID)
	require.NoError(t, err)
	assert.True(t, isOwner, "User should own their own resource")

	// Test different user
	isOwner, err = checker.IsOwner(context.Background(), userBID, userAID)
	require.NoError(t, err)
	assert.False(t, isOwner, "User should not own another user's resource")
}

func TestPermissionMatrix_CommentRules(t *testing.T) {
	// Verify comment permission rules exist
	commentRules := []struct {
		action       Action
		shouldExist  bool
		requireOwner bool
	}{
		{ActionCreate, true, false},
		{ActionRead, true, false},
		{ActionUpdate, true, true},
		{ActionDelete, true, true},
	}

	for _, rule := range commentRules {
		found := false
		for _, perm := range PermissionMatrix {
			if perm.Resource == ResourceTypeComment && perm.Action == rule.action {
				found = true
				assert.Equal(t, rule.requireOwner, perm.RequiresOwner,
					"Comment %s ownership requirement mismatch", rule.action)
				break
			}
		}
		if rule.shouldExist {
			assert.True(t, found, "Comment %s rule should exist", rule.action)
		}
	}
}

func TestPermissionMatrix_UserRules(t *testing.T) {
	// Verify user permission rules
	userRules := []struct {
		action       Action
		shouldExist  bool
		requireOwner bool
	}{
		{ActionRead, true, false},  // Public profiles
		{ActionUpdate, true, true}, // Only owner can update
		{ActionDelete, true, true}, // Owner or admin can delete
	}

	for _, rule := range userRules {
		found := false
		for _, perm := range PermissionMatrix {
			if perm.Resource == ResourceTypeUser && perm.Action == rule.action {
				found = true
				assert.Equal(t, rule.requireOwner, perm.RequiresOwner,
					"User %s ownership requirement mismatch", rule.action)
				break
			}
		}
		if rule.shouldExist {
			assert.True(t, found, "User %s rule should exist", rule.action)
		}
	}
}

func TestPermissionMatrix_SubscriptionRules(t *testing.T) {
	// Verify subscription permission rules - all require ownership
	subscriptionRules := []struct {
		action       Action
		shouldExist  bool
		requireOwner bool
	}{
		{ActionRead, true, true},
		{ActionUpdate, true, true},
		{ActionDelete, true, true},
	}

	for _, rule := range subscriptionRules {
		found := false
		for _, perm := range PermissionMatrix {
			if perm.Resource == ResourceTypeSubscription && perm.Action == rule.action {
				found = true
				assert.True(t, perm.RequiresOwner,
					"Subscription %s should require ownership", rule.action)
				break
			}
		}
		if rule.shouldExist {
			assert.True(t, found, "Subscription %s rule should exist", rule.action)
		}
	}
}

func TestCanAccessResource_NoRuleFound(t *testing.T) {
	userID := uuid.New()
	resourceID := uuid.New()

	user := &models.User{
		ID:          userID,
		Role:        models.RoleUser,
		AccountType: models.AccountTypeMember,
	}

	checker := &MockChecker{isOwner: false}

	// Use a non-existent resource type
	authCtx := &AuthorizationContext{
		UserID:       userID,
		User:         user,
		ResourceID:   resourceID,
		Action:       ActionCreate,
		ResourceType: ResourceType("nonexistent"),
	}

	hasAccess, err := CanAccessResource(authCtx, checker)
	assert.Error(t, err, "Should return error for non-existent rule")
	assert.False(t, hasAccess)
	assert.Contains(t, err.Error(), "no permission rule found")
}
