package middleware

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
)

// RequirePermission creates middleware that requires a specific permission
// For community moderators, it also validates channel scope if a channel_id is provided in the request
func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user from context (set by AuthMiddleware)
		userInterface, exists := c.Get("user")
		if !exists {
			log.Printf("[WARN] Permission check failed: user not authenticated, path=%s, permission=%s", c.Request.URL.Path, permission)
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
			log.Printf("[ERROR] Permission check failed: invalid user format, path=%s, permission=%s", c.Request.URL.Path, permission)
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

		// Check if user has the required permission
		if !user.Can(permission) {
			log.Printf("[WARN] Permission denied: user_id=%s, username=%s, account_type=%s, permission=%s, path=%s",
				user.ID, user.Username, user.GetAccountType(), permission, c.Request.URL.Path)
			c.JSON(http.StatusForbidden, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "Insufficient permissions",
					"details": gin.H{
						"required_permission": permission,
						"account_type":        user.GetAccountType(),
					},
				},
			})
			c.Abort()
			return
		}

		// For community moderators, validate channel scope
		if user.ModeratorScope == models.ModeratorScopeCommunity && len(user.ModerationChannels) > 0 {
			// Check if a channel_id is provided in path params, query params, or JSON body
			channelID := getChannelIDFromRequest(c)
			if channelID != uuid.Nil {
				// Validate that the moderator has access to this channel
				hasAccess := false
				for _, moderatedChannel := range user.ModerationChannels {
					if moderatedChannel == channelID {
						hasAccess = true
						break
					}
				}

				if !hasAccess {
					log.Printf("[WARN] Channel scope violation: user_id=%s, username=%s, permission=%s, channel_id=%s, path=%s",
						user.ID, user.Username, permission, channelID, c.Request.URL.Path)
					c.JSON(http.StatusForbidden, gin.H{
						"success": false,
						"error": gin.H{
							"code":    "FORBIDDEN",
							"message": "Access denied: channel not in moderation scope",
							"details": gin.H{
								"required_permission": permission,
								"account_type":        user.GetAccountType(),
								"channel_id":          channelID,
							},
						},
					})
					c.Abort()
					return
				}
			}
		}

		// Log successful permission check
		log.Printf("[INFO] Permission granted: user_id=%s, username=%s, account_type=%s, permission=%s, path=%s",
			user.ID, user.Username, user.GetAccountType(), permission, c.Request.URL.Path)

		c.Next()
	}
}

// getChannelIDFromRequest extracts channel_id from request path params, query params, or JSON body
func getChannelIDFromRequest(c *gin.Context) uuid.UUID {
	// Try path parameter first
	if channelIDStr := c.Param("channel_id"); channelIDStr != "" {
		if channelID, err := uuid.Parse(channelIDStr); err == nil {
			return channelID
		}
	}

	// Try query parameter
	if channelIDStr := c.Query("channel_id"); channelIDStr != "" {
		if channelID, err := uuid.Parse(channelIDStr); err == nil {
			return channelID
		}
	}

	// Try to get from JSON body (for POST/PUT requests)
	var body struct {
		ChannelID *uuid.UUID `json:"channel_id"`
	}
	if err := c.ShouldBindJSON(&body); err == nil && body.ChannelID != nil {
		return *body.ChannelID
	}

	return uuid.Nil
}

// RequireAnyPermission creates middleware that requires any of the specified permissions
func RequireAnyPermission(permissions ...string) gin.HandlerFunc {
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

		// Check if user has any of the required permissions
		for _, permission := range permissions {
			if user.Can(permission) {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FORBIDDEN",
				"message": "Insufficient permissions",
				"details": gin.H{
					"required_permissions": permissions,
					"account_type":         user.GetAccountType(),
				},
			},
		})
		c.Abort()
	}
}

// RequireAccountType creates middleware that requires a specific account type
func RequireAccountType(accountTypes ...string) gin.HandlerFunc {
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

		userAccountType := user.GetAccountType()

		// Check if user has the required account type
		for _, accountType := range accountTypes {
			if userAccountType == accountType {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error": gin.H{
				"code":    "FORBIDDEN",
				"message": "Insufficient account type",
				"details": gin.H{
					"required_account_types": accountTypes,
					"current_account_type":   userAccountType,
				},
			},
		})
		c.Abort()
	}
}
