package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/services"
)

// EventHandler handles feed analytics event tracking
type EventHandler struct {
	eventTracker *services.EventTracker
}

// NewEventHandler creates a new event handler
func NewEventHandler(eventTracker *services.EventTracker) *EventHandler {
	return &EventHandler{
		eventTracker: eventTracker,
	}
}

// TrackEvent handles POST /api/events
// Tracks a single event or batch of events
func (h *EventHandler) TrackEvent(c *gin.Context) {
	// Check if it's a batch request
	var batchReq models.BatchEventsRequest
	if err := c.ShouldBindJSON(&batchReq); err == nil && len(batchReq.Events) > 0 {
		h.trackBatchEvents(c, batchReq)
		return
	}

	// Single event request
	var req models.TrackEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	// Get user ID if authenticated
	var userID *uuid.UUID
	if userInterface, exists := c.Get("user"); exists {
		if user, ok := userInterface.(*models.User); ok {
			userID = &user.ID
		}
	}

	// Get or generate session ID
	sessionID := c.GetHeader("X-Session-ID")
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	event := models.Event{
		EventType:  req.EventType,
		UserID:     userID,
		SessionID:  sessionID,
		Properties: req.Properties,
	}

	if err := h.eventTracker.TrackEvent(event); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to track event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "event tracked successfully"})
}

// trackBatchEvents handles batch event tracking
func (h *EventHandler) trackBatchEvents(c *gin.Context, batchReq models.BatchEventsRequest) {
	// Get user ID if authenticated
	var userID *uuid.UUID
	if userInterface, exists := c.Get("user"); exists {
		if user, ok := userInterface.(*models.User); ok {
			userID = &user.ID
		}
	}

	// Get or generate session ID
	sessionID := c.GetHeader("X-Session-ID")
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	successCount := 0
	for _, eventReq := range batchReq.Events {
		event := models.Event{
			EventType:  eventReq.EventType,
			UserID:     userID,
			SessionID:  sessionID,
			Properties: eventReq.Properties,
		}

		if err := h.eventTracker.TrackEvent(event); err == nil {
			successCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "batch events tracked",
		"success_count": successCount,
		"total_count":   len(batchReq.Events),
	})
}

// GetFeedMetrics handles GET /api/feed/analytics
// Returns aggregated feed metrics
func (h *EventHandler) GetFeedMetrics(c *gin.Context) {
	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))
	if hours <= 0 || hours > 720 { // Max 30 days
		hours = 24
	}

	metrics, err := h.eventTracker.GetFeedMetrics(c.Request.Context(), hours)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve metrics"})
		return
	}

	c.JSON(http.StatusOK, metrics)
}

// GetHourlyMetrics handles GET /api/feed/analytics/hourly
// Returns hourly aggregated metrics for a specific event type
func (h *EventHandler) GetHourlyMetrics(c *gin.Context) {
	eventType := c.Query("event_type")
	if eventType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "event_type parameter is required"})
		return
	}

	hours, _ := strconv.Atoi(c.DefaultQuery("hours", "24"))
	if hours <= 0 || hours > 720 { // Max 30 days
		hours = 24
	}

	metrics, err := h.eventTracker.GetHourlyMetrics(c.Request.Context(), eventType, hours)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve hourly metrics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"event_type": eventType,
		"hours":      hours,
		"metrics":    metrics,
	})
}
