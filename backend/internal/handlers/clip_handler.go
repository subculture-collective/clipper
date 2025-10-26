package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
)

// ClipSyncHandler handles clip sync operations
type ClipSyncHandler struct {
	syncService *services.ClipSyncService
	cfg         *config.Config
}

// NewClipSyncHandler creates a new ClipSyncHandler
func NewClipSyncHandler(syncService *services.ClipSyncService, cfg *config.Config) *ClipSyncHandler {
	return &ClipSyncHandler{
		syncService: syncService,
		cfg:         cfg,
	}
}

// TriggerSync handles manual sync trigger
// POST /admin/sync/clips
func (h *ClipSyncHandler) TriggerSync(c *gin.Context) {
	var req struct {
		GameID        string `json:"game_id"`
		BroadcasterID string `json:"broadcaster_id"`
		Hours         int    `json:"hours"`
		Limit         int    `json:"limit"`
		Strategy      string `json:"strategy"` // "game", "broadcaster", "trending"
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
		})
		return
	}

	// Set defaults
	if req.Hours == 0 {
		req.Hours = 24
	}
	if req.Limit == 0 {
		req.Limit = 100
	}
	if req.Strategy == "" {
		if req.GameID != "" {
			req.Strategy = "game"
		} else if req.BroadcasterID != "" {
			req.Strategy = "broadcaster"
		} else {
			req.Strategy = "trending"
		}
	}

	// Execute sync based on strategy
	var stats *services.SyncStats
	var err error

	switch req.Strategy {
	case "game":
		if req.GameID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "game_id is required for game strategy",
			})
			return
		}
		stats, err = h.syncService.SyncClipsByGame(c.Request.Context(), req.GameID, req.Hours, req.Limit)
	case "broadcaster":
		if req.BroadcasterID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "broadcaster_id is required for broadcaster strategy",
			})
			return
		}
		stats, err = h.syncService.SyncClipsByBroadcaster(c.Request.Context(), req.BroadcasterID, req.Hours, req.Limit)
	case "trending":
		clipsPerGame := req.Limit / 10 // Distribute across ~10 games
		if clipsPerGame < 10 {
			clipsPerGame = 10
		}
		stats, err = h.syncService.SyncTrendingClips(c.Request.Context(), req.Hours, clipsPerGame)
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid strategy. Must be 'game', 'broadcaster', or 'trending'",
		})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Sync failed",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":       "Sync completed",
		"strategy":      req.Strategy,
		"clips_fetched": stats.ClipsFetched,
		"clips_created": stats.ClipsCreated,
		"clips_updated": stats.ClipsUpdated,
		"clips_skipped": stats.ClipsSkipped,
		"errors":        stats.Errors,
		"duration_ms":   stats.EndTime.Sub(stats.StartTime).Milliseconds(),
		"started_at":    stats.StartTime,
		"completed_at":  stats.EndTime,
	})
}

// GetSyncStatus returns the current sync status
// GET /admin/sync/status
func (h *ClipSyncHandler) GetSyncStatus(c *gin.Context) {
	// Get statistics from the clip repository
	// This would be extended with a proper sync status tracking mechanism

	c.JSON(http.StatusOK, gin.H{
		"status":  "ready",
		"message": "Sync service is operational",
	})
}

