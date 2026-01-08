package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/services"
)

// AuditLogHandler handles audit log operations
type AuditLogHandler struct {
	auditLogService *services.AuditLogService
}

// NewAuditLogHandler creates a new AuditLogHandler
func NewAuditLogHandler(auditLogService *services.AuditLogService) *AuditLogHandler {
	return &AuditLogHandler{
		auditLogService: auditLogService,
	}
}

// ListAuditLogs retrieves audit logs with filters
// GET /admin/audit-logs
// Supports filters: moderator_id, action, entity_type, entity_id, channel_id, start_date (RFC3339), end_date (RFC3339)
func (h *AuditLogHandler) ListAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	// Parse filters
	filters, err := services.ParseAuditLogFilters(
		c.Query("moderator_id"),
		c.Query("action"),
		c.Query("entity_type"),
		c.Query("entity_id"),
		c.Query("channel_id"),
		c.Query("start_date"),
		c.Query("end_date"),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	logs, total, err := h.auditLogService.GetAuditLogs(c.Request.Context(), filters, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve audit logs",
		})
		return
	}

	totalPages := (total + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    logs,
		"meta": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// ExportAuditLogs exports audit logs to CSV
// GET /admin/audit-logs/export
// Supports same filters as ListAuditLogs
func (h *AuditLogHandler) ExportAuditLogs(c *gin.Context) {
	// Parse filters
	filters, err := services.ParseAuditLogFilters(
		c.Query("moderator_id"),
		c.Query("action"),
		c.Query("entity_type"),
		c.Query("entity_id"),
		c.Query("channel_id"),
		c.Query("start_date"),
		c.Query("end_date"),
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Set response headers for CSV download
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=audit_logs.csv")

	// Export to CSV
	if err := h.auditLogService.ExportAuditLogsCSV(c.Request.Context(), filters, c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to export audit logs",
		})
		return
	}
}
