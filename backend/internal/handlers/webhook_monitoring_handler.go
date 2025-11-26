package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/services"
)

// WebhookMonitoringHandler handles webhook monitoring endpoints
type WebhookMonitoringHandler struct {
	webhookRetryService *services.WebhookRetryService
}

// NewWebhookMonitoringHandler creates a new webhook monitoring handler
func NewWebhookMonitoringHandler(webhookRetryService *services.WebhookRetryService) *WebhookMonitoringHandler {
	return &WebhookMonitoringHandler{
		webhookRetryService: webhookRetryService,
	}
}

// GetWebhookRetryStats returns webhook retry queue statistics
// @Summary Get webhook retry queue stats
// @Description Returns statistics about the webhook retry queue and dead-letter queue
// @Tags monitoring
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 500 {object} map[string]string
// @Router /health/webhooks [get]
func (h *WebhookMonitoringHandler) GetWebhookRetryStats(c *gin.Context) {
	stats, err := h.webhookRetryService.GetRetryQueueStats(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve webhook stats",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "healthy",
		"webhooks": stats,
	})
}
