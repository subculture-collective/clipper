package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/config"
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
	clipRepo *services.ClipSyncService
}

// NewClipHandler creates a new ClipHandler
func NewClipHandler(clipRepo *services.ClipSyncService) *ClipHandler {
	return &ClipHandler{
		clipRepo: clipRepo,
	}
}
