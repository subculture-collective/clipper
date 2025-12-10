package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// DiscoveryListHandler handles discovery list-related requests
type DiscoveryListHandler struct {
	repo             *repository.DiscoveryListRepository
	analyticsRepo    *repository.AnalyticsRepository
}

// NewDiscoveryListHandler creates a new handler instance
func NewDiscoveryListHandler(repo *repository.DiscoveryListRepository, analyticsRepo *repository.AnalyticsRepository) *DiscoveryListHandler {
	return &DiscoveryListHandler{
		repo:          repo,
		analyticsRepo: analyticsRepo,
	}
}

// ListDiscoveryLists godoc
// @Summary List discovery lists
// @Description Get a list of discovery lists, optionally filtering for featured only
// @Tags discovery-lists
// @Accept json
// @Produce json
// @Param featured query bool false "Filter for featured lists only"
// @Param limit query int false "Number of lists to return" default(20)
// @Param offset query int false "Offset for pagination" default(0)
// @Success 200 {array} models.DiscoveryListWithStats
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/discovery-lists [get]
func (h *DiscoveryListHandler) ListDiscoveryLists(c *gin.Context) {
	logger := utils.GetLogger()
	ctx := c.Request.Context()

	// Parse query parameters
	featuredOnly := c.Query("featured") == "true"
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Validate limits
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// Get user ID if authenticated
	var userID *uuid.UUID
	if userIDVal, exists := c.Get("user_id"); exists {
		if id, ok := userIDVal.(uuid.UUID); ok {
			userID = &id
		}
	}

	// Get lists from repository
	lists, err := h.repo.ListDiscoveryLists(ctx, featuredOnly, userID, limit, offset)
	if err != nil {
		logger.Error("Failed to list discovery lists", "error", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve discovery lists"})
		return
	}

	c.JSON(http.StatusOK, lists)
}

// GetDiscoveryList godoc
// @Summary Get a single discovery list
// @Description Get details of a discovery list by ID or slug
// @Tags discovery-lists
// @Accept json
// @Produce json
// @Param id path string true "List ID or slug"
// @Success 200 {object} models.DiscoveryListWithStats
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/discovery-lists/{id} [get]
func (h *DiscoveryListHandler) GetDiscoveryList(c *gin.Context) {
	logger := utils.GetLogger()
	ctx := c.Request.Context()
	idOrSlug := c.Param("id")

	// Get user ID if authenticated
	var userID *uuid.UUID
	if userIDVal, exists := c.Get("user_id"); exists {
		if id, ok := userIDVal.(uuid.UUID); ok {
			userID = &id
		}
	}

	// Get list from repository
	list, err := h.repo.GetDiscoveryList(ctx, idOrSlug, userID)
	if err != nil {
		if err.Error() == "discovery list not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Discovery list not found"})
			return
		}
		logger.Error("Failed to get discovery list", "error", err, "id", idOrSlug)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve discovery list"})
		return
	}

	// Track list view for analytics
	if h.analyticsRepo != nil {
		go func() {
			_ = h.analyticsRepo.TrackEvent(ctx, "discovery_list_view", userID, &list.ID, nil)
		}()
	}

	c.JSON(http.StatusOK, list)
}

// GetDiscoveryListClips godoc
// @Summary Get clips in a discovery list
// @Description Get all clips in a discovery list with pagination
// @Tags discovery-lists
// @Accept json
// @Produce json
// @Param id path string true "List ID"
// @Param limit query int false "Number of clips to return" default(20)
// @Param offset query int false "Offset for pagination" default(0)
// @Success 200 {array} models.ClipWithSubmitter
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/discovery-lists/{id}/clips [get]
func (h *DiscoveryListHandler) GetDiscoveryListClips(c *gin.Context) {
	logger := utils.GetLogger()
	ctx := c.Request.Context()
	listIDStr := c.Param("id")

	// Parse list ID
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid list ID"})
		return
	}

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Validate limits
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// Get user ID if authenticated
	var userID *uuid.UUID
	if userIDVal, exists := c.Get("user_id"); exists {
		if id, ok := userIDVal.(uuid.UUID); ok {
			userID = &id
		}
	}

	// Verify list exists
	_, err = h.repo.GetDiscoveryList(ctx, listIDStr, userID)
	if err != nil {
		if err.Error() == "discovery list not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Discovery list not found"})
			return
		}
		logger.Error("Failed to verify discovery list", "error", err, "id", listIDStr)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve discovery list"})
		return
	}

	// Get clips from repository
	clips, err := h.repo.GetListClips(ctx, listID, userID, limit, offset)
	if err != nil {
		logger.Error("Failed to get discovery list clips", "error", err, "list_id", listID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve clips"})
		return
	}

	c.JSON(http.StatusOK, clips)
}

