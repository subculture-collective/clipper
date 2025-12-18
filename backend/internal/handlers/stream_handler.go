package handlers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/twitch"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// StreamHandler handles stream-related HTTP requests
type StreamHandler struct {
	twitchClient *twitch.Client
	streamRepo   *repository.StreamRepository
	clipRepo     *repository.ClipRepository
}

// NewStreamHandler creates a new stream handler
func NewStreamHandler(twitchClient *twitch.Client, streamRepo *repository.StreamRepository, clipRepo *repository.ClipRepository) *StreamHandler {
	return &StreamHandler{
		twitchClient: twitchClient,
		streamRepo:   streamRepo,
		clipRepo:     clipRepo,
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

// CreateClipFromStream creates a clip from a live stream VOD
// POST /api/v1/streams/:streamer/clips
func (h *StreamHandler) CreateClipFromStream(c *gin.Context) {
	streamer := c.Param("streamer")
	if streamer == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "streamer username is required"})
		return
	}

	// Get user ID from context (middleware sets this)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	// Parse request body
	var req models.ClipFromStreamRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body", "details": err.Error()})
		return
	}

	ctx := c.Request.Context()

	// Validate duration
	duration := req.EndTime - req.StartTime
	if duration < 5 || duration > 60 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "clip duration must be between 5 and 60 seconds"})
		return
	}

	// Get stream info to verify it exists
	stream, user, err := h.twitchClient.GetStreamStatusByUsername(ctx, streamer)
	if err != nil {
		utils.GetLogger().Error("Failed to get stream status for clip creation", err, map[string]interface{}{
			"streamer": streamer,
		})
		c.JSON(http.StatusNotFound, gin.H{"error": "stream not found or VOD not available"})
		return
	}

	// For this initial implementation, we'll create a clip record in "processing" state
	// In a production implementation, this would trigger an async job to extract the video
	
	// Generate unique clip ID for Twitch compatibility
	clipID := uuid.New()
	twitchClipID := fmt.Sprintf("stream_%s_%d", streamer, time.Now().Unix())
	
	// Create clip record
	streamSource := "stream"
	status := "processing"
	now := time.Now()
	
	clip := &models.Clip{
		ID:               clipID,
		TwitchClipID:     twitchClipID,
		TwitchClipURL:    fmt.Sprintf("https://clips.twitch.tv/%s", twitchClipID),
		EmbedURL:         fmt.Sprintf("https://clips.twitch.tv/embed?clip=%s", twitchClipID),
		Title:            req.Title,
		CreatorName:      user.Login,
		CreatorID:        &user.ID,
		BroadcasterName:  user.Login,
		BroadcasterID:    &user.ID,
		Duration:         &duration,
		ViewCount:        0,
		CreatedAt:        now,
		ImportedAt:       now,
		VoteScore:        0,
		CommentCount:     0,
		FavoriteCount:    0,
		IsFeatured:       false,
		IsNSFW:           false,
		IsRemoved:        false,
		IsHidden:         false,
		SubmittedByUserID: &userID,
		SubmittedAt:      &now,
		StreamSource:     &streamSource,
		Status:           &status,
		Quality:          &req.Quality,
		StartTime:        &req.StartTime,
		EndTime:          &req.EndTime,
	}

	// Add stream metadata if available
	if stream != nil {
		clip.GameName = &stream.GameName
		clip.GameID = &stream.GameID
		clip.Language = &stream.Language
	}

	// Insert clip into database using repository method
	err = h.clipRepo.CreateStreamClip(ctx, clip)

	if err != nil {
		utils.GetLogger().Error("Failed to create clip from stream", err, map[string]interface{}{
			"streamer": streamer,
			"user_id":  userID.String(),
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create clip"})
		return
	}

	// TODO: In production, enqueue a job to extract the video using FFmpeg
	// For now, we'll simulate by marking it as ready after a delay
	// This would be handled by a background worker in a real implementation

	utils.GetLogger().Info("Clip from stream created", map[string]interface{}{
		"clip_id":  clipID.String(),
		"streamer": streamer,
		"user_id":  userID.String(),
	})

	// Return response
	response := models.ClipFromStreamResponse{
		ClipID: clipID.String(),
		Status: "processing",
	}

	c.JSON(http.StatusCreated, response)
}
