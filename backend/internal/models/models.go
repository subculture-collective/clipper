package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID                  uuid.UUID  `json:"id" db:"id"`
	TwitchID            string     `json:"twitch_id" db:"twitch_id"`
	Username            string     `json:"username" db:"username"`
	DisplayName         string     `json:"display_name" db:"display_name"`
	Email               *string    `json:"email,omitempty" db:"email"`
	AvatarURL           *string    `json:"avatar_url,omitempty" db:"avatar_url"`
	Bio                 *string    `json:"bio,omitempty" db:"bio"`
	SocialLinks         *string    `json:"social_links,omitempty" db:"social_links"` // JSONB stored as string
	KarmaPoints         int        `json:"karma_points" db:"karma_points"`
	TrustScore          int        `json:"trust_score" db:"trust_score"`
	TrustScoreUpdatedAt *time.Time `json:"trust_score_updated_at,omitempty" db:"trust_score_updated_at"`
	Role                string     `json:"role" db:"role"`
	IsBanned            bool       `json:"is_banned" db:"is_banned"`
	DeviceToken         *string    `json:"device_token,omitempty" db:"device_token"`
	DevicePlatform      *string    `json:"device_platform,omitempty" db:"device_platform"`
	FollowerCount       int        `json:"follower_count" db:"follower_count"`
	FollowingCount      int        `json:"following_count" db:"following_count"`
	CreatedAt           time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time  `json:"updated_at" db:"updated_at"`
	LastLoginAt         *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
}

// UserSettings represents user privacy and other settings
type UserSettings struct {
	UserID            uuid.UUID `json:"user_id" db:"user_id"`
	ProfileVisibility string    `json:"profile_visibility" db:"profile_visibility"` // public, private, followers
	ShowKarmaPublicly bool      `json:"show_karma_publicly" db:"show_karma_publicly"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
}

// AccountDeletion represents a pending account deletion request
type AccountDeletion struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	UserID       uuid.UUID  `json:"user_id" db:"user_id"`
	RequestedAt  time.Time  `json:"requested_at" db:"requested_at"`
	ScheduledFor time.Time  `json:"scheduled_for" db:"scheduled_for"`
	Reason       *string    `json:"reason,omitempty" db:"reason"`
	IsCancelled  bool       `json:"is_cancelled" db:"is_cancelled"`
	CancelledAt  *time.Time `json:"cancelled_at,omitempty" db:"cancelled_at"`
	CompletedAt  *time.Time `json:"completed_at,omitempty" db:"completed_at"`
}

// UpdateProfileRequest represents the request to update user profile
type UpdateProfileRequest struct {
	DisplayName string  `json:"display_name" binding:"required,min=1,max=100"`
	Bio         *string `json:"bio" binding:"omitempty,max=500"`
}

// UpdateUserSettingsRequest represents the request to update user settings
type UpdateUserSettingsRequest struct {
	ProfileVisibility *string `json:"profile_visibility,omitempty" binding:"omitempty,oneof=public private followers"`
	ShowKarmaPublicly *bool   `json:"show_karma_publicly,omitempty"`
}

// DeleteAccountRequest represents the request to delete an account
type DeleteAccountRequest struct {
	Reason       *string `json:"reason,omitempty" binding:"omitempty,max=1000"`
	Confirmation string  `json:"confirmation" binding:"required,eq=DELETE MY ACCOUNT"`
}

// Clip represents a Twitch clip
type Clip struct {
	ID                   uuid.UUID  `json:"id" db:"id"`
	TwitchClipID         string     `json:"twitch_clip_id" db:"twitch_clip_id"`
	TwitchClipURL        string     `json:"twitch_clip_url" db:"twitch_clip_url"`
	EmbedURL             string     `json:"embed_url" db:"embed_url"`
	Title                string     `json:"title" db:"title"`
	CreatorName          string     `json:"creator_name" db:"creator_name"`
	CreatorID            *string    `json:"creator_id,omitempty" db:"creator_id"`
	BroadcasterName      string     `json:"broadcaster_name" db:"broadcaster_name"`
	BroadcasterID        *string    `json:"broadcaster_id,omitempty" db:"broadcaster_id"`
	GameID               *string    `json:"game_id,omitempty" db:"game_id"`
	GameName             *string    `json:"game_name,omitempty" db:"game_name"`
	Language             *string    `json:"language,omitempty" db:"language"`
	ThumbnailURL         *string    `json:"thumbnail_url,omitempty" db:"thumbnail_url"`
	Duration             *float64   `json:"duration,omitempty" db:"duration"`
	ViewCount            int        `json:"view_count" db:"view_count"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	ImportedAt           time.Time  `json:"imported_at" db:"imported_at"`
	VoteScore            int        `json:"vote_score" db:"vote_score"`
	CommentCount         int        `json:"comment_count" db:"comment_count"`
	FavoriteCount        int        `json:"favorite_count" db:"favorite_count"`
	IsFeatured           bool       `json:"is_featured" db:"is_featured"`
	IsNSFW               bool       `json:"is_nsfw" db:"is_nsfw"`
	IsRemoved            bool       `json:"is_removed" db:"is_removed"`
	RemovedReason        *string    `json:"removed_reason,omitempty" db:"removed_reason"`
	IsHidden             bool       `json:"is_hidden" db:"is_hidden"`
	Embedding            []float32  `json:"embedding,omitempty" db:"embedding"`
	EmbeddingGeneratedAt *time.Time `json:"embedding_generated_at,omitempty" db:"embedding_generated_at"`
	EmbeddingModel       *string    `json:"embedding_model,omitempty" db:"embedding_model"`
	SubmittedByUserID    *uuid.UUID `json:"submitted_by_user_id,omitempty" db:"submitted_by_user_id"`
	SubmittedAt          *time.Time `json:"submitted_at,omitempty" db:"submitted_at"`
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

// ClipSubmitterInfo represents basic info about the user who submitted a clip
type ClipSubmitterInfo struct {
	ID          uuid.UUID `json:"id"`
	Username    string    `json:"username"`
	DisplayName string    `json:"display_name"`
	AvatarURL   *string   `json:"avatar_url,omitempty"`
}

// ClipWithSubmitter represents a clip with submitter information
type ClipWithSubmitter struct {
	Clip
	SubmittedBy *ClipSubmitterInfo `json:"submitted_by,omitempty"`
}

// SearchRequest represents a search query request
type SearchRequest struct {
	Query     string   `json:"query" form:"q"`
	Type      string   `json:"type" form:"type"` // clips, creators, games, tags, all
	Sort      string   `json:"sort" form:"sort"` // relevance (default), recent, popular
	GameID    *string  `json:"game_id" form:"game_id"`
	CreatorID *string  `json:"creator_id" form:"creator_id"`
	Language  *string  `json:"language" form:"language"`
	Tags      []string `json:"tags" form:"tags"`
	MinVotes  *int     `json:"min_votes" form:"min_votes"`
	DateFrom  *string  `json:"date_from" form:"date_from"`
	DateTo    *string  `json:"date_to" form:"date_to"`
	Page      int      `json:"page" form:"page"`
	Limit     int      `json:"limit" form:"limit"`
}

// SearchResponse represents search results
type SearchResponse struct {
	Query   string              `json:"query"`
	Results SearchResultsByType `json:"results"`
	Counts  SearchCounts        `json:"counts"`
	Facets  SearchFacets        `json:"facets,omitempty"`
	Meta    SearchMeta          `json:"meta"`
}

// SearchResultsByType groups results by type
type SearchResultsByType struct {
	Clips    []Clip `json:"clips,omitempty"`
	Creators []User `json:"creators,omitempty"`
	Games    []Game `json:"games,omitempty"`
	Tags     []Tag  `json:"tags,omitempty"`
}

// SearchCounts holds counts for each result type
type SearchCounts struct {
	Clips    int `json:"clips"`
	Creators int `json:"creators"`
	Games    int `json:"games"`
	Tags     int `json:"tags"`
}

// SearchMeta holds pagination and other metadata
type SearchMeta struct {
	Page       int `json:"page"`
	Limit      int `json:"limit"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}

// SearchFacets holds aggregated facet data for filtering
type SearchFacets struct {
	Languages []FacetBucket  `json:"languages,omitempty"`
	Games     []FacetBucket  `json:"games,omitempty"`
	Tags      []FacetBucket  `json:"tags,omitempty"`
	DateRange DateRangeFacet `json:"date_range,omitempty"`
}

// FacetBucket represents a single facet value with its count
type FacetBucket struct {
	Key   string `json:"key"`
	Label string `json:"label,omitempty"` // Human-readable label
	Count int    `json:"count"`
}

// DateRangeFacet represents date range distribution
type DateRangeFacet struct {
	LastHour  int `json:"last_hour"`
	LastDay   int `json:"last_day"`
	LastWeek  int `json:"last_week"`
	LastMonth int `json:"last_month"`
	Older     int `json:"older"`
}

// Game represents a game (aggregated from clips)
type Game struct {
	ID        string `json:"id" db:"game_id"`
	Name      string `json:"name" db:"game_name"`
	ClipCount int    `json:"clip_count" db:"clip_count"`
}

// SearchSuggestion represents an autocomplete suggestion
type SearchSuggestion struct {
	Text string `json:"text"`
	Type string `json:"type"` // query, game, creator, tag
}

// SearchQuery tracks a search query for analytics
type SearchQuery struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	UserID            *uuid.UUID `json:"user_id,omitempty" db:"user_id"`
	Query             string     `json:"query" db:"query"`
	Filters           *string    `json:"filters,omitempty" db:"filters"`
	ResultCount       int        `json:"result_count" db:"result_count"`
	ClickedResultID   *uuid.UUID `json:"clicked_result_id,omitempty" db:"clicked_result_id"`
	ClickedResultType *string    `json:"clicked_result_type,omitempty" db:"clicked_result_type"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
}

// ClipScore represents the relevance score for a clip in search results
type ClipScore struct {
	ClipID          uuid.UUID `json:"clip_id"`
	SimilarityScore float64   `json:"similarity_score"` // 0-1, higher is better
	SimilarityRank  int       `json:"similarity_rank"`  // 1-based ranking
}

// SearchResponseWithScores extends SearchResponse with similarity scores
type SearchResponseWithScores struct {
	SearchResponse
	Scores []ClipScore `json:"scores,omitempty"`
}

// ClipSubmission represents a user-submitted clip pending moderation
type ClipSubmission struct {
	ID                      uuid.UUID  `json:"id" db:"id"`
	UserID                  uuid.UUID  `json:"user_id" db:"user_id"`
	TwitchClipID            string     `json:"twitch_clip_id" db:"twitch_clip_id"`
	TwitchClipURL           string     `json:"twitch_clip_url" db:"twitch_clip_url"`
	Title                   *string    `json:"title,omitempty" db:"title"`
	CustomTitle             *string    `json:"custom_title,omitempty" db:"custom_title"`
	BroadcasterNameOverride *string    `json:"broadcaster_name_override,omitempty" db:"broadcaster_name_override"`
	Tags                    []string   `json:"tags,omitempty" db:"tags"`
	IsNSFW                  bool       `json:"is_nsfw" db:"is_nsfw"`
	SubmissionReason        *string    `json:"submission_reason,omitempty" db:"submission_reason"`
	Status                  string     `json:"status" db:"status"` // pending, approved, rejected
	RejectionReason         *string    `json:"rejection_reason,omitempty" db:"rejection_reason"`
	ReviewedBy              *uuid.UUID `json:"reviewed_by,omitempty" db:"reviewed_by"`
	ReviewedAt              *time.Time `json:"reviewed_at,omitempty" db:"reviewed_at"`
	CreatedAt               time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt               time.Time  `json:"updated_at" db:"updated_at"`
	// Metadata from Twitch
	CreatorName     *string  `json:"creator_name,omitempty" db:"creator_name"`
	CreatorID       *string  `json:"creator_id,omitempty" db:"creator_id"`
	BroadcasterName *string  `json:"broadcaster_name,omitempty" db:"broadcaster_name"`
	BroadcasterID   *string  `json:"broadcaster_id,omitempty" db:"broadcaster_id"`
	GameID          *string  `json:"game_id,omitempty" db:"game_id"`
	GameName        *string  `json:"game_name,omitempty" db:"game_name"`
	ThumbnailURL    *string  `json:"thumbnail_url,omitempty" db:"thumbnail_url"`
	Duration        *float64 `json:"duration,omitempty" db:"duration"`
	ViewCount       int      `json:"view_count" db:"view_count"`
}

// ClipSubmissionWithUser includes user information
type ClipSubmissionWithUser struct {
	ClipSubmission
	User *User `json:"user,omitempty"`
}

// SubmissionStats represents submission statistics for a user
type SubmissionStats struct {
	UserID        uuid.UUID `json:"user_id" db:"user_id"`
	TotalCount    int       `json:"total_submissions" db:"total_submissions"`
	ApprovedCount int       `json:"approved_count" db:"approved_count"`
	RejectedCount int       `json:"rejected_count" db:"rejected_count"`
	PendingCount  int       `json:"pending_count" db:"pending_count"`
	ApprovalRate  float64   `json:"approval_rate" db:"approval_rate"`
}

// ModerationAuditLog represents an audit log entry for moderation actions
type ModerationAuditLog struct {
	ID          uuid.UUID              `json:"id" db:"id"`
	Action      string                 `json:"action" db:"action"`           // approve, reject, bulk_approve, bulk_reject
	EntityType  string                 `json:"entity_type" db:"entity_type"` // clip_submission, clip, comment, user
	EntityID    uuid.UUID              `json:"entity_id" db:"entity_id"`
	ModeratorID uuid.UUID              `json:"moderator_id" db:"moderator_id"`
	Reason      *string                `json:"reason,omitempty" db:"reason"`
	Metadata    map[string]interface{} `json:"metadata,omitempty" db:"metadata"`
	CreatedAt   time.Time              `json:"created_at" db:"created_at"`
}

// ModerationAuditLogWithUser includes moderator information
type ModerationAuditLogWithUser struct {
	ModerationAuditLog
	Moderator *User `json:"moderator,omitempty"`
}

// RejectionReason constants for common rejection reasons
const (
	RejectionReasonLowQuality         = "Low quality clip"
	RejectionReasonDuplicate          = "Duplicate content"
	RejectionReasonInappropriate      = "Inappropriate content"
	RejectionReasonOffTopic           = "Off-topic or irrelevant"
	RejectionReasonPoorTitle          = "Poor or misleading title"
	RejectionReasonTooShort           = "Clip too short"
	RejectionReasonTooLong            = "Clip too long"
	RejectionReasonSpam               = "Spam or promotional content"
	RejectionReasonViolatesGuidelines = "Violates community guidelines"
	RejectionReasonOther              = "Other (see notes)"
)

// GetRejectionReasonTemplates returns a list of common rejection reason templates
func GetRejectionReasonTemplates() []string {
	return []string{
		RejectionReasonLowQuality,
		RejectionReasonDuplicate,
		RejectionReasonInappropriate,
		RejectionReasonOffTopic,
		RejectionReasonPoorTitle,
		RejectionReasonTooShort,
		RejectionReasonTooLong,
		RejectionReasonSpam,
		RejectionReasonViolatesGuidelines,
		RejectionReasonOther,
	}
}

// UserBadge represents a badge awarded to a user
type UserBadge struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	UserID    uuid.UUID  `json:"user_id" db:"user_id"`
	BadgeID   string     `json:"badge_id" db:"badge_id"`
	AwardedAt time.Time  `json:"awarded_at" db:"awarded_at"`
	AwardedBy *uuid.UUID `json:"awarded_by,omitempty" db:"awarded_by"`
}

