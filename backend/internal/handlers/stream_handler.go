package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/twitch"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// StreamHandler handles stream-related HTTP requests
type StreamHandler struct {
	twitchClient *twitch.Client
	streamRepo   *repository.StreamRepository
}

// NewStreamHandler creates a new stream handler
func NewStreamHandler(twitchClient *twitch.Client, streamRepo *repository.StreamRepository) *StreamHandler {
	return &StreamHandler{
		twitchClient: twitchClient,
		streamRepo:   streamRepo,
	}
}

// GetStreamStatus returns stream status for a specific streamer
// GET /api/v1/streams/:streamer
func (h *StreamHandler) GetStreamStatus(c *gin.Context) {
	streamer := c.Param("streamer")
	if streamer == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "streamer username is required"})
		return
	}

	ctx := c.Request.Context()

	// Get stream status from Twitch API (with caching)
	stream, user, err := h.twitchClient.GetStreamStatusByUsername(ctx, streamer)
	if err != nil {
		// Check if user not found
		if apiErr, ok := err.(*twitch.APIError); ok {
			if apiErr.StatusCode == 404 {
				c.JSON(http.StatusNotFound, gin.H{"error": "streamer not found"})
				return
			}
		}
		utils.GetLogger().Error("Failed to get stream status", err, map[string]interface{}{
			"streamer": streamer,
		})
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":    "failed to get stream status",
			"streamer": streamer,
		})
		return
	}

	// Build stream model for database
	dbStream := &models.Stream{
		StreamerUsername: user.Login,
		StreamerUserID:   &user.ID,
		DisplayName:      &user.DisplayName,
		IsLive:           stream != nil,
		ViewerCount:      0,
	}

	if stream != nil {
		// Stream is live
		dbStream.Title = &stream.Title
		dbStream.GameName = &stream.GameName
		dbStream.ViewerCount = stream.ViewerCount
		dbStream.LastWentLive = &stream.StartedAt
	} else {
		// Stream is offline - set last went offline to now if this is a transition
		now := time.Now()
		dbStream.LastWentOffline = &now
	}

	// Persist to database
	if err := h.streamRepo.UpsertStream(ctx, dbStream); err != nil {
		utils.GetLogger().Error("Failed to persist stream to database", err, map[string]interface{}{
			"streamer": streamer,
		})
		// Continue anyway - don't fail the request if DB persistence fails
	}

	// Try to get historical data from database for offline streams
	var lastWentOffline *time.Time
	if !dbStream.IsLive {
		if existingStream, err := h.streamRepo.GetStreamByUsername(ctx, streamer); err == nil {
			lastWentOffline = existingStream.LastWentOffline
		} else if err != sql.ErrNoRows {
			utils.GetLogger().Warn("Failed to get stream from database", map[string]interface{}{
				"streamer": streamer,
				"error":    err.Error(),
			})
		}
	}

	// Build response
	streamInfo := models.StreamInfo{
		StreamerUsername: user.Login,
		IsLive:           stream != nil,
		ViewerCount:      0,
		LastWentOffline:  lastWentOffline,
	}

	if stream != nil {
		// Stream is live
		streamInfo.Title = &stream.Title
		streamInfo.GameName = &stream.GameName
		streamInfo.ViewerCount = stream.ViewerCount
		streamInfo.StartedAt = &stream.StartedAt
		streamInfo.ThumbnailURL = &stream.ThumbnailURL
	}

	c.JSON(http.StatusOK, streamInfo)
}
