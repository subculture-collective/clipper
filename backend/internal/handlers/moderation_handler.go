package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/services"
)

// ModerationHandler handles moderation operations
type ModerationHandler struct {
	moderationEventService *services.ModerationEventService
	abuseDetector          *services.SubmissionAbuseDetector
	db                     *pgxpool.Pool
}

// NewModerationHandler creates a new ModerationHandler
func NewModerationHandler(moderationEventService *services.ModerationEventService, abuseDetector *services.SubmissionAbuseDetector, db *pgxpool.Pool) *ModerationHandler {
	return &ModerationHandler{
		moderationEventService: moderationEventService,
		abuseDetector:          abuseDetector,
		db:                     db,
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

// GetModerationQueue retrieves moderation queue items with optional filters
// GET /admin/moderation/queue
func (h *ModerationHandler) GetModerationQueue(c *gin.Context) {
	ctx := c.Request.Context()

	// Parse query parameters
	contentType := c.Query("type")
	status := c.DefaultQuery("status", "pending")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	// Build query with filters
	query := `
		SELECT mq.id, mq.content_type, mq.content_id, mq.reason, mq.priority, 
		       mq.status, mq.assigned_to, mq.reported_by, mq.report_count,
		       mq.auto_flagged, mq.confidence_score, mq.created_at, 
		       mq.reviewed_at, mq.reviewed_by
		FROM moderation_queue mq
		WHERE mq.status = $1
	`
	args := []interface{}{status}
	argIdx := 2

	if contentType != "" {
		query += fmt.Sprintf(" AND mq.content_type = $%d", argIdx)
		args = append(args, contentType)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY mq.priority DESC, mq.created_at ASC LIMIT $%d", argIdx)
	args = append(args, limit)

	rows, err := h.db.Query(ctx, query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve moderation queue",
		})
		return
	}
	defer rows.Close()

	var items []models.ModerationQueueItem
	for rows.Next() {
		var item models.ModerationQueueItem
		err := rows.Scan(
			&item.ID, &item.ContentType, &item.ContentID, &item.Reason,
			&item.Priority, &item.Status, &item.AssignedTo, &item.ReportedBy,
			&item.ReportCount, &item.AutoFlagged, &item.ConfidenceScore,
			&item.CreatedAt, &item.ReviewedAt, &item.ReviewedBy,
		)
		if err != nil {
			continue
		}
		items = append(items, item)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    items,
		"meta": gin.H{
			"count":  len(items),
			"limit":  limit,
			"status": status,
		},
	})
}

// ApproveContent approves a moderation queue item
// POST /admin/moderation/:id/approve
func (h *ModerationHandler) ApproveContent(c *gin.Context) {
	ctx := c.Request.Context()
	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid item ID",
		})
		return
	}

	// Get moderator ID from context
	moderatorIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	moderatorID := moderatorIDVal.(uuid.UUID)

	// Begin transaction
	tx, err := h.db.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to begin transaction",
		})
		return
	}
	defer tx.Rollback(ctx)

	// Update queue item
	_, err = tx.Exec(ctx, `
		UPDATE moderation_queue 
		SET status = 'approved', reviewed_by = $1
		WHERE id = $2 AND status = 'pending'
	`, moderatorID, itemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to approve item",
		})
		return
	}

	// Record decision
	_, err = tx.Exec(ctx, `
		INSERT INTO moderation_decisions (queue_item_id, moderator_id, action)
		VALUES ($1, $2, 'approve')
	`, itemID, moderatorID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to record decision",
		})
		return
	}

	if err = tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to commit transaction",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Content approved",
	})
}

// RejectContent rejects a moderation queue item
// POST /admin/moderation/:id/reject
func (h *ModerationHandler) RejectContent(c *gin.Context) {
	ctx := c.Request.Context()
	itemID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid item ID",
		})
		return
	}

	// Get moderator ID from context
	moderatorIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	moderatorID := moderatorIDVal.(uuid.UUID)

	// Parse request body for optional reason
	var req struct {
		Reason *string `json:"reason"`
	}
	if err := c.ShouldBindJSON(&req); err == nil && req.Reason != nil {
		// Reason is optional, so ignore bind errors
	}

	// Begin transaction
	tx, err := h.db.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to begin transaction",
		})
		return
	}
	defer tx.Rollback(ctx)

	// Update queue item
	_, err = tx.Exec(ctx, `
		UPDATE moderation_queue 
		SET status = 'rejected', reviewed_by = $1
		WHERE id = $2 AND status = 'pending'
	`, moderatorID, itemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to reject item",
		})
		return
	}

	// Record decision
	_, err = tx.Exec(ctx, `
		INSERT INTO moderation_decisions (queue_item_id, moderator_id, action, reason)
		VALUES ($1, $2, 'reject', $3)
	`, itemID, moderatorID, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to record decision",
		})
		return
	}

	if err = tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to commit transaction",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Content rejected",
	})
}

