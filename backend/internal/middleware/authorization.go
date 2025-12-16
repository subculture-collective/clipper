package middleware

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// ResourceType represents the type of resource being accessed
type ResourceType string

const (
	ResourceTypeComment      ResourceType = "comment"
	ResourceTypeClip         ResourceType = "clip"
	ResourceTypeUser         ResourceType = "user"
	ResourceTypeFavorite     ResourceType = "favorite"
	ResourceTypeSubscription ResourceType = "subscription"
	ResourceTypeSubmission   ResourceType = "submission"
)

// Action represents the type of action being performed
type Action string

const (
	ActionCreate Action = "create"
	ActionRead   Action = "read"
	ActionUpdate Action = "update"
	ActionDelete Action = "delete"
)

// Permission defines a permission rule for a resource
type Permission struct {
	Resource         ResourceType
	Action           Action
	RequiresOwner    bool
	AllowedRoles     []string
	AllowedAccountTypes []string
}

// PermissionMatrix defines all authorization rules
var PermissionMatrix = []Permission{
	// Comment permissions
	{Resource: ResourceTypeComment, Action: ActionCreate, RequiresOwner: false, AllowedAccountTypes: []string{models.AccountTypeMember, models.AccountTypeBroadcaster, models.AccountTypeModerator, models.AccountTypeAdmin}},
	{Resource: ResourceTypeComment, Action: ActionRead, RequiresOwner: false, AllowedAccountTypes: []string{models.AccountTypeMember, models.AccountTypeBroadcaster, models.AccountTypeModerator, models.AccountTypeAdmin}},
	{Resource: ResourceTypeComment, Action: ActionUpdate, RequiresOwner: true, AllowedRoles: []string{models.RoleAdmin}},
	{Resource: ResourceTypeComment, Action: ActionDelete, RequiresOwner: true, AllowedRoles: []string{models.RoleModerator, models.RoleAdmin}},

	// Clip permissions
	{Resource: ResourceTypeClip, Action: ActionCreate, RequiresOwner: false, AllowedAccountTypes: []string{models.AccountTypeMember, models.AccountTypeBroadcaster, models.AccountTypeModerator, models.AccountTypeAdmin}},
	{Resource: ResourceTypeClip, Action: ActionRead, RequiresOwner: false},
	{Resource: ResourceTypeClip, Action: ActionUpdate, RequiresOwner: true, AllowedRoles: []string{models.RoleAdmin}},
	{Resource: ResourceTypeClip, Action: ActionDelete, RequiresOwner: false, AllowedRoles: []string{models.RoleAdmin}},

	// User permissions
	{Resource: ResourceTypeUser, Action: ActionRead, RequiresOwner: false},
	{Resource: ResourceTypeUser, Action: ActionUpdate, RequiresOwner: true},
	{Resource: ResourceTypeUser, Action: ActionDelete, RequiresOwner: true, AllowedRoles: []string{models.RoleAdmin}},

	// Favorite permissions
	{Resource: ResourceTypeFavorite, Action: ActionCreate, RequiresOwner: true},
	{Resource: ResourceTypeFavorite, Action: ActionRead, RequiresOwner: true},
	{Resource: ResourceTypeFavorite, Action: ActionDelete, RequiresOwner: true},

	// Subscription permissions
	{Resource: ResourceTypeSubscription, Action: ActionRead, RequiresOwner: true},
	{Resource: ResourceTypeSubscription, Action: ActionUpdate, RequiresOwner: true},
	{Resource: ResourceTypeSubscription, Action: ActionDelete, RequiresOwner: true, AllowedRoles: []string{models.RoleAdmin}},

	// Submission permissions
	{Resource: ResourceTypeSubmission, Action: ActionCreate, RequiresOwner: false, AllowedAccountTypes: []string{models.AccountTypeMember, models.AccountTypeBroadcaster, models.AccountTypeModerator, models.AccountTypeAdmin}},
	{Resource: ResourceTypeSubmission, Action: ActionRead, RequiresOwner: false},
	{Resource: ResourceTypeSubmission, Action: ActionUpdate, RequiresOwner: false, AllowedRoles: []string{models.RoleModerator, models.RoleAdmin}},
	{Resource: ResourceTypeSubmission, Action: ActionDelete, RequiresOwner: false, AllowedRoles: []string{models.RoleModerator, models.RoleAdmin}},
}

// ResourceOwnershipChecker defines the interface for checking resource ownership
type ResourceOwnershipChecker interface {
	IsOwner(ctx context.Context, resourceID, userID uuid.UUID) (bool, error)
}

// CommentOwnershipChecker checks comment ownership
type CommentOwnershipChecker struct {
	repo *repository.CommentRepository
}

// NewCommentOwnershipChecker creates a new CommentOwnershipChecker
func NewCommentOwnershipChecker(repo *repository.CommentRepository) *CommentOwnershipChecker {
	return &CommentOwnershipChecker{repo: repo}
}

// IsOwner checks if the user owns the comment
func (c *CommentOwnershipChecker) IsOwner(ctx context.Context, resourceID, userID uuid.UUID) (bool, error) {
	comment, err := c.repo.GetByID(ctx, resourceID, nil)
	if err != nil {
		return false, err
	}
	return comment.UserID == userID, nil
}

