package models

// User role constants
const (
	RoleUser      = "user"
	RoleModerator = "moderator"
	RoleAdmin     = "admin"
)

// IsValidRole checks if a role string is valid
func IsValidRole(role string) bool {
	switch role {
	case RoleUser, RoleModerator, RoleAdmin:
		return true
	default:
		return false
	}
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