// KarmaHistory represents a karma change event
type KarmaHistory struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	UserID    uuid.UUID  `json:"user_id" db:"user_id"`
	Amount    int        `json:"amount" db:"amount"`
	Source    string     `json:"source" db:"source"`
	SourceID  *uuid.UUID `json:"source_id,omitempty" db:"source_id"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
}

// UserStats represents user statistics for reputation
type UserStats struct {
	UserID           uuid.UUID  `json:"user_id" db:"user_id"`
	TrustScore       int        `json:"trust_score" db:"trust_score"`
	EngagementScore  int        `json:"engagement_score" db:"engagement_score"`
	TotalComments    int        `json:"total_comments" db:"total_comments"`
	TotalVotesCast   int        `json:"total_votes_cast" db:"total_votes_cast"`
	TotalClipsSubmit int        `json:"total_clips_submitted" db:"total_clips_submitted"`
	CorrectReports   int        `json:"correct_reports" db:"correct_reports"`
	IncorrectReports int        `json:"incorrect_reports" db:"incorrect_reports"`
	DaysActive       int        `json:"days_active" db:"days_active"`
	LastActiveDate   *time.Time `json:"last_active_date,omitempty" db:"last_active_date"`
	UpdatedAt        time.Time  `json:"updated_at" db:"updated_at"`
}

// Badge represents a badge definition
type Badge struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Icon        string `json:"icon"`
	Category    string `json:"category"` // achievement, staff, supporter, special
	Requirement string `json:"requirement,omitempty"`
}

// UserReputation represents complete reputation info for a user
type UserReputation struct {
	UserID          uuid.UUID   `json:"user_id"`
	Username        string      `json:"username"`
	DisplayName     string      `json:"display_name"`
	AvatarURL       *string     `json:"avatar_url,omitempty"`
	KarmaPoints     int         `json:"karma_points"`
	Rank            string      `json:"rank"`
	TrustScore      int         `json:"trust_score"`
	EngagementScore int         `json:"engagement_score"`
	Badges          []UserBadge `json:"badges"`
	Stats           *UserStats  `json:"stats,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
}

// KarmaBreakdown represents karma sources breakdown
type KarmaBreakdown struct {
	ClipKarma    int `json:"clip_karma"`
	CommentKarma int `json:"comment_karma"`
	TotalKarma   int `json:"total_karma"`
}

// LeaderboardEntry represents a user entry in leaderboard
type LeaderboardEntry struct {
	Rank             int       `json:"rank"`
	UserID           uuid.UUID `json:"user_id" db:"id"`
	Username         string    `json:"username" db:"username"`
	DisplayName      string    `json:"display_name" db:"display_name"`
	AvatarURL        *string   `json:"avatar_url,omitempty" db:"avatar_url"`
	Score            int       `json:"score"` // Karma or engagement score
	UserRank         string    `json:"user_rank" db:"rank"`
	AccountAge       string    `json:"account_age,omitempty"`
	TotalComments    *int      `json:"total_comments,omitempty" db:"total_comments"`
	TotalVotesCast   *int      `json:"total_votes_cast,omitempty" db:"total_votes_cast"`
	TotalClipsSubmit *int      `json:"total_clips_submitted,omitempty" db:"total_clips_submitted"`
}

// Notification represents a notification for a user
type Notification struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	UserID            uuid.UUID  `json:"user_id" db:"user_id"`
	Type              string     `json:"type" db:"type"`
	Title             string     `json:"title" db:"title"`
	Message           string     `json:"message" db:"message"`
	Link              *string    `json:"link,omitempty" db:"link"`
	IsRead            bool       `json:"is_read" db:"is_read"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	ExpiresAt         *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	SourceUserID      *uuid.UUID `json:"source_user_id,omitempty" db:"source_user_id"`
	SourceContentID   *uuid.UUID `json:"source_content_id,omitempty" db:"source_content_id"`
	SourceContentType *string    `json:"source_content_type,omitempty" db:"source_content_type"`
}

// NotificationWithSource includes source user information
type NotificationWithSource struct {
	Notification
	SourceUsername    *string `json:"source_username,omitempty" db:"source_username"`
	SourceDisplayName *string `json:"source_display_name,omitempty" db:"source_display_name"`
	SourceAvatarURL   *string `json:"source_avatar_url,omitempty" db:"source_avatar_url"`
}

// NotificationPreferences represents user's notification settings
type NotificationPreferences struct {
	UserID       uuid.UUID `json:"user_id" db:"user_id"`
	InAppEnabled bool      `json:"in_app_enabled" db:"in_app_enabled"`
	EmailEnabled bool      `json:"email_enabled" db:"email_enabled"`
	EmailDigest  string    `json:"email_digest" db:"email_digest"` // immediate, daily, weekly, never

	// Account & Security
	NotifyLoginNewDevice  bool `json:"notify_login_new_device" db:"notify_login_new_device"`
	NotifyFailedLogin     bool `json:"notify_failed_login" db:"notify_failed_login"`
	NotifyPasswordChanged bool `json:"notify_password_changed" db:"notify_password_changed"`
	NotifyEmailChanged    bool `json:"notify_email_changed" db:"notify_email_changed"`

	// Content notifications
	NotifyReplies              bool `json:"notify_replies" db:"notify_replies"`
	NotifyMentions             bool `json:"notify_mentions" db:"notify_mentions"`
	NotifySubmissionApproved   bool `json:"notify_submission_approved" db:"notify_submission_approved"`
	NotifySubmissionRejected   bool `json:"notify_submission_rejected" db:"notify_submission_rejected"`
	NotifyContentTrending      bool `json:"notify_content_trending" db:"notify_content_trending"`
	NotifyContentFlagged       bool `json:"notify_content_flagged" db:"notify_content_flagged"`
	NotifyVotes                bool `json:"notify_votes" db:"notify_votes"`
	NotifyFavoritedClipComment bool `json:"notify_favorited_clip_comment" db:"notify_favorited_clip_comment"`

	// Community notifications
	NotifyModeratorMessage bool `json:"notify_moderator_message" db:"notify_moderator_message"`
	NotifyUserFollowed     bool `json:"notify_user_followed" db:"notify_user_followed"`
	NotifyCommentOnContent bool `json:"notify_comment_on_content" db:"notify_comment_on_content"`
	NotifyDiscussionReply  bool `json:"notify_discussion_reply" db:"notify_discussion_reply"`
	NotifyBadges           bool `json:"notify_badges" db:"notify_badges"`
	NotifyRankUp           bool `json:"notify_rank_up" db:"notify_rank_up"`
	NotifyModeration       bool `json:"notify_moderation" db:"notify_moderation"`

	// Creator-specific notification preferences
	NotifyClipApproved  bool `json:"notify_clip_approved" db:"notify_clip_approved"`
	NotifyClipRejected  bool `json:"notify_clip_rejected" db:"notify_clip_rejected"`
	NotifyClipComments  bool `json:"notify_clip_comments" db:"notify_clip_comments"`
	NotifyClipThreshold bool `json:"notify_clip_threshold" db:"notify_clip_threshold"`

	// Global preferences
	NotifyMarketing             bool `json:"notify_marketing" db:"notify_marketing"`
	NotifyPolicyUpdates         bool `json:"notify_policy_updates" db:"notify_policy_updates"`
	NotifyPlatformAnnouncements bool `json:"notify_platform_announcements" db:"notify_platform_announcements"`

	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// Notification types constants
const (
	NotificationTypeReply                = "reply"
	NotificationTypeMention              = "mention"
	NotificationTypeVoteMilestone        = "vote_milestone"
	NotificationTypeBadgeEarned          = "badge_earned"
	NotificationTypeRankUp               = "rank_up"
	NotificationTypeFavoritedClipComment = "favorited_clip_comment"
	NotificationTypeContentRemoved       = "content_removed"
	NotificationTypeWarning              = "warning"
	NotificationTypeBan                  = "ban"
	NotificationTypeAppealDecision       = "appeal_decision"
	NotificationTypeSubmissionApproved   = "submission_approved"
	NotificationTypeSubmissionRejected   = "submission_rejected"
	NotificationTypeNewReport            = "new_report"
	NotificationTypePendingSubmissions   = "pending_submissions"
	NotificationTypeSystemAlert          = "system_alert"
	// Dunning notification types
	NotificationTypePaymentFailed          = "payment_failed"
	NotificationTypePaymentRetry           = "payment_retry"
	NotificationTypeGracePeriodWarning     = "grace_period_warning"
	NotificationTypeSubscriptionDowngraded = "subscription_downgraded"
	// Invoice notification types
	NotificationTypeInvoiceFinalized = "invoice_finalized"
	// Export notification types
	NotificationTypeExportCompleted = "export_completed"
	// Creator clip notification types
	NotificationTypeClipComment       = "clip_comment"
	NotificationTypeClipViewThreshold = "clip_view_threshold"
	NotificationTypeClipVoteThreshold = "clip_vote_threshold"
	// Account & Security notification types
	NotificationTypeLoginNewDevice  = "login_new_device"
	NotificationTypeFailedLogin     = "failed_login"
	NotificationTypePasswordChanged = "password_changed"
	NotificationTypeEmailChanged    = "email_changed"
	// Content notification types (additional)
	NotificationTypeContentTrending = "content_trending"
	NotificationTypeContentFlagged  = "content_flagged"
	// Community notification types (additional)
	NotificationTypeModeratorMessage = "moderator_message"
	NotificationTypeUserFollowed     = "user_followed"
	NotificationTypeCommentOnContent = "comment_on_content"
	NotificationTypeDiscussionReply  = "discussion_reply"
	// Global/Marketing notification types
	NotificationTypeMarketing            = "marketing"
	NotificationTypePolicyUpdate         = "policy_update"
	NotificationTypePlatformAnnouncement = "platform_announcement"
)

// AnalyticsEvent represents a tracked event for analytics
type AnalyticsEvent struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	EventType string     `json:"event_type" db:"event_type"`
	UserID    *uuid.UUID `json:"user_id,omitempty" db:"user_id"`
	ClipID    *uuid.UUID `json:"clip_id,omitempty" db:"clip_id"`
	Metadata  *string    `json:"metadata,omitempty" db:"metadata"` // JSON string
	IPAddress *string    `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent *string    `json:"user_agent,omitempty" db:"user_agent"`
	Referrer  *string    `json:"referrer,omitempty" db:"referrer"`
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
}

