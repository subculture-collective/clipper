package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/services"
)

// ModerationHandler handles moderation operations
type ModerationHandler struct {
	moderationEventService *services.ModerationEventService
	abuseDetector          *services.SubmissionAbuseDetector
}

// NewModerationHandler creates a new ModerationHandler
func NewModerationHandler(moderationEventService *services.ModerationEventService, abuseDetector *services.SubmissionAbuseDetector) *ModerationHandler {
	return &ModerationHandler{
		moderationEventService: moderationEventService,
		abuseDetector:          abuseDetector,
	}
}

// GetPendingEvents retrieves pending moderation events
// GET /admin/moderation/events
func (h *ModerationHandler) GetPendingEvents(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	events, err := h.moderationEventService.GetPendingEvents(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve pending events",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    events,
		"meta": gin.H{
			"count": len(events),
			"limit": limit,
		},
	})
}

// GetEventsByType retrieves events filtered by type
// GET /admin/moderation/events/:type
func (h *ModerationHandler) GetEventsByType(c *gin.Context) {
	eventType := services.ModerationEventType(c.Param("type"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	events, err := h.moderationEventService.GetEventsByType(c.Request.Context(), eventType, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve events",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    events,
		"meta": gin.H{
			"type":  eventType,
			"count": len(events),
			"limit": limit,
		},
	})
}

// MarkEventReviewed marks an event as reviewed
// POST /admin/moderation/events/:id/review
func (h *ModerationHandler) MarkEventReviewed(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event ID",
		})
		return
	}

	// Get reviewer ID from context
	reviewerIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	reviewerID := reviewerIDVal.(uuid.UUID)

	err = h.moderationEventService.MarkEventReviewed(c.Request.Context(), eventID, reviewerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to mark event as reviewed",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Event marked as reviewed",
	})
}

// ProcessEvent processes an event with an action
// POST /admin/moderation/events/:id/process
func (h *ModerationHandler) ProcessEvent(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid event ID",
		})
		return
	}

	// Get reviewer ID from context
	reviewerIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	reviewerID := reviewerIDVal.(uuid.UUID)

	var req struct {
		Action string `json:"action" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Action is required",
		})
		return
	}

	err = h.moderationEventService.ProcessEvent(c.Request.Context(), eventID, reviewerID, req.Action)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to process event",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Event processed",
		"action":  req.Action,
	})
}

// GetEventStats returns statistics about moderation events
// GET /admin/moderation/stats
func (h *ModerationHandler) GetEventStats(c *gin.Context) {
	stats, err := h.moderationEventService.GetEventStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve stats",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetUserAbuseStats returns abuse statistics for a specific user
// GET /admin/moderation/abuse/:userId
func (h *ModerationHandler) GetUserAbuseStats(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("userId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	stats, err := h.abuseDetector.GetAbuseStats(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve abuse stats",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
		"user_id": userID,
	})
}
