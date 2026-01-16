package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// ServiceStatusHandler handles service status HTTP requests
type ServiceStatusHandler struct {
	statusService       *services.ServiceStatusService
	incidentService     *services.IncidentService
	subscriptionService *services.StatusSubscriptionService
	authService         *services.AuthService
}

// NewServiceStatusHandler creates a new service status handler
func NewServiceStatusHandler(
	statusService *services.ServiceStatusService,
	incidentService *services.IncidentService,
	subscriptionService *services.StatusSubscriptionService,
	authService *services.AuthService,
) *ServiceStatusHandler {
	return &ServiceStatusHandler{
		statusService:       statusService,
		incidentService:     incidentService,
		subscriptionService: subscriptionService,
		authService:         authService,
	}
}

// GetAllServiceStatus returns the current status of all services
// GET /api/v1/status/services
func (h *ServiceStatusHandler) GetAllServiceStatus(c *gin.Context) {
	ctx := c.Request.Context()

	statuses, err := h.statusService.GetAllServiceStatus(ctx)
	if err != nil {
		utils.GetLogger().Error("Failed to get all service status", err, nil)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get service status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    statuses,
	})
}

// GetServiceStatus returns the status of a specific service
// GET /api/v1/status/services/:name
func (h *ServiceStatusHandler) GetServiceStatus(c *gin.Context) {
	serviceName := c.Param("name")
	if serviceName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "service name is required"})
		return
	}

	ctx := c.Request.Context()

	status, err := h.statusService.GetServiceStatus(ctx, serviceName)
	if err != nil {
		utils.GetLogger().Error("Failed to get service status", err, map[string]interface{}{"service": serviceName})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get service status"})
		return
	}

	if status == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "service not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
	})
}

// GetStatusHistory returns historical status data
// GET /api/v1/status/services/:name/history
func (h *ServiceStatusHandler) GetStatusHistory(c *gin.Context) {
	serviceName := c.Param("name")
	if serviceName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "service name is required"})
		return
	}

	// Parse timeframe parameter (default: 24h)
	timeframeStr := c.DefaultQuery("timeframe", "24h")
	timeframe, err := time.ParseDuration(timeframeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid timeframe format"})
		return
	}

	// Limit maximum timeframe to 30 days
	maxTimeframe := 30 * 24 * time.Hour
	if timeframe > maxTimeframe {
		timeframe = maxTimeframe
	}

	ctx := c.Request.Context()
	since := time.Now().Add(-timeframe)

	history, err := h.statusService.GetStatusHistory(ctx, serviceName, since)
	if err != nil {
		utils.GetLogger().Error("Failed to get status history", err, map[string]interface{}{
			"service":   serviceName,
			"timeframe": timeframeStr,
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get status history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    history,
		"meta": gin.H{
			"timeframe": timeframeStr,
			"since":     since,
		},
	})
}

// GetAllStatusHistory returns historical data for all services
// GET /api/v1/status/history
func (h *ServiceStatusHandler) GetAllStatusHistory(c *gin.Context) {
	// Parse timeframe parameter (default: 24h)
	timeframeStr := c.DefaultQuery("timeframe", "24h")
	timeframe, err := time.ParseDuration(timeframeStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid timeframe format"})
		return
	}

	// Limit maximum timeframe to 30 days
	maxTimeframe := 30 * 24 * time.Hour
	if timeframe > maxTimeframe {
		timeframe = maxTimeframe
	}

	ctx := c.Request.Context()
	since := time.Now().Add(-timeframe)

	history, err := h.statusService.GetAllStatusHistory(ctx, since)
	if err != nil {
		utils.GetLogger().Error("Failed to get all status history", err, map[string]interface{}{
			"timeframe": timeframeStr,
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get status history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    history,
		"meta": gin.H{
			"timeframe": timeframeStr,
			"since":     since,
		},
	})
}

// GetOverallStatus returns the overall system status
// GET /api/v1/status/overall
func (h *ServiceStatusHandler) GetOverallStatus(c *gin.Context) {
	ctx := c.Request.Context()

	overallStatus, err := h.statusService.GetOverallStatus(ctx)
	if err != nil {
		utils.GetLogger().Error("Failed to get overall status", err, nil)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get overall status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"status": overallStatus,
		},
	})
}

// CreateIncident creates a new incident (admin only)
// POST /api/v1/status/incidents
func (h *ServiceStatusHandler) CreateIncident(c *gin.Context) {
	var req models.CreateIncidentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	userID, ok := userIDInterface.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID"})
		return
	}

	ctx := c.Request.Context()

	incident, err := h.incidentService.CreateIncident(
		ctx,
		req.ServiceName,
		req.Title,
		req.Description,
		req.Severity,
		&userID,
	)
	if err != nil {
		utils.GetLogger().Error("Failed to create incident", err, map[string]interface{}{
			"user_id": userID,
			"service": req.ServiceName,
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create incident"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    incident,
	})
}

// GetIncident returns a specific incident
// GET /api/v1/status/incidents/:id
func (h *ServiceStatusHandler) GetIncident(c *gin.Context) {
	incidentIDStr := c.Param("id")
	incidentID, err := uuid.Parse(incidentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	ctx := c.Request.Context()

	incident, err := h.incidentService.GetIncident(ctx, incidentID)
	if err != nil {
		utils.GetLogger().Error("Failed to get incident", err, map[string]interface{}{"incident_id": incidentID})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get incident"})
		return
	}

	if incident == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "incident not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    incident,
	})
}