// DailyAnalytics represents pre-aggregated daily metrics
type DailyAnalytics struct {
	ID         uuid.UUID `json:"id" db:"id"`
	Date       time.Time `json:"date" db:"date"`
	MetricType string    `json:"metric_type" db:"metric_type"`
	EntityType *string   `json:"entity_type,omitempty" db:"entity_type"`
	EntityID   *string   `json:"entity_id,omitempty" db:"entity_id"`
	Value      int64     `json:"value" db:"value"`
	Metadata   *string   `json:"metadata,omitempty" db:"metadata"` // JSON string
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time `json:"updated_at" db:"updated_at"`
}

// ClipAnalytics represents analytics for a specific clip
type ClipAnalytics struct {
	ClipID              uuid.UUID  `json:"clip_id" db:"clip_id"`
	TotalViews          int64      `json:"total_views" db:"total_views"`
	UniqueViewers       int64      `json:"unique_viewers" db:"unique_viewers"`
	AvgViewDuration     *float64   `json:"avg_view_duration,omitempty" db:"avg_view_duration"`
	TotalShares         int64      `json:"total_shares" db:"total_shares"`
	PeakConcurrentViews int        `json:"peak_concurrent_viewers" db:"peak_concurrent_viewers"`
	RetentionRate       *float64   `json:"retention_rate,omitempty" db:"retention_rate"`
	FirstViewedAt       *time.Time `json:"first_viewed_at,omitempty" db:"first_viewed_at"`
	LastViewedAt        *time.Time `json:"last_viewed_at,omitempty" db:"last_viewed_at"`
	UpdatedAt           time.Time  `json:"updated_at" db:"updated_at"`
}

// CreatorAnalytics represents analytics for a content creator
type CreatorAnalytics struct {
	CreatorName       string    `json:"creator_name" db:"creator_name"`
	CreatorID         *string   `json:"creator_id,omitempty" db:"creator_id"`
	TotalClips        int       `json:"total_clips" db:"total_clips"`
	TotalViews        int64     `json:"total_views" db:"total_views"`
	TotalUpvotes      int64     `json:"total_upvotes" db:"total_upvotes"`
	TotalDownvotes    int64     `json:"total_downvotes" db:"total_downvotes"`
	TotalComments     int64     `json:"total_comments" db:"total_comments"`
	TotalFavorites    int64     `json:"total_favorites" db:"total_favorites"`
	AvgEngagementRate *float64  `json:"avg_engagement_rate,omitempty" db:"avg_engagement_rate"`
	FollowerCount     int       `json:"follower_count" db:"follower_count"`
	UpdatedAt         time.Time `json:"updated_at" db:"updated_at"`
}