// FollowDiscoveryList godoc
// @Summary Follow a discovery list
// @Description Follow a discovery list to get notifications when new clips are added
// @Tags discovery-lists
// @Accept json
// @Produce json
// @Param id path string true "List ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/discovery-lists/{id}/follow [post]
func (h *DiscoveryListHandler) FollowDiscoveryList(c *gin.Context) {
	logger := utils.GetLogger()
	ctx := c.Request.Context()
	listIDStr := c.Param("id")

	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	// Parse list ID
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid list ID"})
		return
	}

	// Verify list exists
	_, err = h.repo.GetDiscoveryList(ctx, listIDStr, &userID)
	if err != nil {
		if err.Error() == "discovery list not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Discovery list not found"})
			return
		}
		logger.Error("Failed to verify discovery list", "error", err, "id", listIDStr)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to follow list"})
		return
	}

	// Follow list
	err = h.repo.FollowList(ctx, userID, listID)
	if err != nil {
		logger.Error("Failed to follow discovery list", "error", err, "user_id", userID, "list_id", listID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to follow list"})
		return
	}

	// Track follow event for analytics
	if h.analyticsRepo != nil {
		go func() {
			_ = h.analyticsRepo.TrackEvent(ctx, "discovery_list_follow", &userID, &listID, nil)
		}()
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully followed list"})
}

// UnfollowDiscoveryList godoc
// @Summary Unfollow a discovery list
// @Description Stop following a discovery list
// @Tags discovery-lists
// @Accept json
// @Produce json
// @Param id path string true "List ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/discovery-lists/{id}/follow [delete]
func (h *DiscoveryListHandler) UnfollowDiscoveryList(c *gin.Context) {
	logger := utils.GetLogger()
	ctx := c.Request.Context()
	listIDStr := c.Param("id")

	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	// Parse list ID
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid list ID"})
		return
	}

	// Unfollow list
	err = h.repo.UnfollowList(ctx, userID, listID)
	if err != nil {
		if err.Error() == "not following this list" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Not following this list"})
			return
		}
		logger.Error("Failed to unfollow discovery list", "error", err, "user_id", userID, "list_id", listID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unfollow list"})
		return
	}

	// Track unfollow event for analytics
	if h.analyticsRepo != nil {
		go func() {
			_ = h.analyticsRepo.TrackEvent(ctx, "discovery_list_unfollow", &userID, &listID, nil)
		}()
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully unfollowed list"})
}

// BookmarkDiscoveryList godoc
// @Summary Bookmark a discovery list
// @Description Bookmark a discovery list for quick access later
// @Tags discovery-lists
// @Accept json
// @Produce json
// @Param id path string true "List ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/discovery-lists/{id}/bookmark [post]
func (h *DiscoveryListHandler) BookmarkDiscoveryList(c *gin.Context) {
	logger := utils.GetLogger()
	ctx := c.Request.Context()
	listIDStr := c.Param("id")

	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	// Parse list ID
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid list ID"})
		return
	}

	// Verify list exists
	_, err = h.repo.GetDiscoveryList(ctx, listIDStr, &userID)
	if err != nil {
		if err.Error() == "discovery list not found" {
			c.JSON(http.StatusNotFound, gin.H{"error": "Discovery list not found"})
			return
		}
		logger.Error("Failed to verify discovery list", "error", err, "id", listIDStr)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to bookmark list"})
		return
	}

	// Bookmark list
	err = h.repo.BookmarkList(ctx, userID, listID)
	if err != nil {
		logger.Error("Failed to bookmark discovery list", "error", err, "user_id", userID, "list_id", listID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to bookmark list"})
		return
	}

	// Track bookmark event for analytics
	if h.analyticsRepo != nil {
		go func() {
			_ = h.analyticsRepo.TrackEvent(ctx, "discovery_list_bookmark", &userID, &listID, nil)
		}()
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully bookmarked list"})
}

// UnbookmarkDiscoveryList godoc
// @Summary Remove bookmark from a discovery list
// @Description Remove a bookmark from a discovery list
// @Tags discovery-lists
// @Accept json
// @Produce json
// @Param id path string true "List ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/discovery-lists/{id}/bookmark [delete]
func (h *DiscoveryListHandler) UnbookmarkDiscoveryList(c *gin.Context) {
	logger := utils.GetLogger()
	ctx := c.Request.Context()
	listIDStr := c.Param("id")

	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	// Parse list ID
	listID, err := uuid.Parse(listIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid list ID"})
		return
	}

	// Unbookmark list
	err = h.repo.UnbookmarkList(ctx, userID, listID)
	if err != nil {
		if err.Error() == "list not bookmarked" {
			c.JSON(http.StatusNotFound, gin.H{"error": "List not bookmarked"})
			return
		}
		logger.Error("Failed to unbookmark discovery list", "error", err, "user_id", userID, "list_id", listID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to unbookmark list"})
		return
	}

	// Track unbookmark event for analytics
	if h.analyticsRepo != nil {
		go func() {
			_ = h.analyticsRepo.TrackEvent(ctx, "discovery_list_unbookmark", &userID, &listID, nil)
		}()
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully removed bookmark"})
}

// GetUserFollowedLists godoc
// @Summary Get user's followed discovery lists
// @Description Get all discovery lists that the current user follows
// @Tags discovery-lists
// @Accept json
// @Produce json
// @Param limit query int false "Number of lists to return" default(20)
// @Param offset query int false "Offset for pagination" default(0)
// @Success 200 {array} models.DiscoveryListWithStats
// @Failure 500 {object} map[string]interface{}
// @Router /api/v1/users/me/discovery-list-follows [get]
func (h *DiscoveryListHandler) GetUserFollowedLists(c *gin.Context) {
	logger := utils.GetLogger()
	ctx := c.Request.Context()

	// Get user ID from context
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	// Parse query parameters
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Validate limits
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// Get followed lists from repository
	lists, err := h.repo.GetUserFollowedLists(ctx, userID, limit, offset)
	if err != nil {
		logger.Error("Failed to get user followed lists", "error", err, "user_id", userID)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve followed lists"})
		return
	}

	c.JSON(http.StatusOK, lists)
}
