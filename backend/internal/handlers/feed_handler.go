package handlers

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
)

type FeedHandler struct {
	feedService *services.FeedService
	authService *services.AuthService
}

func NewFeedHandler(feedService *services.FeedService, authService *services.AuthService) *FeedHandler {
	return &FeedHandler{
		feedService: feedService,
		authService: authService,
	}
}

// CreateFeed creates a new feed
func (h *FeedHandler) CreateFeed(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req models.CreateFeedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	feed, err := h.feedService.CreateFeed(c.Request.Context(), userID.(uuid.UUID), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, feed)
}

// ListUserFeeds lists all feeds for a user
func (h *FeedHandler) ListUserFeeds(c *gin.Context) {
	userIDParam := c.Param("id")
	userID, err := uuid.Parse(userIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var requestingUserID *uuid.UUID
	if id, exists := c.Get("user_id"); exists {
		uid := id.(uuid.UUID)
		requestingUserID = &uid
	}

	feeds, err := h.feedService.GetUserFeeds(c.Request.Context(), userID, requestingUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, feeds)
}

// GetFeed retrieves a feed by ID
func (h *FeedHandler) GetFeed(c *gin.Context) {
	feedIDParam := c.Param("feedId")
	feedID, err := uuid.Parse(feedIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feed ID"})
		return
	}

	var requestingUserID *uuid.UUID
	if id, exists := c.Get("user_id"); exists {
		uid := id.(uuid.UUID)
		requestingUserID = &uid
	}

	feed, err := h.feedService.GetFeed(c.Request.Context(), feedID, requestingUserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, feed)
}

// UpdateFeed updates a feed
func (h *FeedHandler) UpdateFeed(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	feedIDParam := c.Param("feedId")
	feedID, err := uuid.Parse(feedIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feed ID"})
		return
	}

	var req models.UpdateFeedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	feed, err := h.feedService.UpdateFeed(c.Request.Context(), feedID, userID.(uuid.UUID), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, feed)
}

// DeleteFeed deletes a feed
func (h *FeedHandler) DeleteFeed(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	feedIDParam := c.Param("feedId")
	feedID, err := uuid.Parse(feedIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feed ID"})
		return
	}

	err = h.feedService.DeleteFeed(c.Request.Context(), feedID, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feed deleted successfully"})
}

// AddClipToFeed adds a clip to a feed
func (h *FeedHandler) AddClipToFeed(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	feedIDParam := c.Param("feedId")
	feedID, err := uuid.Parse(feedIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feed ID"})
		return
	}

	var req models.AddClipToFeedRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	feedItem, err := h.feedService.AddClipToFeed(c.Request.Context(), feedID, userID.(uuid.UUID), req.ClipID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, feedItem)
}

// RemoveClipFromFeed removes a clip from a feed
func (h *FeedHandler) RemoveClipFromFeed(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	feedIDParam := c.Param("feedId")
	feedID, err := uuid.Parse(feedIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feed ID"})
		return
	}

	clipIDParam := c.Param("clipId")
	clipID, err := uuid.Parse(clipIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid clip ID"})
		return
	}

	err = h.feedService.RemoveClipFromFeed(c.Request.Context(), feedID, userID.(uuid.UUID), clipID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Clip removed from feed successfully"})
}

// GetFeedClips retrieves all clips in a feed
func (h *FeedHandler) GetFeedClips(c *gin.Context) {
	feedIDParam := c.Param("feedId")
	feedID, err := uuid.Parse(feedIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feed ID"})
		return
	}

	var requestingUserID *uuid.UUID
	if id, exists := c.Get("user_id"); exists {
		uid := id.(uuid.UUID)
		requestingUserID = &uid
	}

	clips, err := h.feedService.GetFeedClips(c.Request.Context(), feedID, requestingUserID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, clips)
}

// ReorderFeedClips reorders clips in a feed
func (h *FeedHandler) ReorderFeedClips(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	feedIDParam := c.Param("feedId")
	feedID, err := uuid.Parse(feedIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feed ID"})
		return
	}

	var req models.ReorderFeedClipsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err = h.feedService.ReorderFeedClips(c.Request.Context(), feedID, userID.(uuid.UUID), req.ClipIDs)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Clips reordered successfully"})
}

// FollowFeed follows a feed
func (h *FeedHandler) FollowFeed(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	feedIDParam := c.Param("feedId")
	feedID, err := uuid.Parse(feedIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feed ID"})
		return
	}

	err = h.feedService.FollowFeed(c.Request.Context(), userID.(uuid.UUID), feedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feed followed successfully"})
}

// UnfollowFeed unfollows a feed
func (h *FeedHandler) UnfollowFeed(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	feedIDParam := c.Param("feedId")
	feedID, err := uuid.Parse(feedIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid feed ID"})
		return
	}

	err = h.feedService.UnfollowFeed(c.Request.Context(), userID.(uuid.UUID), feedID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Feed unfollowed successfully"})
}

// DiscoverFeeds retrieves public feeds for discovery
func (h *FeedHandler) DiscoverFeeds(c *gin.Context) {
	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	feeds, err := h.feedService.DiscoverPublicFeeds(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, feeds)
}

// SearchFeeds searches for public feeds
func (h *FeedHandler) SearchFeeds(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if err != nil || limit < 1 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}

	offset, err := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if err != nil || offset < 0 {
		offset = 0
	}

	feeds, err := h.feedService.SearchFeeds(c.Request.Context(), query, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, feeds)
}

// GetFollowingFeed retrieves clips from followed users and broadcasters
// GET /api/v1/feed/following
func (h *FeedHandler) GetFollowingFeed(c *gin.Context) {
	// Get current user ID from auth middleware
	userIDInterface, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID := userIDInterface.(uuid.UUID)

	// Parse pagination and filter parameters
	page := 1
	limit := 20

	if pageStr := c.Query("page"); pageStr != "" {
		if parsedPage, err := strconv.Atoi(pageStr); err == nil && parsedPage > 0 {
			page = parsedPage
		}
	}

	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 && parsedLimit <= 100 {
			limit = parsedLimit
		}
	}

	offset := (page - 1) * limit

	// Get clips from the following feed
	clips, total, err := h.feedService.GetFollowingFeed(c.Request.Context(), userID, limit, offset)
	if err != nil {
		log.Printf("Error retrieving following feed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve following feed"})
		return
	}

	totalPages := (total + limit - 1) / limit

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    clips,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// GetFilteredClips handles comprehensive feed filtering with multiple criteria
// GET /api/v1/feeds/clips
func (h *FeedHandler) GetFilteredClips(c *gin.Context) {
	// Parse query parameters
	games := c.QueryArray("filter[game]")
	streamers := c.QueryArray("filter[streamer]")
	tags := c.QueryArray("filter[tags]")
	excludeTags := c.QueryArray("filter[exclude_tags]")
	dateFrom := c.Query("filter[date_from]")
	dateTo := c.Query("filter[date_to]")
	sort := c.DefaultQuery("sort", "trending")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	// Validate and constrain parameters
	if limit < 1 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	// Build filters for clip repository
	filters := repository.ClipFilters{
		Sort:              sort,
		UserSubmittedOnly: true, // Only show user-submitted clips in feed
	}

	// Apply game filters (multi-select OR logic)
	if len(games) > 0 {
		// For now, use the first game. Multi-game support would require query modification
		filters.GameID = &games[0]
	}

	// Apply streamer filters (multi-select OR logic)
	if len(streamers) > 0 {
		// For now, use the first streamer. Multi-streamer support would require query modification
		filters.BroadcasterID = &streamers[0]
	}

	// Apply tag filters (multi-select OR logic)
	if len(tags) > 0 {
		// For now, use the first tag. Multi-tag support would require query modification
		filters.Tag = &tags[0]
	}

	// Apply date range filters
	if dateFrom != "" {
		filters.DateFrom = &dateFrom
	}
	if dateTo != "" {
		filters.DateTo = &dateTo
	}

	// Fetch clips using feed service
	clips, total, err := h.feedService.GetFilteredClips(c.Request.Context(), filters, limit, offset)
	if err != nil {
		log.Printf("Error fetching filtered clips: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve filtered clips"})
		return
	}

	totalPages := (total + limit - 1) / limit

	// Return response with filter metadata
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"clips":   clips,
		"pagination": gin.H{
			"limit":       limit,
			"offset":      offset,
			"total":       total,
			"total_pages": totalPages,
			"has_more":    offset+limit < total,
		},
		"filters_applied": gin.H{
			"games":        games,
			"streamers":    streamers,
			"tags":         tags,
			"exclude_tags": excludeTags,
			"date_from":    dateFrom,
			"date_to":      dateTo,
			"sort":         sort,
		},
	})
}