// UserAnalytics represents personal statistics for a user
type UserAnalytics struct {
	UserID            uuid.UUID  `json:"user_id" db:"user_id"`
	ClipsUpvoted      int        `json:"clips_upvoted" db:"clips_upvoted"`
	ClipsDownvoted    int        `json:"clips_downvoted" db:"clips_downvoted"`
	CommentsPosted    int        `json:"comments_posted" db:"comments_posted"`
	ClipsFavorited    int        `json:"clips_favorited" db:"clips_favorited"`
	SearchesPerformed int        `json:"searches_performed" db:"searches_performed"`
	DaysActive        int        `json:"days_active" db:"days_active"`
	TotalKarmaEarned  int        `json:"total_karma_earned" db:"total_karma_earned"`
	LastActiveAt      *time.Time `json:"last_active_at,omitempty" db:"last_active_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
}

// PlatformAnalytics represents global platform statistics
type PlatformAnalytics struct {
	ID                 uuid.UUID `json:"id" db:"id"`
	Date               time.Time `json:"date" db:"date"`
	TotalUsers         int64     `json:"total_users" db:"total_users"`
	ActiveUsersDaily   int       `json:"active_users_daily" db:"active_users_daily"`
	ActiveUsersWeekly  int       `json:"active_users_weekly" db:"active_users_weekly"`
	ActiveUsersMonthly int       `json:"active_users_monthly" db:"active_users_monthly"`
	NewUsersToday      int       `json:"new_users_today" db:"new_users_today"`
	TotalClips         int64     `json:"total_clips" db:"total_clips"`
	NewClipsToday      int       `json:"new_clips_today" db:"new_clips_today"`
	TotalVotes         int64     `json:"total_votes" db:"total_votes"`
	VotesToday         int       `json:"votes_today" db:"votes_today"`
	TotalComments      int64     `json:"total_comments" db:"total_comments"`
	CommentsToday      int       `json:"comments_today" db:"comments_today"`
	TotalViews         int64     `json:"total_views" db:"total_views"`
	ViewsToday         int64     `json:"views_today" db:"views_today"`
	AvgSessionDuration *float64  `json:"avg_session_duration,omitempty" db:"avg_session_duration"`
	Metadata           *string   `json:"metadata,omitempty" db:"metadata"` // JSON string
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
}

// CreatorAnalyticsOverview represents summary metrics for creator dashboard
type CreatorAnalyticsOverview struct {
	TotalClips        int     `json:"total_clips"`
	TotalViews        int64   `json:"total_views"`
	TotalUpvotes      int64   `json:"total_upvotes"`
	TotalComments     int64   `json:"total_comments"`
	AvgEngagementRate float64 `json:"avg_engagement_rate"`
	FollowerCount     int     `json:"follower_count"`
}

// CreatorTopClip represents a top-performing clip for creator analytics
type CreatorTopClip struct {
	Clip
	Views          int64   `json:"views"`
	EngagementRate float64 `json:"engagement_rate"`
}

// TrendDataPoint represents a data point in a time series
type TrendDataPoint struct {
	Date  time.Time `json:"date"`
	Value int64     `json:"value"`
}

// PlatformOverviewMetrics represents KPIs for admin dashboard
type PlatformOverviewMetrics struct {
	TotalUsers         int64   `json:"total_users"`
	ActiveUsersDaily   int     `json:"active_users_daily"`
	ActiveUsersMonthly int     `json:"active_users_monthly"`
	TotalClips         int64   `json:"total_clips"`
	ClipsAddedToday    int     `json:"clips_added_today"`
	TotalVotes         int64   `json:"total_votes"`
	TotalComments      int64   `json:"total_comments"`
	AvgSessionDuration float64 `json:"avg_session_duration"`
}

// ContentMetrics represents content-related metrics for admin dashboard
type ContentMetrics struct {
	MostPopularGames    []GameMetric    `json:"most_popular_games"`
	MostPopularCreators []CreatorMetric `json:"most_popular_creators"`
	TrendingTags        []TagMetric     `json:"trending_tags"`
	AvgClipVoteScore    float64         `json:"avg_clip_vote_score"`
}

// GameMetric represents game popularity metrics
type GameMetric struct {
	GameID    *string `json:"game_id"`
	GameName  string  `json:"game_name"`
	ClipCount int     `json:"clip_count"`
	ViewCount int64   `json:"view_count"`
}

// CreatorMetric represents creator popularity metrics
type CreatorMetric struct {
	CreatorID   *string `json:"creator_id"`
	CreatorName string  `json:"creator_name"`
	ClipCount   int     `json:"clip_count"`
	ViewCount   int64   `json:"view_count"`
	VoteScore   int64   `json:"vote_score"`
}

// TagMetric represents tag usage metrics
type TagMetric struct {
	TagID      uuid.UUID `json:"tag_id"`
	TagName    string    `json:"tag_name"`
	UsageCount int       `json:"usage_count"`
}

// UserEngagementScore represents a user's engagement score and its components
type UserEngagementScore struct {
	UserID       uuid.UUID                `json:"user_id" db:"user_id"`
	Score        int                      `json:"score" db:"score"` // 0-100
	Tier         string                   `json:"tier" db:"tier"`   // Inactive, Low, Moderate, High, Very High
	Components   UserEngagementComponents `json:"components"`
	CalculatedAt time.Time                `json:"calculated_at" db:"calculated_at"`
	UpdatedAt    time.Time                `json:"updated_at" db:"updated_at"`
}

// UserEngagementComponents represents the individual components of engagement score
type UserEngagementComponents struct {
	Posts          EngagementComponent `json:"posts"`
	Comments       EngagementComponent `json:"comments"`
	Votes          EngagementComponent `json:"votes"`
	LoginFrequency EngagementComponent `json:"login_frequency"`
	TimeSpent      EngagementComponent `json:"time_spent"`
}

// EngagementComponent represents a single component of the engagement score
type EngagementComponent struct {
	Score  int     `json:"score"`  // 0-100
	Count  int     `json:"count"`  // Raw count of activities
	Weight float64 `json:"weight"` // Weight in overall score (e.g., 0.20 for 20%)
}

// PlatformHealthMetrics represents platform-wide health indicators
type PlatformHealthMetrics struct {
	DAU              int            `json:"dau" db:"dau"`
	WAU              int            `json:"wau" db:"wau"`
	MAU              int            `json:"mau" db:"mau"`
	Stickiness       float64        `json:"stickiness" db:"stickiness"` // DAU/MAU ratio
	RetentionRates   RetentionRates `json:"retention"`
	ChurnRateMonthly float64        `json:"churn_rate_monthly" db:"churn_rate_monthly"`
	Trends           PlatformTrends `json:"trends"`
	CalculatedAt     time.Time      `json:"calculated_at" db:"calculated_at"`
}

// RetentionRates represents retention percentages for different periods
type RetentionRates struct {
	Day1  float64 `json:"day1" db:"day1_retention"`   // Day 1 retention rate
	Day7  float64 `json:"day7" db:"day7_retention"`   // Day 7 retention rate
	Day30 float64 `json:"day30" db:"day30_retention"` // Day 30 retention rate
}

// PlatformTrends represents week-over-week and month-over-month changes
type PlatformTrends struct {
	DAUChangeWoW float64 `json:"dau_change_wow" db:"dau_change_wow"` // Week-over-week % change
	MAUChangeMoM float64 `json:"mau_change_mom" db:"mau_change_mom"` // Month-over-month % change
}

// TrendingMetrics represents trending data with week-over-week changes
type TrendingMetrics struct {
	Metric             string              `json:"metric"`
	PeriodDays         int                 `json:"period_days"`
	Data               []TrendingDataPoint `json:"data"`
	WeekOverWeekChange float64             `json:"week_over_week_change"`
	Summary            TrendSummary        `json:"summary"`
}

// TrendingDataPoint represents a single data point in trending metrics with change calculation
type TrendingDataPoint struct {
	Date               time.Time `json:"date"`
	Value              int64     `json:"value"`
	ChangeFromPrevious float64   `json:"change_from_previous"`
}

// FromTrendDataPoint converts a TrendDataPoint to TrendingDataPoint
func (tdp *TrendingDataPoint) FromTrendDataPoint(t TrendDataPoint, prevValue int64) {
	tdp.Date = t.Date
	tdp.Value = t.Value
	if prevValue > 0 {
		tdp.ChangeFromPrevious = ((float64(t.Value) - float64(prevValue)) / float64(prevValue)) * 100
	}
}

// TrendSummary provides summary statistics for a trend
type TrendSummary struct {
	Min   int64  `json:"min"`
	Max   int64  `json:"max"`
	Avg   int64  `json:"avg"`
	Trend string `json:"trend"` // increasing, decreasing, stable
}

// ContentEngagementScore represents engagement metrics for a piece of content
type ContentEngagementScore struct {
	ClipID             uuid.UUID `json:"clip_id" db:"clip_id"`
	Score              int       `json:"score" db:"score"` // 0-100 composite score
	NormalizedViews    int       `json:"normalized_views" db:"normalized_views"`
	VoteRatio          float64   `json:"vote_ratio" db:"vote_ratio"`
	NormalizedComments int       `json:"normalized_comments" db:"normalized_comments"`
	NormalizedShares   int       `json:"normalized_shares" db:"normalized_shares"`
	FavoriteRate       float64   `json:"favorite_rate" db:"favorite_rate"`
	CalculatedAt       time.Time `json:"calculated_at" db:"calculated_at"`
}

// EngagementAlert represents an alert for engagement metrics
type EngagementAlert struct {
	ID             uuid.UUID              `json:"id" db:"id"`
	AlertType      string                 `json:"alert_type" db:"alert_type"` // dau_drop, churn_spike, etc.
	Severity       string                 `json:"severity" db:"severity"`     // P1, P2, P3
	Metric         string                 `json:"metric" db:"metric"`         // Which metric triggered the alert
	CurrentValue   float64                `json:"current_value" db:"current_value"`
	ThresholdValue float64                `json:"threshold_value" db:"threshold_value"`
	Message        string                 `json:"message" db:"message"`
	Metadata       map[string]interface{} `json:"metadata,omitempty" db:"metadata"`
	TriggeredAt    time.Time              `json:"triggered_at" db:"triggered_at"`
	AcknowledgedAt *time.Time             `json:"acknowledged_at,omitempty" db:"acknowledged_at"`
	AcknowledgedBy *uuid.UUID             `json:"acknowledged_by,omitempty" db:"acknowledged_by"`
	ResolvedAt     *time.Time             `json:"resolved_at,omitempty" db:"resolved_at"`
}

// CohortRetention represents retention data for a user cohort
type CohortRetention struct {
	CohortDate     time.Time `json:"cohort_date" db:"cohort_date"`         // Start date of cohort (e.g., signup month)
	CohortSize     int       `json:"cohort_size" db:"cohort_size"`         // Total users in cohort
	Day1Active     int       `json:"day1_active" db:"day1_active"`         // Users active after 1 day
	Day7Active     int       `json:"day7_active" db:"day7_active"`         // Users active after 7 days
	Day30Active    int       `json:"day30_active" db:"day30_active"`       // Users active after 30 days
	Day1Retention  float64   `json:"day1_retention" db:"day1_retention"`   // Percentage
	Day7Retention  float64   `json:"day7_retention" db:"day7_retention"`   // Percentage
	Day30Retention float64   `json:"day30_retention" db:"day30_retention"` // Percentage
	CalculatedAt   time.Time `json:"calculated_at" db:"calculated_at"`
}

// GeographyMetric represents audience distribution by country
type GeographyMetric struct {
	Country    string  `json:"country"`    // ISO country code (e.g., "US", "GB")
	ViewCount  int64   `json:"view_count"` // Number of views from this country
	Percentage float64 `json:"percentage"` // Percentage of total views
}

// DeviceMetric represents audience distribution by device type
type DeviceMetric struct {
	DeviceType string  `json:"device_type"` // "mobile", "desktop", "tablet", "unknown"
	ViewCount  int64   `json:"view_count"`  // Number of views from this device type
	Percentage float64 `json:"percentage"`  // Percentage of total views
}

// CreatorAudienceInsights represents audience insights for a creator
type CreatorAudienceInsights struct {
	TopCountries []GeographyMetric `json:"top_countries"` // Top countries by view count
	DeviceTypes  []DeviceMetric    `json:"device_types"`  // Distribution by device type
	TotalViews   int64             `json:"total_views"`   // Total views analyzed
}

// Subscription represents a user's subscription status
type Subscription struct {
	ID                   uuid.UUID  `json:"id" db:"id"`
	UserID               uuid.UUID  `json:"user_id" db:"user_id"`
	StripeCustomerID     string     `json:"stripe_customer_id" db:"stripe_customer_id"`
	StripeSubscriptionID *string    `json:"stripe_subscription_id,omitempty" db:"stripe_subscription_id"`
	StripePriceID        *string    `json:"stripe_price_id,omitempty" db:"stripe_price_id"`
	Status               string     `json:"status" db:"status"` // inactive, active, trialing, past_due, canceled, unpaid
	Tier                 string     `json:"tier" db:"tier"`     // free, pro
	CurrentPeriodStart   *time.Time `json:"current_period_start,omitempty" db:"current_period_start"`
	CurrentPeriodEnd     *time.Time `json:"current_period_end,omitempty" db:"current_period_end"`
	CancelAtPeriodEnd    bool       `json:"cancel_at_period_end" db:"cancel_at_period_end"`
	CanceledAt           *time.Time `json:"canceled_at,omitempty" db:"canceled_at"`
	TrialStart           *time.Time `json:"trial_start,omitempty" db:"trial_start"`
	TrialEnd             *time.Time `json:"trial_end,omitempty" db:"trial_end"`
	GracePeriodEnd       *time.Time `json:"grace_period_end,omitempty" db:"grace_period_end"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
}

// SubscriptionEvent represents an event in subscription lifecycle for audit logging
type SubscriptionEvent struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	SubscriptionID *uuid.UUID `json:"subscription_id,omitempty" db:"subscription_id"`
	EventType      string     `json:"event_type" db:"event_type"`
	StripeEventID  *string    `json:"stripe_event_id,omitempty" db:"stripe_event_id"`
	Payload        string     `json:"payload" db:"payload"` // JSONB stored as string
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
}

// WebhookRetryQueue represents a webhook event pending retry
type WebhookRetryQueue struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	StripeEventID string     `json:"stripe_event_id" db:"stripe_event_id"`
	EventType     string     `json:"event_type" db:"event_type"`
	Payload       string     `json:"payload" db:"payload"` // JSONB stored as string
	RetryCount    int        `json:"retry_count" db:"retry_count"`
	MaxRetries    int        `json:"max_retries" db:"max_retries"`
	NextRetryAt   *time.Time `json:"next_retry_at,omitempty" db:"next_retry_at"`
	LastError     *string    `json:"last_error,omitempty" db:"last_error"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

// WebhookDeadLetterQueue represents a permanently failed webhook event
type WebhookDeadLetterQueue struct {
	ID                uuid.UUID `json:"id" db:"id"`
	StripeEventID     string    `json:"stripe_event_id" db:"stripe_event_id"`
	EventType         string    `json:"event_type" db:"event_type"`
	Payload           string    `json:"payload" db:"payload"` // JSONB stored as string
	RetryCount        int       `json:"retry_count" db:"retry_count"`
	Error             string    `json:"error" db:"error"`
	OriginalTimestamp time.Time `json:"original_timestamp" db:"original_timestamp"`
	CreatedAt         time.Time `json:"created_at" db:"created_at"`
}

// UserWithSubscription represents a user with their subscription information
type UserWithSubscription struct {
	User
	Subscription *Subscription `json:"subscription,omitempty"`
}

// CreateCheckoutSessionRequest represents a request to create a Stripe checkout session
type CreateCheckoutSessionRequest struct {
	PriceID    string  `json:"price_id" binding:"required"`
	CouponCode *string `json:"coupon_code,omitempty"`
}

// ChangeSubscriptionPlanRequest represents a request to change subscription plan
type ChangeSubscriptionPlanRequest struct {
	PriceID string `json:"price_id" binding:"required"`
}

// CreateCheckoutSessionResponse represents the response with checkout session URL
type CreateCheckoutSessionResponse struct {
	SessionID  string `json:"session_id"`
	SessionURL string `json:"session_url"`
}

// CreatePortalSessionResponse represents the response with portal session URL
type CreatePortalSessionResponse struct {
	PortalURL string `json:"portal_url"`
}

// PaymentFailure represents a failed payment attempt for a subscription
type PaymentFailure struct {
	ID                    uuid.UUID  `json:"id" db:"id"`
	SubscriptionID        uuid.UUID  `json:"subscription_id" db:"subscription_id"`
	StripeInvoiceID       string     `json:"stripe_invoice_id" db:"stripe_invoice_id"`
	StripePaymentIntentID *string    `json:"stripe_payment_intent_id,omitempty" db:"stripe_payment_intent_id"`
	AmountDue             int64      `json:"amount_due" db:"amount_due"` // Amount in cents
	Currency              string     `json:"currency" db:"currency"`
	AttemptCount          int        `json:"attempt_count" db:"attempt_count"`
	FailureReason         *string    `json:"failure_reason,omitempty" db:"failure_reason"`
	NextRetryAt           *time.Time `json:"next_retry_at,omitempty" db:"next_retry_at"`
	Resolved              bool       `json:"resolved" db:"resolved"`
	ResolvedAt            *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
	CreatedAt             time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt             time.Time  `json:"updated_at" db:"updated_at"`
}

// DunningAttempt represents a communication attempt to a user about failed payment
type DunningAttempt struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	PaymentFailureID uuid.UUID  `json:"payment_failure_id" db:"payment_failure_id"`
	UserID           uuid.UUID  `json:"user_id" db:"user_id"`
	AttemptNumber    int        `json:"attempt_number" db:"attempt_number"`
	NotificationType string     `json:"notification_type" db:"notification_type"` // payment_failed, payment_retry, grace_period_warning, subscription_downgraded
	EmailSent        bool       `json:"email_sent" db:"email_sent"`
	EmailSentAt      *time.Time `json:"email_sent_at,omitempty" db:"email_sent_at"`
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
}

// ContactMessage represents a contact form submission
type ContactMessage struct {
	ID        uuid.UUID  `json:"id" db:"id"`
	UserID    *uuid.UUID `json:"user_id,omitempty" db:"user_id"`       // Nullable for logged-out users
	Email     string     `json:"email" db:"email"`                     // Required for contact
	Category  string     `json:"category" db:"category"`               // abuse, account, billing, feedback
	Subject   string     `json:"subject" db:"subject"`                 // Brief subject line
	Message   string     `json:"message" db:"message"`                 // Full message content
	Status    string     `json:"status" db:"status"`                   // pending, reviewed, resolved
	IPAddress *string    `json:"ip_address,omitempty" db:"ip_address"` // For abuse prevention
	UserAgent *string    `json:"user_agent,omitempty" db:"user_agent"` // For abuse prevention
	CreatedAt time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt time.Time  `json:"updated_at" db:"updated_at"`
}

// CreateContactMessageRequest represents the request to submit a contact form
type CreateContactMessageRequest struct {
	Email    string `json:"email" binding:"required,email,max=255"`
	Category string `json:"category" binding:"required,oneof=abuse account billing feedback"`
	Subject  string `json:"subject" binding:"required,min=3,max=200"`
	Message  string `json:"message" binding:"required,min=10,max=5000"`
}

// EmailNotificationLog represents an audit log for sent emails
type EmailNotificationLog struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	UserID            uuid.UUID  `json:"user_id" db:"user_id"`
	NotificationID    *uuid.UUID `json:"notification_id,omitempty" db:"notification_id"`
	NotificationType  string     `json:"notification_type" db:"notification_type"`
	RecipientEmail    string     `json:"recipient_email" db:"recipient_email"`
	Subject           string     `json:"subject" db:"subject"`
	Status            string     `json:"status" db:"status"` // pending, sent, failed, bounced
	ProviderMessageID *string    `json:"provider_message_id,omitempty" db:"provider_message_id"`
	ErrorMessage      *string    `json:"error_message,omitempty" db:"error_message"`
	SentAt            *time.Time `json:"sent_at,omitempty" db:"sent_at"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
}