// BulkModerate performs bulk moderation actions
// POST /admin/moderation/bulk
func (h *ModerationHandler) BulkModerate(c *gin.Context) {
	ctx := c.Request.Context()

	var req models.BulkModerationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	// Get moderator ID from context
	moderatorIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	moderatorID := moderatorIDVal.(uuid.UUID)

	// Convert item IDs to UUIDs
	itemIDs := make([]uuid.UUID, 0, len(req.ItemIDs))
	for _, idStr := range req.ItemIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid item ID: " + idStr,
			})
			return
		}
		itemIDs = append(itemIDs, id)
	}

	// Begin transaction
	tx, err := h.db.Begin(ctx)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to begin transaction",
		})
		return
	}
	defer tx.Rollback(ctx)

	// Determine status based on action
	status := "approved"
	if req.Action == "reject" {
		status = "rejected"
	} else if req.Action == "escalate" {
		status = "escalated"
	}

	// Update all items
	processedCount := 0
	for _, itemID := range itemIDs {
		// Update queue item
		cmdTag, err := tx.Exec(ctx, `
			UPDATE moderation_queue 
			SET status = $1, reviewed_by = $2
			WHERE id = $3 AND status = 'pending'
		`, status, moderatorID, itemID)
		if err != nil {
			continue
		}
		if cmdTag.RowsAffected() == 0 {
			continue
		}

		// Record decision
		_, err = tx.Exec(ctx, `
			INSERT INTO moderation_decisions (queue_item_id, moderator_id, action, reason)
			VALUES ($1, $2, $3, $4)
		`, itemID, moderatorID, req.Action, req.Reason)
		if err != nil {
			continue
		}

		processedCount++
	}

	if err = tx.Commit(ctx); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to commit transaction",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":   true,
		"processed": processedCount,
		"total":     len(itemIDs),
	})
}

// GetModerationStats returns statistics about the moderation queue
// GET /admin/moderation/queue/stats
func (h *ModerationHandler) GetModerationStats(c *gin.Context) {
	ctx := c.Request.Context()

	stats := models.ModerationQueueStats{
		ByContentType: make(map[string]int),
		ByReason:      make(map[string]int),
	}

	// Get counts by status
	err := h.db.QueryRow(ctx, `
		SELECT 
			COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
			COUNT(*) FILTER (WHERE status = 'approved') as total_approved,
			COUNT(*) FILTER (WHERE status = 'rejected') as total_rejected,
			COUNT(*) FILTER (WHERE status = 'escalated') as total_escalated,
			COUNT(*) FILTER (WHERE status = 'pending' AND auto_flagged = true) as auto_flagged_count,
			COUNT(*) FILTER (WHERE status = 'pending' AND report_count > 0) as user_reported_count,
			COUNT(*) FILTER (WHERE status = 'pending' AND priority >= 75) as high_priority_count,
			EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE status = 'pending')))/3600 as oldest_age
		FROM moderation_queue
	`).Scan(
		&stats.TotalPending, &stats.TotalApproved, &stats.TotalRejected,
		&stats.TotalEscalated, &stats.AutoFlaggedCount, &stats.UserReportedCount,
		&stats.HighPriorityCount, &stats.OldestPendingAge,
	)
	if err != nil && err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve stats",
		})
		return
	}

	// Get counts by content type
	rows, err := h.db.Query(ctx, `
		SELECT content_type, COUNT(*) as count
		FROM moderation_queue
		WHERE status = 'pending'
		GROUP BY content_type
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var contentType string
			var count int
			if err := rows.Scan(&contentType, &count); err == nil {
				stats.ByContentType[contentType] = count
			}
		}
	}

	// Get counts by reason
	rows, err = h.db.Query(ctx, `
		SELECT reason, COUNT(*) as count
		FROM moderation_queue
		WHERE status = 'pending'
		GROUP BY reason
	`)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var reason string
			var count int
			if err := rows.Scan(&reason, &count); err == nil {
				stats.ByReason[reason] = count
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}