// ClipOwnershipChecker checks clip ownership
type ClipOwnershipChecker struct {
	repo *repository.ClipRepository
}

// NewClipOwnershipChecker creates a new ClipOwnershipChecker
func NewClipOwnershipChecker(repo *repository.ClipRepository) *ClipOwnershipChecker {
	return &ClipOwnershipChecker{repo: repo}
}

// IsOwner checks if the user owns the clip (submitted it)
func (c *ClipOwnershipChecker) IsOwner(ctx context.Context, resourceID, userID uuid.UUID) (bool, error) {
	clip, err := c.repo.GetByID(ctx, resourceID)
	if err != nil {
		return false, err
	}
	// Check if the user submitted this clip
	return clip.SubmittedByUserID != nil && *clip.SubmittedByUserID == userID, nil
}

// UserOwnershipChecker checks user resource ownership (for settings, profile, etc.)
type UserOwnershipChecker struct{}

// NewUserOwnershipChecker creates a new UserOwnershipChecker
func NewUserOwnershipChecker() *UserOwnershipChecker {
	return &UserOwnershipChecker{}
}

// IsOwner checks if the resourceID matches the userID (accessing own profile)
func (u *UserOwnershipChecker) IsOwner(ctx context.Context, resourceID, userID uuid.UUID) (bool, error) {
	return resourceID == userID, nil
}

// AuthorizationContext holds authorization information
type AuthorizationContext struct {
	UserID      uuid.UUID
	User        *models.User
	ResourceID  uuid.UUID
	Action      Action
	ResourceType ResourceType
}

// CanAccessResource checks if a user can perform an action on a resource
func CanAccessResource(ctx *AuthorizationContext, checker ResourceOwnershipChecker) (bool, error) {
	// Find the permission rule
	var rule *Permission
	for _, p := range PermissionMatrix {
		if p.Resource == ctx.ResourceType && p.Action == ctx.Action {
			rule = &p
			break
		}
	}

	if rule == nil {
		// No explicit rule found - deny by default
		return false, fmt.Errorf("no permission rule found for %s:%s", ctx.ResourceType, ctx.Action)
	}

	// Check if ownership is required
	if rule.RequiresOwner {
		isOwner, err := checker.IsOwner(context.Background(), ctx.ResourceID, ctx.UserID)
		if err != nil {
			return false, fmt.Errorf("failed to check ownership: %w", err)
		}
		
		// If owner, allow access
		if isOwner {
			return true, nil
		}

		// If not owner, check if user has elevated permissions
		if ctx.User != nil {
			for _, role := range rule.AllowedRoles {
				if ctx.User.HasRole(role) {
					return true, nil
				}
			}
		}

		// Not owner and no elevated permissions
		return false, nil
	}

	// Check role-based permissions if no ownership required
	if len(rule.AllowedRoles) > 0 {
		if ctx.User != nil {
			for _, role := range rule.AllowedRoles {
				if ctx.User.HasRole(role) {
					return true, nil
				}
			}
		}
		return false, nil
	}

	// Check account type permissions
	if len(rule.AllowedAccountTypes) > 0 {
		if ctx.User != nil {
			userAccountType := ctx.User.GetAccountType()
			for _, accountType := range rule.AllowedAccountTypes {
				if userAccountType == accountType {
					return true, nil
				}
			}
		}
		return false, nil
	}

	// No restrictions - allow access
	return true, nil
}

// RequireResourceOwnership creates middleware that requires resource ownership
// This middleware should be used on routes that modify user-owned resources
func RequireResourceOwnership(resourceType ResourceType, action Action, checker ResourceOwnershipChecker) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user from context (set by AuthMiddleware)
		userInterface, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Authentication required",
				},
			})
			c.Abort()
			return
		}

		user, ok := userInterface.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "INTERNAL_ERROR",
					"message": "Invalid user format",
				},
			})
			c.Abort()
			return
		}

		// Get resource ID from URL parameter
		resourceIDStr := c.Param("id")
		resourceID, err := uuid.Parse(resourceIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "INVALID_ID",
					"message": "Invalid resource ID format",
				},
			})
			c.Abort()
			return
		}

		// Build authorization context
		authCtx := &AuthorizationContext{
			UserID:       user.ID,
			User:         user,
			ResourceID:   resourceID,
			Action:       action,
			ResourceType: resourceType,
		}

		// Check access
		hasAccess, err := CanAccessResource(authCtx, checker)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "AUTHORIZATION_ERROR",
					"message": "Failed to verify permissions",
				},
			})
			c.Abort()
			return
		}

		if !hasAccess {
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "You do not have permission to perform this action",
					"details": gin.H{
						"resource": resourceType,
						"action":   action,
					},
				},
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// LogAuthorizationFailure logs authorization failures for security monitoring
func LogAuthorizationFailure(userID uuid.UUID, resourceType ResourceType, resourceID uuid.UUID, action Action, reason string) {
	// TODO: Implement proper logging to audit log system
	// For now, this is a placeholder for future integration
	fmt.Printf("AUTHORIZATION_FAILURE: user=%s resource=%s:%s action=%s reason=%s\n",
		userID, resourceType, resourceID, action, reason)
}