// EmailUnsubscribeToken represents an unsubscribe token
type EmailUnsubscribeToken struct {
	ID               uuid.UUID  `json:"id" db:"id"`
	UserID           uuid.UUID  `json:"user_id" db:"user_id"`
	Token            string     `json:"token" db:"token"`
	NotificationType *string    `json:"notification_type,omitempty" db:"notification_type"` // null means all
	CreatedAt        time.Time  `json:"created_at" db:"created_at"`
	ExpiresAt        time.Time  `json:"expires_at" db:"expires_at"`
	UsedAt           *time.Time `json:"used_at,omitempty" db:"used_at"`
}

// EmailRateLimit represents rate limiting for email notifications
type EmailRateLimit struct {
	ID          uuid.UUID `json:"id" db:"id"`
	UserID      uuid.UUID `json:"user_id" db:"user_id"`
	WindowStart time.Time `json:"window_start" db:"window_start"`
	EmailCount  int       `json:"email_count" db:"email_count"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// Email notification log status constants
const (
	EmailStatusPending = "pending"
	EmailStatusSent    = "sent"
	EmailStatusFailed  = "failed"
	EmailStatusBounced = "bounced"
)

// RegisterDeviceTokenRequest represents the request to register a device token
type RegisterDeviceTokenRequest struct {
	DeviceToken    string `json:"device_token" binding:"required"`
	DevicePlatform string `json:"device_platform" binding:"required,oneof=ios android web"`
}

// UnregisterDeviceTokenRequest represents the request to unregister a device token
type UnregisterDeviceTokenRequest struct {
	DeviceToken string `json:"device_token" binding:"required"`
}

// RevenueMetrics represents subscription revenue metrics for admin dashboard
type RevenueMetrics struct {
	MRR                  float64                  `json:"mrr"`                    // Monthly Recurring Revenue in cents
	Churn                float64                  `json:"churn"`                  // Churn rate as percentage
	ARPU                 float64                  `json:"arpu"`                   // Average Revenue Per User in cents
	ActiveSubscribers    int                      `json:"active_subscribers"`     // Total active subscribers
	TotalRevenue         float64                  `json:"total_revenue"`          // Total revenue to date in cents
	PlanDistribution     []PlanDistributionMetric `json:"plan_distribution"`      // Distribution by plan
	CohortRetention      []CohortRetentionMetric  `json:"cohort_retention"`       // Cohort retention data
	ChurnedSubscribers   int                      `json:"churned_subscribers"`    // Subscribers churned this month
	NewSubscribers       int                      `json:"new_subscribers"`        // New subscribers this month
	TrialConversionRate  float64                  `json:"trial_conversion_rate"`  // Trial to paid conversion rate
	GracePeriodRecovery  float64                  `json:"grace_period_recovery"`  // Grace period recovery rate
	AverageLifetimeValue float64                  `json:"average_lifetime_value"` // Average customer LTV in cents
	RevenueByMonth       []RevenueByMonthMetric   `json:"revenue_by_month"`       // Revenue trend by month
	SubscriberGrowth     []SubscriberGrowthMetric `json:"subscriber_growth"`      // Subscriber growth trend
	UpdatedAt            time.Time                `json:"updated_at"`
}

// PlanDistributionMetric represents distribution of subscribers by plan
type PlanDistributionMetric struct {
	PlanID       string  `json:"plan_id"`
	PlanName     string  `json:"plan_name"`
	Subscribers  int     `json:"subscribers"`
	Percentage   float64 `json:"percentage"`
	MonthlyValue float64 `json:"monthly_value"` // in cents
}

// CohortRetentionMetric represents retention data for a specific cohort
type CohortRetentionMetric struct {
	CohortMonth    string    `json:"cohort_month"`    // YYYY-MM format
	InitialSize    int       `json:"initial_size"`    // Number of subscribers in cohort
	RetentionRates []float64 `json:"retention_rates"` // Retention % for each month after signup
}

// RevenueByMonthMetric represents revenue data for a specific month
type RevenueByMonthMetric struct {
	Month   string  `json:"month"`   // YYYY-MM format
	Revenue float64 `json:"revenue"` // Revenue in cents
	MRR     float64 `json:"mrr"`     // MRR at end of month in cents
}

// SubscriberGrowthMetric represents subscriber growth data for a specific month
type SubscriberGrowthMetric struct {
	Month     string `json:"month"`      // YYYY-MM format
	Total     int    `json:"total"`      // Total subscribers at end of month
	New       int    `json:"new"`        // New subscribers that month
	Churned   int    `json:"churned"`    // Churned subscribers that month
	NetChange int    `json:"net_change"` // Net subscriber change
}

// ExportRequest represents a creator's data export request
type ExportRequest struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	UserID        uuid.UUID  `json:"user_id" db:"user_id"`
	CreatorName   string     `json:"creator_name" db:"creator_name"`
	Format        string     `json:"format" db:"format"` // csv, json
	Status        string     `json:"status" db:"status"` // pending, processing, completed, failed, expired
	FilePath      *string    `json:"file_path,omitempty" db:"file_path"`
	FileSizeBytes *int64     `json:"file_size_bytes,omitempty" db:"file_size_bytes"`
	ErrorMessage  *string    `json:"error_message,omitempty" db:"error_message"`
	ExpiresAt     *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	EmailSent     bool       `json:"email_sent" db:"email_sent"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
	CompletedAt   *time.Time `json:"completed_at,omitempty" db:"completed_at"`
}

// Export request status constants
const (
	ExportStatusPending    = "pending"
	ExportStatusProcessing = "processing"
	ExportStatusCompleted  = "completed"
	ExportStatusFailed     = "failed"
	ExportStatusExpired    = "expired"
)

// Export format constants
const (
	ExportFormatCSV  = "csv"
	ExportFormatJSON = "json"
)

// CreateExportRequest represents the request to create a data export
type CreateExportRequest struct {
	Format string `json:"format" binding:"required,oneof=csv json"`
}

// ExportRequestResponse represents the response for an export request
type ExportRequestResponse struct {
	ExportRequest
	DownloadURL *string `json:"download_url,omitempty"`
}

