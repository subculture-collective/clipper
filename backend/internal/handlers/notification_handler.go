package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/services"
)

// NotificationHandler handles notification-related HTTP requests
type NotificationHandler struct {
	notificationService *services.NotificationService
	emailService        *services.EmailService
}

// NewNotificationHandler creates a new NotificationHandler
func NewNotificationHandler(notificationService *services.NotificationService, emailService *services.EmailService) *NotificationHandler {
	return &NotificationHandler{
		notificationService: notificationService,
		emailService:        emailService,
	}
}

// ListNotifications handles GET /notifications
func (h *NotificationHandler) ListNotifications(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Parse query parameters
	filter := c.DefaultQuery("filter", "all") // all, unread, read
	limitStr := c.DefaultQuery("limit", "50")
	pageStr := c.DefaultQuery("page", "1")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 50
	}

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	offset := (page - 1) * limit

	// Get notifications
	notifications, err := h.notificationService.GetUserNotifications(
		c.Request.Context(),
		userID,
		filter,
		limit,
		offset,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve notifications",
		})
		return
	}

	// Get unread count
	unreadCount, err := h.notificationService.GetUnreadCount(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve unread count",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"unread_count":  unreadCount,
		"page":          page,
		"limit":         limit,
		"has_more":      len(notifications) == limit,
	})
}

// GetUnreadCount handles GET /notifications/count
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Get unread count
	count, err := h.notificationService.GetUnreadCount(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve unread count",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"unread_count": count,
	})
}

// MarkAsRead handles PUT /notifications/:id/read
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Parse notification ID
	notificationIDStr := c.Param("id")
	notificationID, err := uuid.Parse(notificationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid notification ID",
		})
		return
	}

	// Mark as read
	err = h.notificationService.MarkAsRead(c.Request.Context(), notificationID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to mark notification as read",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification marked as read",
	})
}

// MarkAllAsRead handles PUT /notifications/read-all
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Mark all as read
	err := h.notificationService.MarkAllAsRead(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to mark all notifications as read",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "All notifications marked as read",
	})
}

// DeleteNotification handles DELETE /notifications/:id
func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Parse notification ID
	notificationIDStr := c.Param("id")
	notificationID, err := uuid.Parse(notificationIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid notification ID",
		})
		return
	}

	// Delete notification
	err = h.notificationService.DeleteNotification(c.Request.Context(), notificationID, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete notification",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification deleted",
	})
}

// GetPreferences handles GET /notifications/preferences
func (h *NotificationHandler) GetPreferences(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Get preferences
	prefs, err := h.notificationService.GetPreferences(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve notification preferences",
		})
		return
	}

	c.JSON(http.StatusOK, prefs)
}

// UpdatePreferences handles PUT /notifications/preferences
func (h *NotificationHandler) UpdatePreferences(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Authentication required",
		})
		return
	}

	userID, ok := userIDVal.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Parse request body
	var prefs models.NotificationPreferences
	if err := c.ShouldBindJSON(&prefs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// Set user ID
	prefs.UserID = userID

	// Update preferences
	err := h.notificationService.UpdatePreferences(c.Request.Context(), &prefs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update notification preferences",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "Notification preferences updated",
		"preferences": prefs,
	})
}

// Unsubscribe handles GET /notifications/unsubscribe (email unsubscribe)
func (h *NotificationHandler) Unsubscribe(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing unsubscribe token",
		})
		return
	}

	if h.emailService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Email service not configured",
		})
		return
	}

	// Validate token
	tokenRecord, err := h.emailService.ValidateUnsubscribeToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid or expired unsubscribe token",
		})
		return
	}

	// Get current preferences
	prefs, err := h.notificationService.GetPreferences(c.Request.Context(), tokenRecord.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get notification preferences",
		})
		return
	}

	// Update preferences based on token type
	if tokenRecord.NotificationType == nil {
		// Unsubscribe from all email notifications
		prefs.EmailEnabled = false
	} else {
		// Unsubscribe from specific notification type
		switch *tokenRecord.NotificationType {
		case models.NotificationTypeReply:
			prefs.NotifyReplies = false
		case models.NotificationTypeMention:
			prefs.NotifyMentions = false
		}
	}

	// Save updated preferences
	err = h.notificationService.UpdatePreferences(c.Request.Context(), prefs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update preferences",
		})
		return
	}

	// Mark token as used
	err = h.emailService.UseUnsubscribeToken(c.Request.Context(), token)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process unsubscribe",
		})
		return
	}

	// Return success response
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "You have been successfully unsubscribed from email notifications.",
	})
}
