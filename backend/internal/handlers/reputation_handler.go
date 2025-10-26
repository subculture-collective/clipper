package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/services"
)

// ReputationHandler handles reputation-related HTTP requests
type ReputationHandler struct {
	reputationService *services.ReputationService
	authService       *services.AuthService
}

// NewReputationHandler creates a new reputation handler
func NewReputationHandler(reputationService *services.ReputationService, authService *services.AuthService) *ReputationHandler {
	return &ReputationHandler{
		reputationService: reputationService,
		authService:       authService,
	}
}

// GetUserReputation retrieves complete reputation info for a user
// GET /users/:id/reputation
func (h *ReputationHandler) GetUserReputation(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	reputation, err := h.reputationService.GetUserReputation(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user reputation",
		})
		return
	}

	c.JSON(http.StatusOK, reputation)
}

// GetUserKarma retrieves karma details for a user
// GET /users/:id/karma
func (h *ReputationHandler) GetUserKarma(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Get karma breakdown
	breakdown, err := h.reputationService.GetKarmaBreakdown(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get karma breakdown",
		})
		return
	}

	// Get karma history (limit from query param, default 50)
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	history, err := h.reputationService.GetUserKarmaHistory(c.Request.Context(), userID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get karma history",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"breakdown": breakdown,
		"history":   history,
	})
}

// GetUserBadges retrieves all badges for a user
// GET /users/:id/badges
func (h *ReputationHandler) GetUserBadges(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	badges, err := h.reputationService.GetUserBadges(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user badges",
		})
		return
	}

	// Enrich badges with definitions
	enrichedBadges := make([]gin.H, 0, len(badges))
	for _, badge := range badges {
		def, err := services.GetBadgeDefinition(badge.BadgeID)
		if err != nil {
			// Skip invalid badges
			continue
		}
		enrichedBadges = append(enrichedBadges, gin.H{
			"id":          badge.ID,
			"badge_id":    badge.BadgeID,
			"awarded_at":  badge.AwardedAt,
			"awarded_by":  badge.AwardedBy,
			"name":        def.Name,
			"description": def.Description,
			"icon":        def.Icon,
			"category":    def.Category,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"badges": enrichedBadges,
	})
}

// GetLeaderboard retrieves leaderboard by type
// GET /leaderboards/:type
func (h *ReputationHandler) GetLeaderboard(c *gin.Context) {
	leaderboardType := c.Param("type")

	// Get pagination params
	limitStr := c.DefaultQuery("limit", "50")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}

	pageStr := c.DefaultQuery("page", "1")
	page, err := strconv.Atoi(pageStr)
	if err != nil || page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit

	var entries interface{}
	switch leaderboardType {
	case "karma":
		entries, err = h.reputationService.GetKarmaLeaderboard(c.Request.Context(), limit, offset)
	case "engagement":
		entries, err = h.reputationService.GetEngagementLeaderboard(c.Request.Context(), limit, offset)
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid leaderboard type",
			"code":    "INVALID_LEADERBOARD_TYPE",
			"message": "Leaderboard type must be 'karma' or 'engagement'",
		})
		return
	}

	if err != nil {
		// Log the error without exposing sensitive details
		c.Error(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve leaderboard",
			"code":    "LEADERBOARD_FETCH_ERROR",
			"message": "Unable to retrieve leaderboard data. Please try again later.",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"type":    leaderboardType,
		"page":    page,
		"limit":   limit,
		"entries": entries,
	})
}

// AwardBadge awards a badge to a user (admin only)
// POST /admin/users/:id/badges
func (h *ReputationHandler) AwardBadge(c *gin.Context) {
	// Get user ID from path
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Get current admin user
	currentUser, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Unauthorized",
		})
		return
	}
	adminID := currentUser.(uuid.UUID)

	// Parse request body
	var req struct {
		BadgeID string `json:"badge_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// Award badge
	err = h.reputationService.AwardBadge(c.Request.Context(), userID, req.BadgeID, &adminID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Badge awarded successfully",
	})
}

// RemoveBadge removes a badge from a user (admin only)
// DELETE /admin/users/:id/badges/:badgeId
func (h *ReputationHandler) RemoveBadge(c *gin.Context) {
	// Get user ID from path
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID",
		})
		return
	}

	// Get badge ID from path
	badgeID := c.Param("badgeId")

	// Remove badge
	err = h.reputationService.RemoveBadge(c.Request.Context(), userID, badgeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to remove badge",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Badge removed successfully",
	})
}

// GetBadgeDefinitions retrieves all badge definitions
// GET /badges
func (h *ReputationHandler) GetBadgeDefinitions(c *gin.Context) {
	badges := services.GetAllBadgeDefinitions()
	c.JSON(http.StatusOK, gin.H{
		"badges": badges,
	})
}