// Ad represents an advertisement campaign
type Ad struct {
	ID                uuid.UUID              `json:"id" db:"id"`
	Name              string                 `json:"name" db:"name"`
	AdvertiserName    string                 `json:"advertiser_name" db:"advertiser_name"`
	AdType            string                 `json:"ad_type" db:"ad_type"` // banner, video, native
	ContentURL        string                 `json:"content_url" db:"content_url"`
	ClickURL          *string                `json:"click_url,omitempty" db:"click_url"`
	AltText           *string                `json:"alt_text,omitempty" db:"alt_text"`
	Width             *int                   `json:"width,omitempty" db:"width"`
	Height            *int                   `json:"height,omitempty" db:"height"`
	Priority          int                    `json:"priority" db:"priority"`
	Weight            int                    `json:"weight" db:"weight"`
	DailyBudgetCents  *int64                 `json:"daily_budget_cents,omitempty" db:"daily_budget_cents"`
	TotalBudgetCents  *int64                 `json:"total_budget_cents,omitempty" db:"total_budget_cents"`
	SpentTodayCents   int64                  `json:"spent_today_cents" db:"spent_today_cents"`
	SpentTotalCents   int64                  `json:"spent_total_cents" db:"spent_total_cents"`
	CPMCents          int                    `json:"cpm_cents" db:"cpm_cents"` // Cost per 1000 impressions
	IsActive          bool                   `json:"is_active" db:"is_active"`
	StartDate         *time.Time             `json:"start_date,omitempty" db:"start_date"`
	EndDate           *time.Time             `json:"end_date,omitempty" db:"end_date"`
	TargetingCriteria map[string]interface{} `json:"targeting_criteria,omitempty" db:"targeting_criteria"`
	// New fields for slots and experiments
	SlotID            *string    `json:"slot_id,omitempty" db:"slot_id"`
	ExperimentID      *uuid.UUID `json:"experiment_id,omitempty" db:"experiment_id"`
	ExperimentVariant *string    `json:"experiment_variant,omitempty" db:"experiment_variant"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
}

// AdImpression represents a tracked ad impression
type AdImpression struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	AdID              uuid.UUID  `json:"ad_id" db:"ad_id"`
	UserID            *uuid.UUID `json:"user_id,omitempty" db:"user_id"`
	SessionID         *string    `json:"session_id,omitempty" db:"session_id"`
	Platform          string     `json:"platform" db:"platform"` // web, ios, android
	IPAddress         *string    `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent         *string    `json:"user_agent,omitempty" db:"user_agent"`
	PageURL           *string    `json:"page_url,omitempty" db:"page_url"`
	ViewabilityTimeMs int        `json:"viewability_time_ms" db:"viewability_time_ms"`
	IsViewable        bool       `json:"is_viewable" db:"is_viewable"`
	IsClicked         bool       `json:"is_clicked" db:"is_clicked"`
	ClickedAt         *time.Time `json:"clicked_at,omitempty" db:"clicked_at"`
	CostCents         int        `json:"cost_cents" db:"cost_cents"`
	// New fields for enhanced tracking
	SlotID            *string    `json:"slot_id,omitempty" db:"slot_id"`
	Country           *string    `json:"country,omitempty" db:"country"`
	DeviceType        *string    `json:"device_type,omitempty" db:"device_type"` // desktop, mobile, tablet
	ExperimentID      *uuid.UUID `json:"experiment_id,omitempty" db:"experiment_id"`
	ExperimentVariant *string    `json:"experiment_variant,omitempty" db:"experiment_variant"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
}

// AdFrequencyCap represents per-user/session impression tracking for frequency capping
type AdFrequencyCap struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	AdID            uuid.UUID  `json:"ad_id" db:"ad_id"`
	UserID          *uuid.UUID `json:"user_id,omitempty" db:"user_id"`
	SessionID       *string    `json:"session_id,omitempty" db:"session_id"`
	ImpressionCount int        `json:"impression_count" db:"impression_count"`
	WindowStart     time.Time  `json:"window_start" db:"window_start"`
	WindowType      string     `json:"window_type" db:"window_type"` // hourly, daily, weekly, lifetime
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
}

// AdFrequencyLimit represents configurable frequency limits per ad
type AdFrequencyLimit struct {
	ID             uuid.UUID `json:"id" db:"id"`
	AdID           uuid.UUID `json:"ad_id" db:"ad_id"`
	WindowType     string    `json:"window_type" db:"window_type"` // hourly, daily, weekly, lifetime
	MaxImpressions int       `json:"max_impressions" db:"max_impressions"`
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// AdSelectionRequest represents a request to select an ad
type AdSelectionRequest struct {
	Platform  string  `json:"platform" form:"platform" binding:"required,oneof=web ios android"`
	PageURL   *string `json:"page_url,omitempty" form:"page_url"`
	AdType    *string `json:"ad_type,omitempty" form:"ad_type"` // Filter by ad type
	Width     *int    `json:"width,omitempty" form:"width"`     // Filter by dimensions
	Height    *int    `json:"height,omitempty" form:"height"`
	SessionID *string `json:"session_id,omitempty" form:"session_id"` // For anonymous users
	GameID    *string `json:"game_id,omitempty" form:"game_id"`       // For targeting
	Language  *string `json:"language,omitempty" form:"language"`
	// Enhanced targeting fields
	SlotID     *string  `json:"slot_id,omitempty" form:"slot_id"`         // Ad placement slot identifier
	Country    *string  `json:"country,omitempty" form:"country"`         // ISO 3166-1 alpha-2 country code
	DeviceType *string  `json:"device_type,omitempty" form:"device_type"` // desktop, mobile, tablet
	Interests  []string `json:"interests,omitempty" form:"interests"`     // User interest categories
	// Privacy/consent fields
	Personalized *bool `json:"personalized,omitempty" form:"personalized"` // Whether user consented to personalized ads
}

// AdSelectionResponse represents a selected ad for display
type AdSelectionResponse struct {
	Ad           *Ad    `json:"ad,omitempty"`
	ImpressionID string `json:"impression_id,omitempty"` // UUID for tracking
	TrackingURL  string `json:"tracking_url,omitempty"`  // URL to call for viewability
}

// AdTrackingRequest represents a tracking update for an impression
type AdTrackingRequest struct {
	ImpressionID      string `json:"impression_id" binding:"required"`
	ViewabilityTimeMs int    `json:"viewability_time_ms"`
	IsViewable        bool   `json:"is_viewable"`
	IsClicked         bool   `json:"is_clicked"`
}

// AdFrequencyCapWindow represents the time window types for frequency capping
const (
	FrequencyWindowHourly   = "hourly"
	FrequencyWindowDaily    = "daily"
	FrequencyWindowWeekly   = "weekly"
	FrequencyWindowLifetime = "lifetime"
)

// ViewabilityThresholdMs is the minimum time (in ms) an ad must be viewable to count
// IAB standard: 50% of pixels visible for 1000ms (1 second)
const ViewabilityThresholdMs = 1000

// AdExperiment represents an A/B experiment for comparing ad variants
type AdExperiment struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	Name           string     `json:"name" db:"name"`
	Description    *string    `json:"description,omitempty" db:"description"`
	Status         string     `json:"status" db:"status"` // draft, running, paused, completed
	StartDate      *time.Time `json:"start_date,omitempty" db:"start_date"`
	EndDate        *time.Time `json:"end_date,omitempty" db:"end_date"`
	TrafficPercent int        `json:"traffic_percent" db:"traffic_percent"` // 0-100
	WinningVariant *string    `json:"winning_variant,omitempty" db:"winning_variant"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

// AdTargetingRule represents a structured targeting rule for an ad
type AdTargetingRule struct {
	ID        uuid.UUID `json:"id" db:"id"`
	AdID      uuid.UUID `json:"ad_id" db:"ad_id"`
	RuleType  string    `json:"rule_type" db:"rule_type"` // country, device, interest, platform, language, game
	Operator  string    `json:"operator" db:"operator"`   // include, exclude
	Values    []string  `json:"values" db:"values"`       // Array of values to match
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// TargetingRuleType constants
const (
	TargetingRuleTypeCountry  = "country"
	TargetingRuleTypeDevice   = "device"
	TargetingRuleTypeInterest = "interest"
	TargetingRuleTypePlatform = "platform"
	TargetingRuleTypeLanguage = "language"
	TargetingRuleTypeGame     = "game"
)

// TargetingRuleOperator constants
const (
	TargetingOperatorInclude = "include"
	TargetingOperatorExclude = "exclude"
)

// ExperimentStatus constants
const (
	ExperimentStatusDraft     = "draft"
	ExperimentStatusRunning   = "running"
	ExperimentStatusPaused    = "paused"
	ExperimentStatusCompleted = "completed"
)

// AdCampaignAnalytics represents aggregated campaign analytics by date and slot
type AdCampaignAnalytics struct {
	ID                  uuid.UUID `json:"id" db:"id"`
	AdID                uuid.UUID `json:"ad_id" db:"ad_id"`
	Date                time.Time `json:"date" db:"date"`
	SlotID              *string   `json:"slot_id,omitempty" db:"slot_id"`
	Impressions         int       `json:"impressions" db:"impressions"`
	ViewableImpressions int       `json:"viewable_impressions" db:"viewable_impressions"`
	Clicks              int       `json:"clicks" db:"clicks"`
	SpendCents          int64     `json:"spend_cents" db:"spend_cents"`
	UniqueUsers         int       `json:"unique_users" db:"unique_users"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
	UpdatedAt           time.Time `json:"updated_at" db:"updated_at"`
}

// AdExperimentAnalytics represents aggregated experiment analytics by variant and date
type AdExperimentAnalytics struct {
	ID                  uuid.UUID `json:"id" db:"id"`
	ExperimentID        uuid.UUID `json:"experiment_id" db:"experiment_id"`
	Variant             string    `json:"variant" db:"variant"`
	Date                time.Time `json:"date" db:"date"`
	Impressions         int       `json:"impressions" db:"impressions"`
	ViewableImpressions int       `json:"viewable_impressions" db:"viewable_impressions"`
	Clicks              int       `json:"clicks" db:"clicks"`
	Conversions         int       `json:"conversions" db:"conversions"`
	CreatedAt           time.Time `json:"created_at" db:"created_at"`
}

// AdCTRReport represents a CTR report for campaigns/slots
type AdCTRReport struct {
	AdID                uuid.UUID `json:"ad_id" db:"ad_id"`
	AdName              string    `json:"ad_name" db:"ad_name"`
	SlotID              *string   `json:"slot_id,omitempty" db:"slot_id"`
	Impressions         int64     `json:"impressions" db:"impressions"`
	ViewableImpressions int64     `json:"viewable_impressions" db:"viewable_impressions"`
	Clicks              int64     `json:"clicks" db:"clicks"`
	CTR                 float64   `json:"ctr"`              // Click-through rate (clicks / viewable impressions)
	ViewabilityRate     float64   `json:"viewability_rate"` // viewable impressions / total impressions
	SpendCents          int64     `json:"spend_cents" db:"spend_cents"`
}

// AdSlotReport represents CTR metrics grouped by slot
type AdSlotReport struct {
	SlotID              string  `json:"slot_id" db:"slot_id"`
	Impressions         int64   `json:"impressions" db:"impressions"`
	ViewableImpressions int64   `json:"viewable_impressions" db:"viewable_impressions"`
	Clicks              int64   `json:"clicks" db:"clicks"`
	CTR                 float64 `json:"ctr"`
	ViewabilityRate     float64 `json:"viewability_rate"`
	SpendCents          int64   `json:"spend_cents" db:"spend_cents"`
	UniqueAds           int     `json:"unique_ads" db:"unique_ads"`
}

// AdExperimentReport represents experiment results with variant comparison
type AdExperimentReport struct {
	ExperimentID   uuid.UUID                   `json:"experiment_id" db:"experiment_id"`
	ExperimentName string                      `json:"experiment_name" db:"experiment_name"`
	Status         string                      `json:"status" db:"status"`
	Variants       []AdExperimentVariantReport `json:"variants"`
}

// AdExperimentVariantReport represents metrics for a single experiment variant
type AdExperimentVariantReport struct {
	Variant             string  `json:"variant" db:"variant"`
	Impressions         int64   `json:"impressions" db:"impressions"`
	ViewableImpressions int64   `json:"viewable_impressions" db:"viewable_impressions"`
	Clicks              int64   `json:"clicks" db:"clicks"`
	CTR                 float64 `json:"ctr"`
	Conversions         int64   `json:"conversions" db:"conversions"`
	ConversionRate      float64 `json:"conversion_rate"` // conversions / clicks
}

// AdSelectionContext represents context information for ad targeting
type AdSelectionContext struct {
	Country    *string  `json:"country,omitempty" form:"country"`
	DeviceType *string  `json:"device_type,omitempty" form:"device_type"` // desktop, mobile, tablet
	Interests  []string `json:"interests,omitempty" form:"interests"`
	SlotID     *string  `json:"slot_id,omitempty" form:"slot_id"`
}

// UpdateClipMetadataRequest represents a request to update clip metadata (title, tags)
type UpdateClipMetadataRequest struct {
	Title *string  `json:"title,omitempty" binding:"omitempty,min=1,max=255"`
	Tags  []string `json:"tags,omitempty" binding:"omitempty,max=10,dive,min=1,max=50"`
}

// UpdateClipVisibilityRequest represents a request to update clip visibility
type UpdateClipVisibilityRequest struct {
	IsHidden bool `json:"is_hidden"`
}

// WebhookSubscription represents a webhook subscription for third-party integrations
type WebhookSubscription struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	UserID         uuid.UUID  `json:"user_id" db:"user_id"`
	URL            string     `json:"url" db:"url"`
	Secret         string     `json:"-" db:"secret"` // Never expose in JSON responses
	Events         []string   `json:"events" db:"events"`
	IsActive       bool       `json:"is_active" db:"is_active"`
	Description    *string    `json:"description,omitempty" db:"description"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
	LastDeliveryAt *time.Time `json:"last_delivery_at,omitempty" db:"last_delivery_at"`
}

// WebhookDelivery represents a webhook delivery attempt
type WebhookDelivery struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	SubscriptionID uuid.UUID  `json:"subscription_id" db:"subscription_id"`
	EventType      string     `json:"event_type" db:"event_type"`
	EventID        uuid.UUID  `json:"event_id" db:"event_id"`
	Payload        string     `json:"payload" db:"payload"`
	Status         string     `json:"status" db:"status"`
	HTTPStatusCode *int       `json:"http_status_code,omitempty" db:"http_status_code"`
	ResponseBody   *string    `json:"response_body,omitempty" db:"response_body"`
	ErrorMessage   *string    `json:"error_message,omitempty" db:"error_message"`
	AttemptCount   int        `json:"attempt_count" db:"attempt_count"`
	MaxAttempts    int        `json:"max_attempts" db:"max_attempts"`
	NextAttemptAt  *time.Time `json:"next_attempt_at,omitempty" db:"next_attempt_at"`
	DeliveredAt    *time.Time `json:"delivered_at,omitempty" db:"delivered_at"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

// WebhookEventPayload represents the payload sent to webhook endpoints
type WebhookEventPayload struct {
	Event     string                 `json:"event"`
	Timestamp time.Time              `json:"timestamp"`
	Data      map[string]interface{} `json:"data"`
}

// CreateWebhookSubscriptionRequest represents a request to create a webhook subscription
type CreateWebhookSubscriptionRequest struct {
	URL         string   `json:"url" binding:"required,url,max=2048"`
	Events      []string `json:"events" binding:"required,min=1,max=10"`
	Description *string  `json:"description,omitempty" binding:"omitempty,max=500"`
}

// UpdateWebhookSubscriptionRequest represents a request to update a webhook subscription
type UpdateWebhookSubscriptionRequest struct {
	URL         *string  `json:"url,omitempty" binding:"omitempty,url,max=2048"`
	Events      []string `json:"events,omitempty" binding:"omitempty,min=1,max=10"`
	IsActive    *bool    `json:"is_active,omitempty"`
	Description *string  `json:"description,omitempty" binding:"omitempty,max=500"`
}

// WebhookEvent constants for supported webhook events
const (
	WebhookEventClipSubmitted = "clip.submitted"
	WebhookEventClipApproved  = "clip.approved"
	WebhookEventClipRejected  = "clip.rejected"
)

// GetSupportedWebhookEvents returns the list of supported webhook events
func GetSupportedWebhookEvents() []string {
	return []string{
		WebhookEventClipSubmitted,
		WebhookEventClipApproved,
		WebhookEventClipRejected,
	}
}

// TrustScoreHistory represents a trust score change audit log entry
type TrustScoreHistory struct {
	ID              uuid.UUID              `json:"id" db:"id"`
	UserID          uuid.UUID              `json:"user_id" db:"user_id"`
	OldScore        int                    `json:"old_score" db:"old_score"`
	NewScore        int                    `json:"new_score" db:"new_score"`
	ChangeReason    string                 `json:"change_reason" db:"change_reason"`
	ComponentScores map[string]interface{} `json:"component_scores,omitempty" db:"component_scores"`
	ChangedBy       *uuid.UUID             `json:"changed_by,omitempty" db:"changed_by"`
	Notes           *string                `json:"notes,omitempty" db:"notes"`
	CreatedAt       time.Time              `json:"created_at" db:"created_at"`
}

// TrustScoreHistoryWithUser includes user and admin information
type TrustScoreHistoryWithUser struct {
	TrustScoreHistory
	User      *User `json:"user,omitempty"`
	ChangedBy *User `json:"changed_by_user,omitempty"`
}

// TrustScoreBreakdown represents the detailed breakdown of a trust score calculation
type TrustScoreBreakdown struct {
	TotalScore       int     `json:"total_score"`
	AccountAgeScore  int     `json:"account_age_score"`
	KarmaScore       int     `json:"karma_score"`
	ReportAccuracy   int     `json:"report_accuracy_score"`
	ActivityScore    int     `json:"activity_score"`
	MaxScore         int     `json:"max_score"`
	AccountAgeDays   int     `json:"account_age_days"`
	KarmaPoints      int     `json:"karma_points"`
	CorrectReports   int     `json:"correct_reports"`
	IncorrectReports int     `json:"incorrect_reports"`
	TotalComments    int     `json:"total_comments"`
	TotalVotes       int     `json:"total_votes"`
	DaysActive       int     `json:"days_active"`
	IsBanned         bool    `json:"is_banned"`
	BanPenalty       float64 `json:"ban_penalty,omitempty"`
}

// TrustScoreChangeReason constants for common change reasons
const (
	TrustScoreReasonScheduledRecalc    = "scheduled_recalc"
	TrustScoreReasonSubmissionApproved = "submission_approved"
	TrustScoreReasonSubmissionRejected = "submission_rejected"
	TrustScoreReasonReportActioned     = "report_actioned"
	TrustScoreReasonManualAdjustment   = "manual_adjustment"
	TrustScoreReasonNewActivity        = "new_activity"
	TrustScoreReasonBanned             = "banned"
	TrustScoreReasonUnbanned           = "unbanned"
)

// ManualTrustScoreAdjustment represents a request to manually adjust a user's trust score
type ManualTrustScoreAdjustment struct {
	NewScore int     `json:"new_score" binding:"required,min=0,max=100"`
	Reason   string  `json:"reason" binding:"required,min=3,max=100"`
	Notes    *string `json:"notes,omitempty" binding:"omitempty,max=1000"`
}

// BroadcasterFollow represents a user following a broadcaster
type BroadcasterFollow struct {
	ID              uuid.UUID `json:"id" db:"id"`
	UserID          uuid.UUID `json:"user_id" db:"user_id"`
	BroadcasterID   string    `json:"broadcaster_id" db:"broadcaster_id"`
	BroadcasterName string    `json:"broadcaster_name" db:"broadcaster_name"`
	CreatedAt       time.Time `json:"created_at" db:"created_at"`
}

// BroadcasterProfile represents a broadcaster's profile information
type BroadcasterProfile struct {
	BroadcasterID   string    `json:"broadcaster_id"`
	BroadcasterName string    `json:"broadcaster_name"`
	DisplayName     string    `json:"display_name"`
	AvatarURL       *string   `json:"avatar_url,omitempty"`
	Bio             *string   `json:"bio,omitempty"`
	TwitchURL       string    `json:"twitch_url"`
	TotalClips      int       `json:"total_clips"`
	FollowerCount   int       `json:"follower_count"`
	TotalViews      int64     `json:"total_views"`
	AvgVoteScore    float64   `json:"avg_vote_score"`
	IsFollowing     bool      `json:"is_following"` // Whether the current user is following
	UpdatedAt       time.Time `json:"updated_at"`
}

// EmailLog represents a comprehensive email event log from SendGrid webhooks
type EmailLog struct {
	ID                 uuid.UUID  `json:"id" db:"id"`
	UserID             *uuid.UUID `json:"user_id,omitempty" db:"user_id"`
	Template           *string    `json:"template,omitempty" db:"template"`
	Recipient          string     `json:"recipient" db:"recipient"`
	Status             string     `json:"status" db:"status"`
	EventType          string     `json:"event_type" db:"event_type"`
	SendGridMessageID  *string    `json:"sendgrid_message_id,omitempty" db:"sendgrid_message_id"`
	SendGridEventID    *string    `json:"sendgrid_event_id,omitempty" db:"sendgrid_event_id"`
	BounceType         *string    `json:"bounce_type,omitempty" db:"bounce_type"`
	BounceReason       *string    `json:"bounce_reason,omitempty" db:"bounce_reason"`
	SpamReportReason   *string    `json:"spam_report_reason,omitempty" db:"spam_report_reason"`
	LinkURL            *string    `json:"link_url,omitempty" db:"link_url"`
	IPAddress          *string    `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent          *string    `json:"user_agent,omitempty" db:"user_agent"`
	Metadata           *string    `json:"metadata,omitempty" db:"metadata"` // JSONB stored as string
	SentAt             *time.Time `json:"sent_at,omitempty" db:"sent_at"`
	DeliveredAt        *time.Time `json:"delivered_at,omitempty" db:"delivered_at"`
	OpenedAt           *time.Time `json:"opened_at,omitempty" db:"opened_at"`
	ClickedAt          *time.Time `json:"clicked_at,omitempty" db:"clicked_at"`
	BouncedAt          *time.Time `json:"bounced_at,omitempty" db:"bounced_at"`
	SpamReportedAt     *time.Time `json:"spam_reported_at,omitempty" db:"spam_reported_at"`
	UnsubscribedAt     *time.Time `json:"unsubscribed_at,omitempty" db:"unsubscribed_at"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at" db:"updated_at"`
}

// EmailMetricsSummary represents aggregated email metrics
type EmailMetricsSummary struct {
	ID                uuid.UUID  `json:"id" db:"id"`
	PeriodStart       time.Time  `json:"period_start" db:"period_start"`
	PeriodEnd         time.Time  `json:"period_end" db:"period_end"`
	Granularity       string     `json:"granularity" db:"granularity"` // hourly, daily
	Template          *string    `json:"template,omitempty" db:"template"`
	TotalSent         int        `json:"total_sent" db:"total_sent"`
	TotalDelivered    int        `json:"total_delivered" db:"total_delivered"`
	TotalBounced      int        `json:"total_bounced" db:"total_bounced"`
	TotalHardBounced  int        `json:"total_hard_bounced" db:"total_hard_bounced"`
	TotalSoftBounced  int        `json:"total_soft_bounced" db:"total_soft_bounced"`
	TotalDropped      int        `json:"total_dropped" db:"total_dropped"`
	TotalOpened       int        `json:"total_opened" db:"total_opened"`
	TotalClicked      int        `json:"total_clicked" db:"total_clicked"`
	TotalSpamReports  int        `json:"total_spam_reports" db:"total_spam_reports"`
	TotalUnsubscribes int        `json:"total_unsubscribes" db:"total_unsubscribes"`
	UniqueOpened      int        `json:"unique_opened" db:"unique_opened"`
	UniqueClicked     int        `json:"unique_clicked" db:"unique_clicked"`
	BounceRate        *float64   `json:"bounce_rate,omitempty" db:"bounce_rate"`
	OpenRate          *float64   `json:"open_rate,omitempty" db:"open_rate"`
	ClickRate         *float64   `json:"click_rate,omitempty" db:"click_rate"`
	SpamRate          *float64   `json:"spam_rate,omitempty" db:"spam_rate"`
	CreatedAt         time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at" db:"updated_at"`
}

// EmailAlert represents an alert triggered by email metrics
type EmailAlert struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	AlertType       string     `json:"alert_type" db:"alert_type"` // high_bounce_rate, high_complaint_rate, etc.
	Severity        string     `json:"severity" db:"severity"`     // warning, critical
	MetricName      string     `json:"metric_name" db:"metric_name"`
	CurrentValue    *float64   `json:"current_value,omitempty" db:"current_value"`
	ThresholdValue  *float64   `json:"threshold_value,omitempty" db:"threshold_value"`
	PeriodStart     time.Time  `json:"period_start" db:"period_start"`
	PeriodEnd       time.Time  `json:"period_end" db:"period_end"`
	Message         string     `json:"message" db:"message"`
	Metadata        *string    `json:"metadata,omitempty" db:"metadata"` // JSONB stored as string
	TriggeredAt     time.Time  `json:"triggered_at" db:"triggered_at"`
	AcknowledgedAt  *time.Time `json:"acknowledged_at,omitempty" db:"acknowledged_at"`
	AcknowledgedBy  *uuid.UUID `json:"acknowledged_by,omitempty" db:"acknowledged_by"`
	ResolvedAt      *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
}

