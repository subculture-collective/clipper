package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/pkg/twitch"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// StreamHandler handles stream-related HTTP requests
type StreamHandler struct {
	twitchClient *twitch.Client
}

// NewStreamHandler creates a new stream handler
func NewStreamHandler(twitchClient *twitch.Client) *StreamHandler {
	return &StreamHandler{
		twitchClient: twitchClient,
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get stream status"})
		return
	}

	// Build response
	streamInfo := models.StreamInfo{
		StreamerUsername: user.Login,
		IsLive:           stream != nil,
		ViewerCount:      0,
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