// RequestClip handles user clip submission
// POST /clips/request
func (h *ClipSyncHandler) RequestClip(c *gin.Context) {
	var req struct {
		ClipURL string `json:"clip_url" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "clip_url is required",
		})
		return
	}

	// Fetch and save the clip
	clip, err := h.syncService.FetchClipByURL(c.Request.Context(), req.ClipURL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch clip: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Clip added successfully",
		"clip":    clip,
	})
}

// ClipHandler handles clip retrieval operations
type ClipHandler struct {
	clipService *services.ClipService
	authService *services.AuthService
}

// NewClipHandler creates a new ClipHandler
func NewClipHandler(clipService *services.ClipService, authService *services.AuthService) *ClipHandler {
	return &ClipHandler{
		clipService: clipService,
		authService: authService,
	}
}

// StandardResponse represents a standard API response
type StandardResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
	Error   *ErrorInfo  `json:"error,omitempty"`
}

// ErrorInfo represents error information
type ErrorInfo struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// PaginationMeta represents pagination metadata
type PaginationMeta struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"total_pages"`
	HasNext    bool `json:"has_next"`
	HasPrev    bool `json:"has_prev"`
}

// ListClips handles GET /clips
func (h *ClipHandler) ListClips(c *gin.Context) {
	// Parse query parameters
	sort := c.DefaultQuery("sort", "hot")
	timeframe := c.Query("timeframe")
	gameID := c.Query("game_id")
	broadcasterID := c.Query("broadcaster_id")
	tag := c.Query("tag")
	search := c.Query("search")
	language := c.Query("language")
	top10kStreamers := c.Query("top10k_streamers") == "true"
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "25"))

	// Validate and constrain parameters
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 25
	}

	// Build filters
	filters := repository.ClipFilters{
		Sort:            sort,
		Top10kStreamers: top10kStreamers,
	}

	if gameID != "" {
		filters.GameID = &gameID
	}
	if broadcasterID != "" {
		filters.BroadcasterID = &broadcasterID
	}
	if tag != "" {
		filters.Tag = &tag
	}
	if search != "" {
		filters.Search = &search
	}
	if language != "" {
		filters.Language = &language
	}
	if timeframe != "" {
		filters.Timeframe = &timeframe
	}

	// Get user ID if authenticated
	var userID *uuid.UUID
	if userIDVal, exists := c.Get("user_id"); exists {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			userID = &uid
		}
	}

	// Fetch clips
	clips, total, err := h.clipService.ListClips(c.Request.Context(), filters, page, limit, userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to fetch clips",
			},
		})
		return
	}

	// Build pagination metadata
	totalPages := (total + limit - 1) / limit
	meta := PaginationMeta{
		Page:       page,
		Limit:      limit,
		Total:      total,
		TotalPages: totalPages,
		HasNext:    page < totalPages,
		HasPrev:    page > 1,
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    clips,
		Meta:    meta,
	})
}

// GetClip handles GET /clips/:id
func (h *ClipHandler) GetClip(c *gin.Context) {
	clipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_CLIP_ID",
				Message: "Invalid clip ID format",
			},
		})
		return
	}

	// Get user ID if authenticated
	var userID *uuid.UUID
	if userIDVal, exists := c.Get("user_id"); exists {
		if uid, ok := userIDVal.(uuid.UUID); ok {
			userID = &uid
		}
	}

	// Fetch clip
	clip, err := h.clipService.GetClip(c.Request.Context(), clipID, userID)
	if err != nil {
		c.JSON(http.StatusNotFound, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "CLIP_NOT_FOUND",
				Message: "Clip not found or has been removed",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    clip,
	})
}