// Email log status constants
const (
	EmailLogStatusSent         = "sent"
	EmailLogStatusDelivered    = "delivered"
	EmailLogStatusBounce       = "bounce"
	EmailLogStatusDropped      = "dropped"
	EmailLogStatusOpen         = "open"
	EmailLogStatusClick        = "click"
	EmailLogStatusSpamReport   = "spam_report"
	EmailLogStatusUnsubscribe  = "unsubscribe"
	EmailLogStatusDeferred     = "deferred"
	EmailLogStatusProcessed    = "processed"
)

// Email alert types
const (
	EmailAlertTypeHighBounceRate      = "high_bounce_rate"
	EmailAlertTypeHighComplaintRate   = "high_complaint_rate"
	EmailAlertTypeSendErrors          = "send_errors"
	EmailAlertTypeOpenRateDrop        = "open_rate_drop"
	EmailAlertTypeUnsubscribeSpike    = "unsubscribe_spike"
)

// Email alert severities
const (
	EmailAlertSeverityWarning  = "warning"
	EmailAlertSeverityCritical = "critical"
)

// SendGridWebhookEvent represents an incoming webhook event from SendGrid
type SendGridWebhookEvent struct {
	Email           string                 `json:"email"`
	Timestamp       int64                  `json:"timestamp"`
	Event           string                 `json:"event"`
	SgMessageID     string                 `json:"sg_message_id"`
	SgEventID       string                 `json:"sg_event_id"`
	Category        []string               `json:"category,omitempty"`
	Type            string                 `json:"type,omitempty"`      // For bounce events: bounce, blocked, etc.
	Reason          string                 `json:"reason,omitempty"`    // Bounce/drop reason
	Status          string                 `json:"status,omitempty"`    // Bounce status code
	URL             string                 `json:"url,omitempty"`       // Clicked URL
	IP              string                 `json:"ip,omitempty"`        // IP address
	UserAgent       string                 `json:"useragent,omitempty"` // User agent
	Response        string                 `json:"response,omitempty"`  // SMTP response
	Attempt         string                 `json:"attempt,omitempty"`   // Deferred attempt number
	CustomArgs      map[string]interface{} `json:"custom_args,omitempty"`
	ASMGroupID      int                    `json:"asm_group_id,omitempty"`      // Unsubscribe group ID
	MarketingCampaignID string             `json:"marketing_campaign_id,omitempty"`
	MarketingCampaignName string           `json:"marketing_campaign_name,omitempty"`
}

