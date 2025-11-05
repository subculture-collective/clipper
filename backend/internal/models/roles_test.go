package models

import (
	"testing"

	"github.com/google/uuid"
)

func TestIsValidRole(t *testing.T) {
	tests := []struct {
		role  string
		valid bool
	}{
		{RoleUser, true},
		{RoleModerator, true},
		{RoleAdmin, true},
		{"invalid", false},
		{"", false},
		{"ADMIN", false}, // case-sensitive
	}

	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			if got := IsValidRole(tt.role); got != tt.valid {
				t.Errorf("IsValidRole(%q) = %v, want %v", tt.role, got, tt.valid)
			}
		})
	}
}

func TestUserHasRole(t *testing.T) {
	user := &User{
		ID:       uuid.New(),
		Username: "testuser",
		Role:     RoleModerator,
	}

	tests := []struct {
		role  string
		hasIt bool
	}{
		{RoleModerator, true},
		{RoleAdmin, false},
		{RoleUser, false},
	}

	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			if got := user.HasRole(tt.role); got != tt.hasIt {
				t.Errorf("HasRole(%q) = %v, want %v", tt.role, got, tt.hasIt)
			}
		})
	}
}

func TestUserHasAnyRole(t *testing.T) {
	user := &User{
		ID:       uuid.New(),
		Username: "testuser",
		Role:     RoleModerator,
	}

	tests := []struct {
		name   string
		roles  []string
		hasAny bool
	}{
		{"has moderator", []string{RoleModerator}, true},
		{"has moderator in list", []string{RoleAdmin, RoleModerator}, true},
		{"has no match", []string{RoleAdmin, RoleUser}, false},
		{"empty list", []string{}, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := user.HasAnyRole(tt.roles...); got != tt.hasAny {
				t.Errorf("HasAnyRole(%v) = %v, want %v", tt.roles, got, tt.hasAny)
			}
		})
	}
}

func TestUserIsAdmin(t *testing.T) {
	tests := []struct {
		role    string
		isAdmin bool
	}{
		{RoleAdmin, true},
		{RoleModerator, false},
		{RoleUser, false},
	}

	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			user := &User{
				ID:       uuid.New(),
				Username: "testuser",
				Role:     tt.role,
			}
			if got := user.IsAdmin(); got != tt.isAdmin {
				t.Errorf("IsAdmin() = %v, want %v for role %q", got, tt.isAdmin, tt.role)
			}
		})
	}
}

func TestUserIsModerator(t *testing.T) {
	tests := []struct {
		role        string
		isModerator bool
	}{
		{RoleAdmin, false},
		{RoleModerator, true},
		{RoleUser, false},
	}

	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			user := &User{
				ID:       uuid.New(),
				Username: "testuser",
				Role:     tt.role,
			}
			if got := user.IsModerator(); got != tt.isModerator {
				t.Errorf("IsModerator() = %v, want %v for role %q", got, tt.isModerator, tt.role)
			}
		})
	}
}

func TestUserIsModeratorOrAdmin(t *testing.T) {
	tests := []struct {
		role               string
		isModeratorOrAdmin bool
	}{
		{RoleAdmin, true},
		{RoleModerator, true},
		{RoleUser, false},
	}

	for _, tt := range tests {
		t.Run(tt.role, func(t *testing.T) {
			user := &User{
				ID:       uuid.New(),
				Username: "testuser",
				Role:     tt.role,
			}
			if got := user.IsModeratorOrAdmin(); got != tt.isModeratorOrAdmin {
				t.Errorf("IsModeratorOrAdmin() = %v, want %v for role %q", got, tt.isModeratorOrAdmin, tt.role)
			}
		})
	}
}

func TestRoleConstants(t *testing.T) {
	// Ensure role constants have expected values
	if RoleUser != "user" {
		t.Errorf("RoleUser = %q, want %q", RoleUser, "user")
	}
	if RoleModerator != "moderator" {
		t.Errorf("RoleModerator = %q, want %q", RoleModerator, "moderator")
	}
	if RoleAdmin != "admin" {
		t.Errorf("RoleAdmin = %q, want %q", RoleAdmin, "admin")
	}
}
