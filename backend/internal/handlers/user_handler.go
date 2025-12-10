package handlers

import (
	"log"
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
	userRepo    *repository.UserRepository
}

// NewUserHandler creates a new user handler
func NewUserHandler(
	clipRepo *repository.ClipRepository,
	voteRepo *repository.VoteRepository,
	commentRepo *repository.CommentRepository,
	userRepo *repository.UserRepository,
) *UserHandler {
	return &UserHandler{
		clipRepo:    clipRepo,
		voteRepo:    voteRepo,
		commentRepo: commentRepo,
		userRepo:    userRepo,
	}
}

// GetUserByUsername retrieves a user's public profile by username
// GET /api/v1/users/by-username/:username
func (h *UserHandler) GetUserByUsername(c *gin.Context) {
	username := c.Param("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username is required"})
		return
	}

	user, err := h.userRepo.GetByUsername(c.Request.Context(), username)
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve user"})
		return
	}

	// Check if full profile with stats is requested
	fullProfile := c.Query("full") == "true"
	if fullProfile {
		// Get current user ID if authenticated
		var currentUserID *uuid.UUID
		if userIDInterface, exists := c.Get("user_id"); exists {
			if uid, ok := userIDInterface.(uuid.UUID); ok {
				currentUserID = &uid
			}
		}

		profile, err := h.userRepo.GetUserProfile(c.Request.Context(), user.ID, currentUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve user profile"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"data":    profile,
		})
		return
	}

	// Return only basic public user information
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"id":           user.ID,
			"username":     user.Username,
			"display_name": user.DisplayName,
			"avatar_url":   user.AvatarURL,
			"bio":          user.Bio,
			"karma_points": user.KarmaPoints,
			"role":         user.Role,
			"created_at":   user.CreatedAt,
		},
	})
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
		ID            string  `json:"id"`
		ClipID        string  `json:"clip_id"`
		UserID        string  `json:"user_id"`
		Username      string  `json:"username"`
		UserAvatar    *string `json:"user_avatar"`
		UserKarma     int     `json:"user_karma"`
		UserRole      string  `json:"user_role"`
		ParentID      *string `json:"parent_id"`
		Content       string  `json:"content"`
		VoteScore     int     `json:"vote_score"`
		CreatedAt     string  `json:"created_at"`
		UpdatedAt     string  `json:"updated_at"`
		IsDeleted     bool    `json:"is_deleted"`
		IsRemoved     bool    `json:"is_removed"`
		RemovedReason *string `json:"removed_reason"`
		Depth         int     `json:"depth"`
		ChildCount    int     `json:"child_count"`
		UserVote      *int16  `json:"user_vote"`
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

// GetUserProfile retrieves a user's complete profile with stats
// GET /api/v1/users/:id
func (h *UserHandler) GetUserProfile(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Get current user ID if authenticated
	var currentUserID *uuid.UUID
	if userIDInterface, exists := c.Get("user_id"); exists {
		if uid, ok := userIDInterface.(uuid.UUID); ok {
			currentUserID = &uid
		}
	}

	profile, err := h.userRepo.GetUserProfile(c.Request.Context(), userID, currentUserID)
	if err != nil {
		if err == repository.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve user profile"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    profile,
	})
}

// GetUserClips retrieves clips submitted by a user
// GET /api/v1/users/:id/clips
func (h *UserHandler) GetUserClips(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	// Use ListWithFilters with submitted_by filter
	filters := repository.ClipFilters{
		SubmittedByUserID: &userID,
	}
	
	clips, total, err := h.clipRepo.ListWithFilters(c.Request.Context(), filters, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve clips"})
		return
	}

	totalPages := (total + limit - 1) / limit
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    clips,
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

// GetUserActivity retrieves a user's activity feed
// GET /api/v1/users/:id/activity
func (h *UserHandler) GetUserActivity(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	activities, total, err := h.userRepo.GetUserActivity(c.Request.Context(), userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve user activity"})
		return
	}

	totalPages := (total + limit - 1) / limit
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    activities,
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

// GetUserFollowers retrieves users who follow the specified user
// GET /api/v1/users/:id/followers
func (h *UserHandler) GetUserFollowers(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Get current user ID if authenticated
	var currentUserID *uuid.UUID
	if userIDInterface, exists := c.Get("user_id"); exists {
		if uid, ok := userIDInterface.(uuid.UUID); ok {
			currentUserID = &uid
		}
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	followers, total, err := h.userRepo.GetFollowers(c.Request.Context(), userID, currentUserID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve followers"})
		return
	}

	totalPages := (total + limit - 1) / limit
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    followers,
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

// GetUserFollowing retrieves users that the specified user follows
// GET /api/v1/users/:id/following
func (h *UserHandler) GetUserFollowing(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Get current user ID if authenticated
	var currentUserID *uuid.UUID
	if userIDInterface, exists := c.Get("user_id"); exists {
		if uid, ok := userIDInterface.(uuid.UUID); ok {
			currentUserID = &uid
		}
	}

	// Parse pagination parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	following, total, err := h.userRepo.GetFollowing(c.Request.Context(), userID, currentUserID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to retrieve following"})
		return
	}

	totalPages := (total + limit - 1) / limit
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    following,
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

// FollowUser creates a follow relationship
// POST /api/v1/users/:id/follow
func (h *UserHandler) FollowUser(c *gin.Context) {
	userIDStr := c.Param("id")
	followingID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Get current user ID
	followerID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	followerUUID := followerID.(uuid.UUID)

	// Can't follow yourself
	if followerUUID == followingID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "cannot follow yourself"})
		return
	}

	// Create follow relationship
	err = h.userRepo.FollowUser(c.Request.Context(), followerUUID, followingID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to follow user"})
		return
	}

	// Record activity
	activity := &models.UserActivity{
		ID:           uuid.New(),
		UserID:       followerUUID,
		ActivityType: models.ActivityTypeUserFollowed,
		TargetID:     &followingID,
		TargetType:   strPtr("user"),
	}
	if err := h.userRepo.CreateUserActivity(c.Request.Context(), activity); err != nil {
		log.Printf("Warning: Failed to record follow activity for user %s: %v", followerUUID, err)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "user followed successfully",
	})
}

// UnfollowUser removes a follow relationship
// DELETE /api/v1/users/:id/follow
func (h *UserHandler) UnfollowUser(c *gin.Context) {
	userIDStr := c.Param("id")
	followingID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user ID"})
		return
	}

	// Get current user ID
	followerID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	followerUUID := followerID.(uuid.UUID)

	// Remove follow relationship
	err = h.userRepo.UnfollowUser(c.Request.Context(), followerUUID, followingID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to unfollow user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "user unfollowed successfully",
	})
}

// Helper function
func strPtr(s string) *string {
	return &s
}