// Feed represents a user-created feed
type Feed struct {
	ID            uuid.UUID  `json:"id" db:"id"`
	UserID        uuid.UUID  `json:"user_id" db:"user_id"`
	Name          string     `json:"name" db:"name"`
	Description   *string    `json:"description,omitempty" db:"description"`
	Icon          *string    `json:"icon,omitempty" db:"icon"`
	IsPublic      bool       `json:"is_public" db:"is_public"`
	FollowerCount int        `json:"follower_count" db:"follower_count"`
	CreatedAt     time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at" db:"updated_at"`
}

// FeedWithOwner includes owner information
type FeedWithOwner struct {
	Feed
	Owner *User `json:"owner,omitempty"`
}

// FeedItem represents a clip in a feed
type FeedItem struct {
	ID       uuid.UUID `json:"id" db:"id"`
	FeedID   uuid.UUID `json:"feed_id" db:"feed_id"`
	ClipID   uuid.UUID `json:"clip_id" db:"clip_id"`
	Position int       `json:"position" db:"position"`
	AddedAt  time.Time `json:"added_at" db:"added_at"`
}

// FeedItemWithClip includes clip information
type FeedItemWithClip struct {
	FeedItem
	Clip *Clip `json:"clip,omitempty"`
}

// FeedFollow represents a user following a feed
type FeedFollow struct {
	ID         uuid.UUID `json:"id" db:"id"`
	UserID     uuid.UUID `json:"user_id" db:"user_id"`
	FeedID     uuid.UUID `json:"feed_id" db:"feed_id"`
	FollowedAt time.Time `json:"followed_at" db:"followed_at"`
}

// CreateFeedRequest represents the request to create a feed
type CreateFeedRequest struct {
	Name        string  `json:"name" binding:"required,min=1,max=255"`
	Description *string `json:"description,omitempty" binding:"omitempty,max=1000"`
	Icon        *string `json:"icon,omitempty" binding:"omitempty,max=100"`
	IsPublic    *bool   `json:"is_public,omitempty"`
}

// UpdateFeedRequest represents the request to update a feed
type UpdateFeedRequest struct {
	Name        *string `json:"name,omitempty" binding:"omitempty,min=1,max=255"`
	Description *string `json:"description,omitempty" binding:"omitempty,max=1000"`
	Icon        *string `json:"icon,omitempty" binding:"omitempty,max=100"`
	IsPublic    *bool   `json:"is_public,omitempty"`
}

// AddClipToFeedRequest represents the request to add a clip to a feed
type AddClipToFeedRequest struct {
	ClipID uuid.UUID `json:"clip_id" binding:"required"`
}

// ReorderFeedClipsRequest represents the request to reorder clips in a feed
type ReorderFeedClipsRequest struct {
	ClipIDs []uuid.UUID `json:"clip_ids" binding:"required"`
}

// UserFollow represents a user following another user
type UserFollow struct {
	ID          uuid.UUID `json:"id" db:"id"`
	FollowerID  uuid.UUID `json:"follower_id" db:"follower_id"`
	FollowingID uuid.UUID `json:"following_id" db:"following_id"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

// UserActivity represents a user activity entry
type UserActivity struct {
	ID           uuid.UUID  `json:"id" db:"id"`
	UserID       uuid.UUID  `json:"user_id" db:"user_id"`
	ActivityType string     `json:"activity_type" db:"activity_type"`
	TargetID     *uuid.UUID `json:"target_id,omitempty" db:"target_id"`
	TargetType   *string    `json:"target_type,omitempty" db:"target_type"`
	Metadata     *string    `json:"metadata,omitempty" db:"metadata"` // JSONB stored as string
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
}

// Activity type constants
const (
	ActivityTypeClipSubmitted      = "clip_submitted"
	ActivityTypeUpvote             = "upvote"
	ActivityTypeDownvote           = "downvote"
	ActivityTypeComment            = "comment"
	ActivityTypeUserFollowed       = "user_followed"
	ActivityTypeBroadcasterFollowed = "broadcaster_followed"
)

// UserProfile represents a complete user profile with stats
type UserProfile struct {
	User
	Stats          UserProfileStats `json:"stats"`
	IsFollowing    bool             `json:"is_following"`     // Whether the current user is following this user
	IsFollowedBy   bool             `json:"is_followed_by"`   // Whether this user is following the current user
	ClipsSubmitted int              `json:"clips_submitted"`  // Total clips submitted
	TotalUpvotes   int              `json:"total_upvotes"`    // Total upvotes received on clips
}

// UserProfileStats represents statistics for a user profile
type UserProfileStats struct {
	ClipsSubmitted      int `json:"clips_submitted"`
	TotalUpvotes        int `json:"total_upvotes"`
	TotalComments       int `json:"total_comments"`
	ClipsFeatured       int `json:"clips_featured"`
	BroadcastersFollowed int `json:"broadcasters_followed"`
}

// UserActivityItem represents a single activity item with expanded data
type UserActivityItem struct {
	UserActivity
	Username     string  `json:"username"`
	UserAvatar   *string `json:"user_avatar"`
	ClipTitle    *string `json:"clip_title,omitempty"`
	ClipID       *string `json:"clip_id,omitempty"`
	CommentText  *string `json:"comment_text,omitempty"`
	TargetUser   *string `json:"target_user,omitempty"`
}

// SocialLinks represents social media links
type SocialLinks struct {
	Twitter  *string `json:"twitter,omitempty"`
	Twitch   *string `json:"twitch,omitempty"`
	Discord  *string `json:"discord,omitempty"`
	YouTube  *string `json:"youtube,omitempty"`
	Website  *string `json:"website,omitempty"`
}

// UpdateSocialLinksRequest represents the request to update social links
type UpdateSocialLinksRequest struct {
	Twitter  *string `json:"twitter,omitempty" binding:"omitempty,max=255"`
	Twitch   *string `json:"twitch,omitempty" binding:"omitempty,max=255"`
	Discord  *string `json:"discord,omitempty" binding:"omitempty,max=255"`
	YouTube  *string `json:"youtube,omitempty" binding:"omitempty,max=255"`
	Website  *string `json:"website,omitempty" binding:"omitempty,url,max=255"`
}

// FollowerUser represents a user in a followers/following list
type FollowerUser struct {
	ID          uuid.UUID  `json:"id" db:"id"`
	Username    string     `json:"username" db:"username"`
	DisplayName string     `json:"display_name" db:"display_name"`
	AvatarURL   *string    `json:"avatar_url,omitempty" db:"avatar_url"`
	Bio         *string    `json:"bio,omitempty" db:"bio"`
	KarmaPoints int        `json:"karma_points" db:"karma_points"`
	FollowedAt  time.Time  `json:"followed_at" db:"followed_at"`
	IsFollowing bool       `json:"is_following"` // Whether the current user is following this user
}

// Category represents a high-level content category
type Category struct {
	ID          uuid.UUID `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Slug        string    `json:"slug" db:"slug"`
	Description *string   `json:"description,omitempty" db:"description"`
	Icon        *string   `json:"icon,omitempty" db:"icon"`
	Position    int       `json:"position" db:"position"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// Game represents a game from Twitch
type Game struct {
	ID            uuid.UUID `json:"id" db:"id"`
	TwitchGameID  string    `json:"twitch_game_id" db:"twitch_game_id"`
	Name          string    `json:"name" db:"name"`
	BoxArtURL     *string   `json:"box_art_url,omitempty" db:"box_art_url"`
	IGDBID        *string   `json:"igdb_id,omitempty" db:"igdb_id"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

// GameWithStats represents a game with additional statistics
type GameWithStats struct {
	Game
	ClipCount     int `json:"clip_count" db:"clip_count"`
	FollowerCount int `json:"follower_count" db:"follower_count"`
	IsFollowing   bool `json:"is_following"` // Whether the current user is following
}

// CategoryGame represents the many-to-many relationship between categories and games
type CategoryGame struct {
	GameID     uuid.UUID `json:"game_id" db:"game_id"`
	CategoryID uuid.UUID `json:"category_id" db:"category_id"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// GameFollow represents a user following a game
type GameFollow struct {
	ID         uuid.UUID `json:"id" db:"id"`
	UserID     uuid.UUID `json:"user_id" db:"user_id"`
	GameID     uuid.UUID `json:"game_id" db:"game_id"`
	FollowedAt time.Time `json:"followed_at" db:"followed_at"`
}

// TrendingGame represents a game with trending statistics
type TrendingGame struct {
	ID              uuid.UUID `json:"id" db:"id"`
	TwitchGameID    string    `json:"twitch_game_id" db:"twitch_game_id"`
	Name            string    `json:"name" db:"name"`
	BoxArtURL       *string   `json:"box_art_url,omitempty" db:"box_art_url"`
	RecentClipCount int       `json:"recent_clip_count" db:"recent_clip_count"`
	TotalVoteScore  int       `json:"total_vote_score" db:"total_vote_score"`
	FollowerCount   int       `json:"follower_count" db:"follower_count"`
}
