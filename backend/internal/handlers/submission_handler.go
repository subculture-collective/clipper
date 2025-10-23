package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
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
func (h *SubmissionHandler) ListPendingSubmissions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	submissions, total, err := h.submissionService.GetPendingSubmissions(c.Request.Context(), page, limit)
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
