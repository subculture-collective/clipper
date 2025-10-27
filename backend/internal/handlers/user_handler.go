package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// UserHandler handles user-related HTTP requests
type UserHandler struct {
	clipRepo    *repository.ClipRepository
	voteRepo    *repository.VoteRepository
	commentRepo *repository.CommentRepository
}

// NewUserHandler creates a new user handler
func NewUserHandler(
	clipRepo *repository.ClipRepository,
	voteRepo *repository.VoteRepository,
	commentRepo *repository.CommentRepository,
) *UserHandler {
	return &UserHandler{
		clipRepo:    clipRepo,
		voteRepo:    voteRepo,
		commentRepo: commentRepo,
	}
}

// GetUserComments retrieves comments by a user
// GET /api/v1/users/:id/comments
func (h *UserHandler) GetUserComments(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Get user comments
	comments, total, err := h.commentRepo.ListByUserID(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve comments"})
		return
	}

	// Transform to response format
	type CommentResponse struct {
		ID              string  `json:"id"`
		ClipID          string  `json:"clip_id"`
		UserID          string  `json:"user_id"`
		Username        string  `json:"username"`
		UserAvatar      *string `json:"user_avatar"`
		UserKarma       int     `json:"user_karma"`
		UserRole        string  `json:"user_role"`
		ParentID        *string `json:"parent_id"`
		Content         string  `json:"content"`
		VoteScore       int     `json:"vote_score"`
		CreatedAt       string  `json:"created_at"`
		UpdatedAt       string  `json:"updated_at"`
		IsDeleted       bool    `json:"is_deleted"`
		IsRemoved       bool    `json:"is_removed"`
		RemovedReason   *string `json:"removed_reason"`
		Depth           int     `json:"depth"`
		ChildCount      int     `json:"child_count"`
		UserVote        *int16  `json:"user_vote"`
	}

	responses := make([]CommentResponse, len(comments))
	for i, comment := range comments {
		var parentID *string
		if comment.ParentCommentID != nil {
			pid := comment.ParentCommentID.String()
			parentID = &pid
		}

		responses[i] = CommentResponse{
			ID:            comment.ID.String(),
			ClipID:        comment.ClipID.String(),
			UserID:        comment.UserID.String(),
			Username:      comment.AuthorUsername,
			UserAvatar:    comment.AuthorAvatarURL,
			UserKarma:     comment.AuthorKarma,
			UserRole:      comment.AuthorRole,
			ParentID:      parentID,
			Content:       comment.Content,
			VoteScore:     comment.VoteScore,
			CreatedAt:     comment.CreatedAt.Format("2006-01-02T15:04:05Z"),
			UpdatedAt:     comment.UpdatedAt.Format("2006-01-02T15:04:05Z"),
			IsDeleted:     false,
			IsRemoved:     comment.IsRemoved,
			RemovedReason: comment.RemovedReason,
			Depth:         0,
			ChildCount:    comment.ReplyCount,
			UserVote:      comment.UserVote,
		}
	}

	totalPages := (total + limit - 1) / limit
	c.JSON(http.StatusOK, gin.H{
		"comments": responses,
		"total":    total,
		"page":     page,
		"limit":    limit,
		"has_more": page < totalPages,
	})
}

// GetUserUpvotedClips retrieves clips that a user has upvoted
// GET /api/v1/users/:id/upvoted
func (h *UserHandler) GetUserUpvotedClips(c *gin.Context) {
	h.getUserVotedClips(c, 1)
}

// GetUserDownvotedClips retrieves clips that a user has downvoted
// GET /api/v1/users/:id/downvoted
func (h *UserHandler) GetUserDownvotedClips(c *gin.Context) {
	h.getUserVotedClips(c, -1)
}

// getUserVotedClips is a helper function to retrieve clips that a user has voted on
func (h *UserHandler) getUserVotedClips(c *gin.Context, voteType int16) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 10
	}
	offset := (page - 1) * limit

	// Get voted clip IDs
	clipIDs, total, err := h.voteRepo.GetUserVotedClips(c.Request.Context(), userID, voteType, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve voted clips"})
		return
	}

	// Get clip details
	clips := []models.Clip{}
	if len(clipIDs) > 0 {
		clips, err = h.clipRepo.GetByIDs(c.Request.Context(), clipIDs)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve clip details"})
			return
		}
	}

	// Transform to response format
	type ClipResponse struct {
		ID              string   `json:"id"`
		TwitchClipID    string   `json:"twitch_clip_id"`
		TwitchClipURL   string   `json:"twitch_clip_url"`
		EmbedURL        string   `json:"embed_url"`
		Title           string   `json:"title"`
		CreatorName     string   `json:"creator_name"`
		CreatorID       *string  `json:"creator_id"`
		BroadcasterName string   `json:"broadcaster_name"`
		BroadcasterID   *string  `json:"broadcaster_id"`
		GameID          *string  `json:"game_id"`
		GameName        *string  `json:"game_name"`
		Language        *string  `json:"language"`
		ThumbnailURL    *string  `json:"thumbnail_url"`
		Duration        *float64 `json:"duration"`
		ViewCount       int      `json:"view_count"`
		CreatedAt       string   `json:"created_at"`
		ImportedAt      string   `json:"imported_at"`
		VoteScore       int      `json:"vote_score"`
		CommentCount    int      `json:"comment_count"`
		FavoriteCount   int      `json:"favorite_count"`
		IsFeatured      bool     `json:"is_featured"`
		IsNSFW          bool     `json:"is_nsfw"`
		IsRemoved       bool     `json:"is_removed"`
		RemovedReason   *string  `json:"removed_reason"`
		UserVote        *int16   `json:"user_vote"`
	}

	responses := make([]ClipResponse, len(clips))
	for i, clip := range clips {
		userVote := voteType
		responses[i] = ClipResponse{
			ID:              clip.ID.String(),
			TwitchClipID:    clip.TwitchClipID,
			TwitchClipURL:   clip.TwitchClipURL,
			EmbedURL:        clip.EmbedURL,
			Title:           clip.Title,
			CreatorName:     clip.CreatorName,
			CreatorID:       clip.CreatorID,
			BroadcasterName: clip.BroadcasterName,
			BroadcasterID:   clip.BroadcasterID,
			GameID:          clip.GameID,
			GameName:        clip.GameName,
			Language:        clip.Language,
			ThumbnailURL:    clip.ThumbnailURL,
			Duration:        clip.Duration,
			ViewCount:       clip.ViewCount,
			CreatedAt:       clip.CreatedAt.Format("2006-01-02T15:04:05Z"),
			ImportedAt:      clip.ImportedAt.Format("2006-01-02T15:04:05Z"),
			VoteScore:       clip.VoteScore,
			CommentCount:    clip.CommentCount,
			FavoriteCount:   clip.FavoriteCount,
			IsFeatured:      clip.IsFeatured,
			IsNSFW:          clip.IsNSFW,
			IsRemoved:       clip.IsRemoved,
			RemovedReason:   clip.RemovedReason,
			UserVote:        &userVote,
		}
	}

	totalPages := (total + limit - 1) / limit
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    responses,
		"meta": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": totalPages,
			"has_next":    page < totalPages,
			"has_prev":    page > 1,
		},
	})
}
