package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/services"
)

const (
	secondsPerHour = 3600
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

	// Parse and validate query parameters
	contentType := c.Query("type")
	status := c.DefaultQuery("status", "pending")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	// Validate status parameter
	validStatuses := map[string]bool{
		"pending":   true,
		"approved":  true,
		"rejected":  true,
		"escalated": true,
	}
	if !validStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid status. Must be one of: pending, approved, rejected, escalated",
		})
		return
	}

	// Validate content type if provided
	if contentType != "" {
		validContentTypes := map[string]bool{
			"comment":    true,
			"clip":       true,
			"user":       true,
			"submission": true,
		}
		if !validContentTypes[contentType] {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid content type. Must be one of: comment, clip, user, submission",
			})
			return
		}
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
			// Log scan error for debugging but continue processing other rows
			c.Error(fmt.Errorf("failed to scan moderation queue item: %w", err))
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
	cmdTag, err := tx.Exec(ctx, `
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

	// Check if any rows were updated
	if cmdTag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Item not found or not in pending status",
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
	// Enforce JSON Content-Type for consistency
	contentType := c.GetHeader("Content-Type")
	if c.Request.ContentLength > 0 {
		if contentType != "application/json" {
			c.JSON(http.StatusUnsupportedMediaType, gin.H{
				"error": "Content-Type must be application/json",
			})
			return
		}
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid JSON in request body",
			})
			return
		}
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
	cmdTag, err := tx.Exec(ctx, `
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

	// Check if any rows were updated
	if cmdTag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Item not found or not in pending status",
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
	failedItems := make([]string, 0)
	for _, itemID := range itemIDs {
		// Update queue item
		cmdTag, err := tx.Exec(ctx, `
			UPDATE moderation_queue 
			SET status = $1, reviewed_by = $2
			WHERE id = $3 AND status = 'pending'
		`, status, moderatorID, itemID)
		if err != nil {
			failedItems = append(failedItems, itemID.String())
			continue
		}
		if cmdTag.RowsAffected() == 0 {
			failedItems = append(failedItems, itemID.String())
			continue
		}

		// Record decision
		_, err = tx.Exec(ctx, `
			INSERT INTO moderation_decisions (queue_item_id, moderator_id, action, reason)
			VALUES ($1, $2, $3, $4)
		`, itemID, moderatorID, req.Action, req.Reason)
		if err != nil {
			failedItems = append(failedItems, itemID.String())
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

	response := gin.H{
		"success":   true,
		"processed": processedCount,
		"total":     len(itemIDs),
	}
	if len(failedItems) > 0 {
		response["failed"] = failedItems
		response["message"] = fmt.Sprintf("Processed %d items, %d failed", processedCount, len(failedItems))
	}

	c.JSON(http.StatusOK, response)
}

// GetModerationStats returns statistics about the moderation queue
// GET /admin/moderation/queue/stats
func (h *ModerationHandler) GetModerationStats(c *gin.Context) {
	ctx := c.Request.Context()

	stats := models.ModerationQueueStats{
		ByContentType: make(map[string]int),
		ByReason:      make(map[string]int),
	}

	// Get all stats in a single optimized query using CTEs
	rows, err := h.db.Query(ctx, `
		WITH status_counts AS (
			SELECT 
				COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
				COUNT(*) FILTER (WHERE status = 'approved') as total_approved,
				COUNT(*) FILTER (WHERE status = 'rejected') as total_rejected,
				COUNT(*) FILTER (WHERE status = 'escalated') as total_escalated,
				COUNT(*) FILTER (WHERE status = 'pending' AND auto_flagged = true) as auto_flagged_count,
				COUNT(*) FILTER (WHERE status = 'pending' AND report_count > 0) as user_reported_count,
				COUNT(*) FILTER (WHERE status = 'pending' AND priority >= 75) as high_priority_count,
				EXTRACT(EPOCH FROM (NOW() - MIN(created_at) FILTER (WHERE status = 'pending')))/`+fmt.Sprintf("%d", secondsPerHour)+` as oldest_age
			FROM moderation_queue
		),
		type_counts AS (
			SELECT 'type' as category, content_type as name, COUNT(*) as count
			FROM moderation_queue
			WHERE status = 'pending'
			GROUP BY content_type
		),
		reason_counts AS (
			SELECT 'reason' as category, reason as name, COUNT(*) as count
			FROM moderation_queue
			WHERE status = 'pending'
			GROUP BY reason
		)
		SELECT 'status' as type, NULL as name, 
			   total_pending, total_approved, total_rejected, total_escalated,
			   auto_flagged_count, user_reported_count, high_priority_count, oldest_age
		FROM status_counts
		UNION ALL
		SELECT category, name, count, 0, 0, 0, 0, 0, 0, 0
		FROM type_counts
		UNION ALL
		SELECT category, name, count, 0, 0, 0, 0, 0, 0, 0
		FROM reason_counts
	`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve stats",
		})
		return
	}
	defer rows.Close()

	// Process results
	for rows.Next() {
		var rowType string
		var name *string
		var count, totalPending, totalApproved, totalRejected, totalEscalated int
		var autoFlagged, userReported, highPriority int
		var oldestAge *int

		err := rows.Scan(&rowType, &name, &count, &totalPending, &totalApproved,
			&totalRejected, &totalEscalated, &autoFlagged, &userReported,
			&highPriority, &oldestAge)
		if err != nil {
			continue
		}

		if rowType == "status" {
			// Status row contains aggregate stats
			stats.TotalPending = totalPending
			stats.TotalApproved = totalApproved
			stats.TotalRejected = totalRejected
			stats.TotalEscalated = totalEscalated
			stats.AutoFlaggedCount = autoFlagged
			stats.UserReportedCount = userReported
			stats.HighPriorityCount = highPriority
			stats.OldestPendingAge = oldestAge
		} else if rowType == "type" && name != nil {
			stats.ByContentType[*name] = count
		} else if rowType == "reason" && name != nil {
			stats.ByReason[*name] = count
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// CreateAppeal creates a new appeal for a moderation decision
// POST /api/moderation/appeals
func (h *ModerationHandler) CreateAppeal(c *gin.Context) {
	ctx := c.Request.Context()

	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	userID := userIDVal.(uuid.UUID)

	var req models.CreateAppealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	moderationActionID, err := uuid.Parse(req.ModerationActionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid moderation action ID",
		})
		return
	}

	// Verify the moderation action exists and belongs to the user
	var actionExists bool
	var actionUserID uuid.UUID
	err = h.db.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM moderation_decisions md
			JOIN moderation_queue mq ON md.queue_item_id = mq.id
			WHERE md.id = $1
		), COALESCE(
			(SELECT mq.reported_by[1]::uuid 
			 FROM moderation_decisions md
			 JOIN moderation_queue mq ON md.queue_item_id = mq.id
			 WHERE md.id = $1 AND array_length(mq.reported_by, 1) > 0),
			$2
		)
	`, moderationActionID, userID).Scan(&actionExists, &actionUserID)
	if err != nil || !actionExists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Moderation action not found",
		})
		return
	}

	// Insert appeal
	var appealID uuid.UUID
	err = h.db.QueryRow(ctx, `
		INSERT INTO moderation_appeals (user_id, moderation_action_id, reason)
		VALUES ($1, $2, $3)
		RETURNING id
	`, userID, moderationActionID, req.Reason).Scan(&appealID)
	if err != nil {
		// Check if it's a duplicate appeal
		if strings.Contains(err.Error(), "uq_appeals_action_pending") {
			c.JSON(http.StatusConflict, gin.H{
				"error": "An appeal for this moderation action is already pending",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create appeal",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":   true,
		"appeal_id": appealID,
		"message":   "Appeal submitted successfully",
	})
}

// GetAppeals retrieves appeals for admin review
// GET /admin/moderation/appeals
func (h *ModerationHandler) GetAppeals(c *gin.Context) {
	ctx := c.Request.Context()

	status := c.DefaultQuery("status", "pending")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	if limit < 1 || limit > 100 {
		limit = 50
	}

	// Validate status parameter
	validStatuses := map[string]bool{
		"pending":  true,
		"approved": true,
		"rejected": true,
	}
	if !validStatuses[status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid status. Must be one of: pending, approved, rejected",
		})
		return
	}

	query := `
		SELECT ma.id, ma.user_id, ma.moderation_action_id, ma.reason, 
		       ma.status, ma.resolved_by, ma.resolution, 
		       ma.created_at, ma.resolved_at,
		       u.username, u.display_name,
		       md.action, md.reason as decision_reason,
		       mq.content_type, mq.content_id
		FROM moderation_appeals ma
		JOIN users u ON ma.user_id = u.id
		JOIN moderation_decisions md ON ma.moderation_action_id = md.id
		JOIN moderation_queue mq ON md.queue_item_id = mq.id
		WHERE ma.status = $1
		ORDER BY ma.created_at ASC
		LIMIT $2
	`

	rows, err := h.db.Query(ctx, query, status, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve appeals",
		})
		return
	}
	defer rows.Close()

	type AppealWithDetails struct {
		models.ModerationAppeal
		Username       string     `json:"username"`
		DisplayName    string     `json:"display_name"`
		DecisionAction string     `json:"decision_action"`
		DecisionReason *string    `json:"decision_reason,omitempty"`
		ContentType    string     `json:"content_type"`
		ContentID      uuid.UUID  `json:"content_id"`
	}

	var appeals []AppealWithDetails
	for rows.Next() {
		var appeal AppealWithDetails
		err := rows.Scan(
			&appeal.ID, &appeal.UserID, &appeal.ModerationActionID, 
			&appeal.Reason, &appeal.Status, &appeal.ResolvedBy, 
			&appeal.Resolution, &appeal.CreatedAt, &appeal.ResolvedAt,
			&appeal.Username, &appeal.DisplayName,
			&appeal.DecisionAction, &appeal.DecisionReason,
			&appeal.ContentType, &appeal.ContentID,
		)
		if err != nil {
			c.Error(fmt.Errorf("failed to scan appeal: %w", err))
			continue
		}
		appeals = append(appeals, appeal)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    appeals,
		"meta": gin.H{
			"count":  len(appeals),
			"limit":  limit,
			"status": status,
		},
	})
}

// ResolveAppeal resolves an appeal
// POST /admin/moderation/appeals/:id/resolve
func (h *ModerationHandler) ResolveAppeal(c *gin.Context) {
	ctx := c.Request.Context()
	
	appealID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid appeal ID",
		})
		return
	}

	// Get admin ID from context
	adminIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	adminID := adminIDVal.(uuid.UUID)

	var req models.ResolveAppealRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request: " + err.Error(),
		})
		return
	}

	// Map decision to status
	status := "rejected"
	if req.Decision == "approve" {
		status = "approved"
	}

	// Update appeal
	cmdTag, err := h.db.Exec(ctx, `
		UPDATE moderation_appeals 
		SET status = $1, resolved_by = $2, resolution = $3
		WHERE id = $4 AND status = 'pending'
	`, status, adminID, req.Resolution, appealID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to resolve appeal",
		})
		return
	}

	if cmdTag.RowsAffected() == 0 {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Appeal not found or not in pending status",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Appeal resolved successfully",
		"status":  status,
	})
}

// GetUserAppeals retrieves appeals for the authenticated user
// GET /api/moderation/appeals
func (h *ModerationHandler) GetUserAppeals(c *gin.Context) {
	ctx := c.Request.Context()

	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	userID := userIDVal.(uuid.UUID)

	query := `
		SELECT ma.id, ma.user_id, ma.moderation_action_id, ma.reason, 
		       ma.status, ma.resolved_by, ma.resolution, 
		       ma.created_at, ma.resolved_at,
		       md.action, md.reason as decision_reason,
		       mq.content_type, mq.content_id
		FROM moderation_appeals ma
		JOIN moderation_decisions md ON ma.moderation_action_id = md.id
		JOIN moderation_queue mq ON md.queue_item_id = mq.id
		WHERE ma.user_id = $1
		ORDER BY ma.created_at DESC
		LIMIT 50
	`

	rows, err := h.db.Query(ctx, query, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve appeals",
		})
		return
	}
	defer rows.Close()

	type UserAppealWithDetails struct {
		models.ModerationAppeal
		DecisionAction string    `json:"decision_action"`
		DecisionReason *string   `json:"decision_reason,omitempty"`
		ContentType    string    `json:"content_type"`
		ContentID      uuid.UUID `json:"content_id"`
	}

	var appeals []UserAppealWithDetails
	for rows.Next() {
		var appeal UserAppealWithDetails
		err := rows.Scan(
			&appeal.ID, &appeal.UserID, &appeal.ModerationActionID,
			&appeal.Reason, &appeal.Status, &appeal.ResolvedBy,
			&appeal.Resolution, &appeal.CreatedAt, &appeal.ResolvedAt,
			&appeal.DecisionAction, &appeal.DecisionReason,
			&appeal.ContentType, &appeal.ContentID,
		)
		if err != nil {
			c.Error(fmt.Errorf("failed to scan appeal: %w", err))
			continue
		}
		appeals = append(appeals, appeal)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    appeals,
	})
}
