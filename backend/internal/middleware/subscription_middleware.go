package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/services"
)

// RequireProSubscription middleware ensures the user has an active Pro subscription
func RequireProSubscription(subscriptionService *services.SubscriptionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get authenticated user from context
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		currentUser, ok := user.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user information"})
			c.Abort()
			return
		}

		// Check if user has active Pro subscription
		if !subscriptionService.IsProUser(c.Request.Context(), currentUser.ID) {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Pro subscription required",
				"message": "This feature requires an active Pro subscription",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireActiveSubscription middleware ensures the user has any active subscription
func RequireActiveSubscription(subscriptionService *services.SubscriptionService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get authenticated user from context
		user, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		currentUser, ok := user.(*models.User)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user information"})
			c.Abort()
			return
		}

		// Check if user has any active subscription
		if !subscriptionService.HasActiveSubscription(c.Request.Context(), currentUser.ID) {
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Active subscription required",
				"message": "This feature requires an active subscription",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
