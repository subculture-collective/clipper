package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
)

// VerificationHandler handles verification-related HTTP requests
type VerificationHandler struct {
	verificationService *services.VerificationService
	authService         *services.AuthService
}

// NewVerificationHandler creates a new verification handler
func NewVerificationHandler(
	verificationService *services.VerificationService,
	authService *services.AuthService,
) *VerificationHandler {
	return &VerificationHandler{
		verificationService: verificationService,
		authService:         authService,
	}
}

// SubmitApplication handles POST /api/v1/verification/apply
func (h *VerificationHandler) SubmitApplication(c *gin.Context) {
	// Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	uid, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
		return
	}

	// Parse request
	var req models.VerificationApplicationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Submit application
	verification, err := h.verificationService.SubmitApplication(c.Request.Context(), uid, &req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrVerificationAlreadyExists):
			c.JSON(http.StatusConflict, gin.H{"error": "You already have a pending verification application"})
		case errors.Is(err, services.ErrNotEligibleForVerification):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to submit application"})
		}
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":      "Verification application submitted successfully",
		"verification": verification,
	})
}

// GetStatus handles GET /api/v1/verification/status
func (h *VerificationHandler) GetStatus(c *gin.Context) {
	// Get authenticated user
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	uid, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
		return
	}

	// Get verification status
	verification, err := h.verificationService.GetVerificationStatus(c.Request.Context(), uid)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get verification status"})
		return
	}

	if verification == nil {
		c.JSON(http.StatusOK, gin.H{
			"status":       "none",
			"verification": nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":       "exists",
		"verification": verification,
	})
}

// ListApplications handles GET /api/v1/verification/applications
func (h *VerificationHandler) ListApplications(c *gin.Context) {
	// Parse query parameters
	statusParam := c.Query("status")
	pageParam := c.DefaultQuery("page", "1")
	limitParam := c.DefaultQuery("limit", "20")

	page, err := strconv.Atoi(pageParam)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitParam)
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	var status *models.VerificationStatus
	if statusParam != "" {
		s := models.VerificationStatus(statusParam)
		// Validate status
		if s != models.VerificationStatusPending &&
			s != models.VerificationStatusApproved &&
			s != models.VerificationStatusRejected &&
			s != models.VerificationStatusRevoked {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status parameter"})
			return
		}
		status = &s
	}

	// List applications
	verifications, total, err := h.verificationService.ListApplications(c.Request.Context(), status, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to list applications"})
		return
	}

	totalPages := (total + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"verifications": verifications,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// ReviewApplication handles POST /api/v1/verification/review/:id
func (h *VerificationHandler) ReviewApplication(c *gin.Context) {
	// Get authenticated user (reviewer)
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	reviewerID, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID"})
		return
	}

	// Parse verification ID
	verificationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification ID"})
		return
	}

	// Parse request
	var req models.VerificationReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Review application
	verification, err := h.verificationService.ReviewApplication(c.Request.Context(), verificationID, reviewerID, &req)
	if err != nil {
		switch {
		case errors.Is(err, repository.ErrVerificationNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "Verification not found"})
		case errors.Is(err, services.ErrInvalidVerificationStatus):
			c.JSON(http.StatusConflict, gin.H{"error": "Verification has already been reviewed"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to review application"})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":      "Application reviewed successfully",
		"verification": verification,
	})
}

// GetAuditLogs handles GET /api/v1/verification/:id/audit-logs
func (h *VerificationHandler) GetAuditLogs(c *gin.Context) {
	// Parse verification ID
	verificationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid verification ID"})
		return
	}

	// Get audit logs
	logs, err := h.verificationService.GetAuditLogs(c.Request.Context(), verificationID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get audit logs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"audit_logs": logs,
	})
}
