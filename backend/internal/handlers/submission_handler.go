package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
)

// SubmissionHandler handles clip submission operations
type SubmissionHandler struct {
	submissionService *services.SubmissionService
}

// NewSubmissionHandler creates a new SubmissionHandler
func NewSubmissionHandler(submissionService *services.SubmissionService) *SubmissionHandler {
	return &SubmissionHandler{
		submissionService: submissionService,
	}
}

// SubmitClip handles clip submission
// POST /clips/submit
func (h *SubmissionHandler) SubmitClip(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	userID := userIDVal.(uuid.UUID)

	var req services.SubmitClipRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	submission, err := h.submissionService.SubmitClip(c.Request.Context(), userID, &req)
	if err != nil {
		// Check if it's a validation error
		if valErr, ok := err.(*services.ValidationError); ok {
			c.JSON(http.StatusBadRequest, gin.H{
				"error":   valErr.Message,
				"field":   valErr.Field,
				"success": false,
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to submit clip",
			"success": false,
		})
		return
	}

	status := http.StatusCreated
	message := "Clip submitted for review"
	if submission.Status == "approved" {
		message = "Clip submitted and auto-approved!"
	}

	c.JSON(status, gin.H{
		"success":    true,
		"message":    message,
		"submission": submission,
	})
}

// GetUserSubmissions lists submissions for the authenticated user
// GET /submissions
func (h *SubmissionHandler) GetUserSubmissions(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	userID := userIDVal.(uuid.UUID)

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	submissions, total, err := h.submissionService.GetUserSubmissions(c.Request.Context(), userID, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve submissions",
		})
		return
	}

	totalPages := (total + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    submissions,
		"meta": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// GetSubmissionStats returns submission statistics for the authenticated user
// GET /submissions/stats
func (h *SubmissionHandler) GetSubmissionStats(c *gin.Context) {
	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	userID := userIDVal.(uuid.UUID)

	stats, err := h.submissionService.GetSubmissionStats(c.Request.Context(), userID)
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

// ListPendingSubmissions lists pending submissions for moderation (admin/moderator only)
// GET /admin/submissions
// Supports filters: is_nsfw, broadcaster, creator, tags (comma-separated), start_date (RFC3339), end_date (RFC3339)
func (h *SubmissionHandler) ListPendingSubmissions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	// Parse filters
	filters := repository.SubmissionFilters{}

	if isNSFWStr := c.Query("is_nsfw"); isNSFWStr != "" {
		isNSFW := isNSFWStr == "true"
		filters.IsNSFW = &isNSFW
	}

	if broadcaster := c.Query("broadcaster"); broadcaster != "" {
		filters.BroadcasterName = &broadcaster
	}

	if creator := c.Query("creator"); creator != "" {
		filters.CreatorName = &creator
	}

	if tagsStr := c.Query("tags"); tagsStr != "" {
		tags := strings.Split(tagsStr, ",")
		for i := range tags {
			tags[i] = strings.TrimSpace(tags[i])
		}
		filters.Tags = tags
	}

	if startDateStr := c.Query("start_date"); startDateStr != "" {
		startDate, err := time.Parse(time.RFC3339, startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid start_date format (use RFC3339)",
			})
			return
		}
		filters.StartDate = &startDate
	}

	if endDateStr := c.Query("end_date"); endDateStr != "" {
		endDate, err := time.Parse(time.RFC3339, endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid end_date format (use RFC3339)",
			})
			return
		}
		filters.EndDate = &endDate
	}

	submissions, total, err := h.submissionService.GetPendingSubmissionsWithFilters(c.Request.Context(), filters, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to retrieve pending submissions",
		})
		return
	}

	totalPages := (total + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    submissions,
		"meta": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// ApproveSubmission approves a pending submission (admin/moderator only)
// POST /admin/submissions/:id/approve
func (h *SubmissionHandler) ApproveSubmission(c *gin.Context) {
	// Get submission ID from URL
	submissionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid submission ID",
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

	if err := h.submissionService.ApproveSubmission(c.Request.Context(), submissionID, reviewerID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to approve submission: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Submission approved",
	})
}

// RejectSubmission rejects a pending submission (admin/moderator only)
// POST /admin/submissions/:id/reject
func (h *SubmissionHandler) RejectSubmission(c *gin.Context) {
	// Get submission ID from URL
	submissionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid submission ID",
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
		Reason string `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Rejection reason is required",
		})
		return
	}

	if err := h.submissionService.RejectSubmission(c.Request.Context(), submissionID, reviewerID, req.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to reject submission: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Submission rejected",
	})
}

// BulkApproveSubmissions approves multiple submissions (admin/moderator only)
// POST /admin/submissions/bulk-approve
func (h *SubmissionHandler) BulkApproveSubmissions(c *gin.Context) {
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
		SubmissionIDs []string `json:"submission_ids" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Submission IDs are required",
		})
		return
	}

	if len(req.SubmissionIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "At least one submission ID is required",
		})
		return
	}

	// Parse UUIDs
	submissionIDs := make([]uuid.UUID, 0, len(req.SubmissionIDs))
	for _, idStr := range req.SubmissionIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid submission ID: " + idStr,
			})
			return
		}
		submissionIDs = append(submissionIDs, id)
	}

	if err := h.submissionService.BulkApproveSubmissions(c.Request.Context(), submissionIDs, reviewerID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to bulk approve submissions: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Submissions approved",
		"count":   len(submissionIDs),
	})
}

// BulkRejectSubmissions rejects multiple submissions (admin/moderator only)
// POST /admin/submissions/bulk-reject
func (h *SubmissionHandler) BulkRejectSubmissions(c *gin.Context) {
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
		SubmissionIDs []string `json:"submission_ids" binding:"required"`
		Reason        string   `json:"reason" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Submission IDs and reason are required",
		})
		return
	}

	if len(req.SubmissionIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "At least one submission ID is required",
		})
		return
	}

	// Parse UUIDs
	submissionIDs := make([]uuid.UUID, 0, len(req.SubmissionIDs))
	for _, idStr := range req.SubmissionIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid submission ID: " + idStr,
			})
			return
		}
		submissionIDs = append(submissionIDs, id)
	}

	if err := h.submissionService.BulkRejectSubmissions(c.Request.Context(), submissionIDs, reviewerID, req.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to bulk reject submissions: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Submissions rejected",
		"count":   len(submissionIDs),
	})
}

// GetRejectionReasonTemplates returns available rejection reason templates
// GET /admin/submissions/rejection-reasons
func (h *SubmissionHandler) GetRejectionReasonTemplates(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    models.GetRejectionReasonTemplates(),
	})
}
