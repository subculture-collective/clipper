package models

// User role constants
const (
	RoleUser      = "user"
	RoleModerator = "moderator"
	RoleAdmin     = "admin"
)

// Account type constants
const (
	AccountTypeMember             = "member"
	AccountTypeBroadcaster        = "broadcaster"
	AccountTypeModerator          = "moderator"
	AccountTypeCommunityModerator = "community_moderator"
	AccountTypeAdmin              = "admin"
)

// Permission constants
const (
	// Member permissions
	PermissionCreateSubmission = "create:submission"
	PermissionCreateComment    = "create:comment"
	PermissionCreateVote       = "create:vote"
	PermissionCreateFollow     = "create:follow"

	// Broadcaster permissions (includes all member permissions)
	PermissionViewBroadcasterAnalytics = "view:broadcaster_analytics"
	PermissionClaimBroadcasterProfile  = "claim:broadcaster_profile"

	// Moderator permissions (includes all broadcaster permissions)
	PermissionModerateContent      = "moderate:content"
	PermissionModerateUsers        = "moderate:users"
	PermissionCreateDiscoveryLists = "create:discovery_lists"

	// Admin permissions (includes all permissions)
	PermissionManageUsers            = "manage:users"
	PermissionManageSystem           = "manage:system"
	PermissionViewAnalyticsDashboard = "view:analytics_dashboard"
	PermissionModerateOverride       = "moderate:override"
)

// accountTypePermissions maps account types to their permissions
var accountTypePermissions = map[string][]string{
	AccountTypeMember: {
		PermissionCreateSubmission,
		PermissionCreateComment,
		PermissionCreateVote,
		PermissionCreateFollow,
	},
	AccountTypeBroadcaster: {
		// All member permissions
		PermissionCreateSubmission,
		PermissionCreateComment,
		PermissionCreateVote,
		PermissionCreateFollow,
		// Broadcaster-specific permissions
		PermissionViewBroadcasterAnalytics,
		PermissionClaimBroadcasterProfile,
	},
	AccountTypeModerator: {
		// All broadcaster permissions
		PermissionCreateSubmission,
		PermissionCreateComment,
		PermissionCreateVote,
		PermissionCreateFollow,
		PermissionViewBroadcasterAnalytics,
		PermissionClaimBroadcasterProfile,
		// Moderator-specific permissions
		PermissionModerateContent,
		PermissionModerateUsers,
		PermissionCreateDiscoveryLists,
		// User management permissions
		PermissionManageUsers,
	},
	// Community Moderator: Channel-scoped moderator with limited permissions
	// Inherits broadcaster permissions + basic moderation capabilities
	// NOTE: Currently permissions are global. Future issues will add channel-scoping
	// logic to limit these permissions to only the channels where the user is assigned
	// as a community moderator
	AccountTypeCommunityModerator: {
		// All broadcaster permissions
		PermissionCreateSubmission,
		PermissionCreateComment,
		PermissionCreateVote,
		PermissionCreateFollow,
		PermissionViewBroadcasterAnalytics,
		PermissionClaimBroadcasterProfile,
		// Limited moderation permissions (channel-scoped)
		PermissionModerateContent,
		PermissionModerateUsers,
	},
	AccountTypeAdmin: {
		// All moderator permissions
		PermissionCreateSubmission,
		PermissionCreateComment,
		PermissionCreateVote,
		PermissionCreateFollow,
		PermissionViewBroadcasterAnalytics,
		PermissionClaimBroadcasterProfile,
		PermissionModerateContent,
		PermissionModerateUsers,
		PermissionCreateDiscoveryLists,
		// Admin-specific permissions
		PermissionManageUsers,
		PermissionManageSystem,
		PermissionViewAnalyticsDashboard,
		PermissionModerateOverride,
	},
}

// IsValidRole checks if a role string is valid
func IsValidRole(role string) bool {
	switch role {
	case RoleUser, RoleModerator, RoleAdmin:
		return true
	default:
		return false
	}
}

// IsValidAccountType checks if an account type string is valid
func IsValidAccountType(accountType string) bool {
	switch accountType {
	case AccountTypeMember, AccountTypeBroadcaster, AccountTypeModerator, AccountTypeCommunityModerator, AccountTypeAdmin:
		return true
	default:
		return false
	}
}

// GetAccountTypePermissions returns all permissions for a given account type
func GetAccountTypePermissions(accountType string) []string {
	if permissions, ok := accountTypePermissions[accountType]; ok {
		return permissions
	}
	// Default to member permissions if account type is unknown
	return accountTypePermissions[AccountTypeMember]
}

// HasRole checks if a user has the specified role
func (u *User) HasRole(role string) bool {
	return u.Role == role
}

// HasAnyRole checks if a user has any of the specified roles
func (u *User) HasAnyRole(roles ...string) bool {
	for _, role := range roles {
		if u.Role == role {
			return true
		}
	}
	return false
}

// IsAdmin checks if the user is an admin
func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

// IsModerator checks if the user is a moderator
func (u *User) IsModerator() bool {
	return u.Role == RoleModerator
}

// IsModeratorOrAdmin checks if the user is a moderator or admin
func (u *User) IsModeratorOrAdmin() bool {
	return u.Role == RoleModerator || u.Role == RoleAdmin
}

// Can checks if a user has a specific permission based on their account type.
// Note: This system supports dual permission paths for backward compatibility:
// - Role (admin/moderator/user): Legacy system for basic access control
// - AccountType (admin/moderator/broadcaster/member): New granular permission system
// Both Role=admin and AccountType=admin grant all permissions.
// In most cases, AccountType should be the primary source of permissions,
// while Role is used for basic authentication and route protection.
func (u *User) Can(permission string) bool {
	// Admins have all permissions (checks both Role and AccountType for compatibility)
	if u.IsAdmin() || u.AccountType == AccountTypeAdmin {
		return true
	}

	// Check if the user's account type has this permission
	permissions := GetAccountTypePermissions(u.AccountType)
	for _, p := range permissions {
		if p == permission {
			return true
		}
	}
	return false
}

// GetAccountType returns the user's account type, with fallback to member
func (u *User) GetAccountType() string {
	if u.AccountType == "" {
		return AccountTypeMember
	}
	return u.AccountType
}

// GetPermissions returns all permissions for the user's account type
func (u *User) GetPermissions() []string {
	accountType := u.GetAccountType()
	return GetAccountTypePermissions(accountType)
}