// ListIncidents returns a list of incidents
// GET /api/v1/status/incidents
func (h *ServiceStatusHandler) ListIncidents(c *gin.Context) {
	var serviceName *string
	if s := c.Query("service"); s != "" {
		serviceName = &s
	}

	var status *string
	if s := c.Query("status"); s != "" {
		status = &s
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	ctx := c.Request.Context()

	incidents, total, err := h.incidentService.ListIncidents(ctx, serviceName, status, limit, offset)
	if err != nil {
		utils.GetLogger().Error("Failed to list incidents", err, nil)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list incidents"})
		return
	}

	totalPages := (total + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    incidents,
		"meta": gin.H{
			"page":        page,
			"limit":       limit,
			"total_items": total,
			"total_pages": totalPages,
		},
	})
}

// UpdateIncident adds an update to an incident (admin only)
// POST /api/v1/status/incidents/:id/updates
func (h *ServiceStatusHandler) UpdateIncident(c *gin.Context) {
	incidentIDStr := c.Param("id")
	incidentID, err := uuid.Parse(incidentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	var req models.UpdateIncidentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	userID, ok := userIDInterface.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID"})
		return
	}

	ctx := c.Request.Context()

	err = h.incidentService.UpdateIncident(ctx, incidentID, req.Status, req.Message, &userID)
	if err != nil {
		utils.GetLogger().Error("Failed to update incident", err, map[string]interface{}{
			"incident_id": incidentID,
			"user_id":     userID,
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update incident"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "incident updated successfully",
	})
}

// GetIncidentUpdates returns all updates for an incident
// GET /api/v1/status/incidents/:id/updates
func (h *ServiceStatusHandler) GetIncidentUpdates(c *gin.Context) {
	incidentIDStr := c.Param("id")
	incidentID, err := uuid.Parse(incidentIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid incident ID"})
		return
	}

	ctx := c.Request.Context()

	updates, err := h.incidentService.GetIncidentUpdates(ctx, incidentID)
	if err != nil {
		utils.GetLogger().Error("Failed to get incident updates", err, map[string]interface{}{"incident_id": incidentID})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get incident updates"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    updates,
	})
}

// GetActiveIncidents returns all active incidents
// GET /api/v1/status/incidents/active
func (h *ServiceStatusHandler) GetActiveIncidents(c *gin.Context) {
	ctx := c.Request.Context()

	incidents, err := h.incidentService.GetActiveIncidents(ctx)
	if err != nil {
		utils.GetLogger().Error("Failed to get active incidents", err, nil)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get active incidents"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    incidents,
	})
}

// CreateSubscription creates a new status subscription
// POST /api/v1/status/subscriptions
func (h *ServiceStatusHandler) CreateSubscription(c *gin.Context) {
	var req models.CreateSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from context
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	userID, ok := userIDInterface.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID"})
		return
	}

	ctx := c.Request.Context()

	subscription, err := h.subscriptionService.CreateSubscription(
		ctx,
		userID,
		req.ServiceName,
		req.NotificationType,
		req.WebhookURL,
	)
	if err != nil {
		utils.GetLogger().Error("Failed to create subscription", err, map[string]interface{}{"user_id": userID})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create subscription"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    subscription,
	})
}

// GetUserSubscriptions returns all subscriptions for the authenticated user
// GET /api/v1/status/subscriptions
func (h *ServiceStatusHandler) GetUserSubscriptions(c *gin.Context) {
	// Get user ID from context
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	userID, ok := userIDInterface.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID"})
		return
	}

	ctx := c.Request.Context()

	subscriptions, err := h.subscriptionService.GetUserSubscriptions(ctx, userID)
	if err != nil {
		utils.GetLogger().Error("Failed to get user subscriptions", err, map[string]interface{}{"user_id": userID})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get subscriptions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    subscriptions,
	})
}

// DeleteSubscription deletes a status subscription
// DELETE /api/v1/status/subscriptions/:id
func (h *ServiceStatusHandler) DeleteSubscription(c *gin.Context) {
	subscriptionIDStr := c.Param("id")
	subscriptionID, err := uuid.Parse(subscriptionIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid subscription ID"})
		return
	}

	// Get user ID from context
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}

	userID, ok := userIDInterface.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user ID"})
		return
	}

	ctx := c.Request.Context()

	// Verify subscription belongs to user
	subscription, err := h.subscriptionService.GetSubscription(ctx, subscriptionID)
	if err != nil {
		utils.GetLogger().Error("Failed to get subscription", err, map[string]interface{}{
			"subscription_id": subscriptionID,
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get subscription"})
		return
	}

	if subscription == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "subscription not found"})
		return
	}

	if subscription.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "access denied"})
		return
	}

	err = h.subscriptionService.DeleteSubscription(ctx, subscriptionID)
	if err != nil {
		utils.GetLogger().Error("Failed to delete subscription", err, map[string]interface{}{
			"subscription_id": subscriptionID,
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete subscription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "subscription deleted successfully",
	})
}