// VoteOnClip handles POST /clips/:id/vote
func (h *ClipHandler) VoteOnClip(c *gin.Context) {
	clipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_CLIP_ID",
				Message: "Invalid clip ID format",
			},
		})
		return
	}

	// Get user ID (required)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}
	userID := userIDVal.(uuid.UUID)

	// Parse request body
	var req struct {
		Vote int16 `json:"vote" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request body",
			},
		})
		return
	}

	// Validate vote value
	if req.Vote != -1 && req.Vote != 0 && req.Vote != 1 {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_VOTE",
				Message: "Vote must be -1, 0, or 1",
			},
		})
		return
	}

	// Process vote
	err = h.clipService.VoteOnClip(c.Request.Context(), userID, clipID, req.Vote)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "VOTE_FAILED",
				Message: "Failed to process vote",
			},
		})
		return
	}

	// Fetch updated clip data
	clip, err := h.clipService.GetClip(c.Request.Context(), clipID, &userID)
	if err != nil {
		c.JSON(http.StatusOK, StandardResponse{
			Success: true,
			Data: gin.H{
				"message": "Vote processed successfully",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"message":        "Vote processed successfully",
			"vote_score":     clip.VoteScore,
			"upvote_count":   clip.UpvoteCount,
			"downvote_count": clip.DownvoteCount,
			"user_vote":      clip.UserVote,
		},
	})
}

// AddFavorite handles POST /clips/:id/favorite
func (h *ClipHandler) AddFavorite(c *gin.Context) {
	clipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_CLIP_ID",
				Message: "Invalid clip ID format",
			},
		})
		return
	}

	// Get user ID (required)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}
	userID := userIDVal.(uuid.UUID)

	// Add favorite
	err = h.clipService.AddFavorite(c.Request.Context(), userID, clipID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "FAVORITE_FAILED",
				Message: "Failed to add favorite",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"message":      "Clip added to favorites",
			"is_favorited": true,
		},
	})
}

// RemoveFavorite handles DELETE /clips/:id/favorite
func (h *ClipHandler) RemoveFavorite(c *gin.Context) {
	clipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_CLIP_ID",
				Message: "Invalid clip ID format",
			},
		})
		return
	}

	// Get user ID (required)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNAUTHORIZED",
				Message: "Authentication required",
			},
		})
		return
	}
	userID := userIDVal.(uuid.UUID)

	// Remove favorite
	err = h.clipService.RemoveFavorite(c.Request.Context(), userID, clipID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UNFAVORITE_FAILED",
				Message: "Failed to remove favorite",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"message":      "Clip removed from favorites",
			"is_favorited": false,
		},
	})
}

// GetRelatedClips handles GET /clips/:id/related
func (h *ClipHandler) GetRelatedClips(c *gin.Context) {
	clipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_CLIP_ID",
				Message: "Invalid clip ID format",
			},
		})
		return
	}

	// Get related clips
	clips, err := h.clipService.GetRelatedClips(c.Request.Context(), clipID, 10)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INTERNAL_ERROR",
				Message: "Failed to fetch related clips",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    clips,
	})
}

// UpdateClip handles PUT /clips/:id (admin only)
func (h *ClipHandler) UpdateClip(c *gin.Context) {
	clipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_CLIP_ID",
				Message: "Invalid clip ID format",
			},
		})
		return
	}

	// Parse request body
	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Invalid request body",
			},
		})
		return
	}

	// Update clip
	err = h.clipService.UpdateClip(c.Request.Context(), clipID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "UPDATE_FAILED",
				Message: err.Error(),
			},
		})
		return
	}

	// Fetch updated clip
	clip, err := h.clipService.GetClip(c.Request.Context(), clipID, nil)
	if err != nil {
		c.JSON(http.StatusOK, StandardResponse{
			Success: true,
			Data: gin.H{
				"message": "Clip updated successfully",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data:    clip,
	})
}

// DeleteClip handles DELETE /clips/:id (admin only)
func (h *ClipHandler) DeleteClip(c *gin.Context) {
	clipID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_CLIP_ID",
				Message: "Invalid clip ID format",
			},
		})
		return
	}

	// Parse request body for reason
	var req struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "INVALID_REQUEST",
				Message: "Removal reason is required",
			},
		})
		return
	}

	// Delete clip
	err = h.clipService.DeleteClip(c.Request.Context(), clipID, req.Reason)
	if err != nil {
		c.JSON(http.StatusInternalServerError, StandardResponse{
			Success: false,
			Error: &ErrorInfo{
				Code:    "DELETE_FAILED",
				Message: "Failed to delete clip",
			},
		})
		return
	}

	c.JSON(http.StatusOK, StandardResponse{
		Success: true,
		Data: gin.H{
			"message": "Clip deleted successfully",
		},
	})
}
