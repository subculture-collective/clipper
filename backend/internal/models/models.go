package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	TwitchID    string     `json:"twitch_id" db:"twitch_id"`
	Username    string     `json:"username" db:"username"`
	DisplayName string     `json:"display_name" db:"display_name"`
	Email       *string    `json:"email,omitempty" db:"email"`
	AvatarURL   *string    `json:"avatar_url,omitempty" db:"avatar_url"`
	Bio         *string    `json:"bio,omitempty" db:"bio"`
	KarmaPoints int        `json:"karma_points" db:"karma_points"`
	Role        string     `json:"role" db:"role"`
	IsBanned    bool       `json:"is_banned" db:"is_banned"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
}

// Clip represents a Twitch clip
type Clip struct {
	ID              uuid.UUID `json:"id" db:"id"`
	TwitchClipID    string    `json:"twitch_clip_id" db:"twitch_clip_id"`
	TwitchClipURL   string    `json:"twitch_clip_url" db:"twitch_clip_url"`
	EmbedURL        string    `json:"embed_url" db:"embed_url"`
	Title           string    `json:"title" db:"title"`
	CreatorName     string    `json:"creator_name" db:"creator_name"`
	CreatorID       *string   `json:"creator_id,omitempty" db:"creator_id"`
	BroadcasterName string    `json:"broadcaster_name" db:"broadcaster_name"`
	BroadcasterID   *string   `json:"broadcaster_id,omitempty" db:"broadcaster_id"`
	GameID          *string   `json:"game_id,omitempty" db:"game_id"`
	GameName        *string   `json:"game_name,omitempty" db:"game_name"`
	Language        *string   `json:"language,omitempty" db:"language"`
	ThumbnailURL    *string   `json:"thumbnail_url,omitempty" db:"thumbnail_url"`
	Duration        *float64  `json:"duration,omitempty" db:"duration"`
	ViewCount       int       `json:"view_count" db:"view_count"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
	ImportedAt      time.Time `json:"imported_at" db:"imported_at"`
	VoteScore       int       `json:"vote_score" db:"vote_score"`
	CommentCount    int       `json:"comment_count" db:"comment_count"`
	FavoriteCount   int       `json:"favorite_count" db:"favorite_count"`
	IsFeatured      bool      `json:"is_featured" db:"is_featured"`
	IsNSFW          bool      `json:"is_nsfw" db:"is_nsfw"`
	IsRemoved       bool      `json:"is_removed" db:"is_removed"`
	RemovedReason   *string   `json:"removed_reason,omitempty" db:"removed_reason"`
}

// Vote represents a user's vote on a clip
type Vote struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	ClipID    uuid.UUID `json:"clip_id" db:"clip_id"`
	VoteType  int16     `json:"vote_type" db:"vote_type"` // 1 for upvote, -1 for downvote
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Comment represents a user comment on a clip
type Comment struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	ClipID          uuid.UUID  `json:"clip_id" db:"clip_id"`
	UserID          uuid.UUID  `json:"user_id" db:"user_id"`
	ParentCommentID *uuid.UUID `json:"parent_comment_id,omitempty" db:"parent_comment_id"`
	Content         string     `json:"content" db:"content"`
	VoteScore       int        `json:"vote_score" db:"vote_score"`
	IsEdited        bool       `json:"is_edited" db:"is_edited"`
	IsRemoved       bool       `json:"is_removed" db:"is_removed"`
	RemovedReason   *string    `json:"removed_reason,omitempty" db:"removed_reason"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// CommentVote represents a user's vote on a comment
type CommentVote struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	CommentID uuid.UUID `json:"comment_id" db:"comment_id"`
	VoteType  int16     `json:"vote_type" db:"vote_type"` // 1 for upvote, -1 for downvote
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Favorite represents a user's favorite clip
type Favorite struct {
	ID        uuid.UUID `json:"id" db:"id"`
	UserID    uuid.UUID `json:"user_id" db:"user_id"`
	ClipID    uuid.UUID `json:"clip_id" db:"clip_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Tag represents a categorization tag
type Tag struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Slug        string    `json:"slug" db:"slug"`
	Description *string   `json:"description,omitempty" db:"description"`
	Color       *string   `json:"color,omitempty" db:"color"`
	UsageCount  int       `json:"usage_count" db:"usage_count"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// ClipTag represents the many-to-many relationship between clips and tags
type ClipTag struct {
	ClipID    uuid.UUID `json:"clip_id" db:"clip_id"`
	TagID     uuid.UUID `json:"tag_id" db:"tag_id"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Report represents a user report for moderation
type Report struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	ReporterID     uuid.UUID  `json:"reporter_id" db:"reporter_id"`
	ReportableType string     `json:"reportable_type" db:"reportable_type"` // 'clip', 'comment', 'user'
	ReportableID   uuid.UUID  `json:"reportable_id" db:"reportable_id"`
	Reason         string     `json:"reason" db:"reason"`
	Description    *string    `json:"description,omitempty" db:"description"`
	Status         string     `json:"status" db:"status"` // pending, reviewed, actioned, dismissed
	ReviewedBy     *uuid.UUID `json:"reviewed_by,omitempty" db:"reviewed_by"`
	ReviewedAt     *time.Time `json:"reviewed_at,omitempty" db:"reviewed_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
}

// ClipWithHotScore represents a clip with calculated hot score
type ClipWithHotScore struct {
	Clip
	HotScore float64 `json:"hot_score" db:"hot_score"`
}
