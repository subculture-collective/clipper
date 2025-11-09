package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID              uuid.UUID  `json:"id" db:"id"`
	TwitchID        string     `json:"twitch_id" db:"twitch_id"`
	Username        string     `json:"username" db:"username"`
	DisplayName     string     `json:"display_name" db:"display_name"`
	Email           *string    `json:"email,omitempty" db:"email"`
	AvatarURL       *string    `json:"avatar_url,omitempty" db:"avatar_url"`
	Bio             *string    `json:"bio,omitempty" db:"bio"`
	KarmaPoints     int        `json:"karma_points" db:"karma_points"`
	Role            string     `json:"role" db:"role"`
	IsBanned        bool       `json:"is_banned" db:"is_banned"`
	DeviceToken     *string    `json:"device_token,omitempty" db:"device_token"`
	DevicePlatform  *string    `json:"device_platform,omitempty" db:"device_platform"`
	CreatedAt       time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at" db:"updated_at"`
	LastLoginAt     *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
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
	Reason      *string `json:"reason,omitempty" binding:"omitempty,max=1000"`
	Confirmation string  `json:"confirmation" binding:"required,eq=DELETE MY ACCOUNT"`
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
	Languages []FacetBucket `json:"languages,omitempty"`
	Games     []FacetBucket `json:"games,omitempty"`
	Tags      []FacetBucket `json:"tags,omitempty"`
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
	UserID                     uuid.UUID `json:"user_id" db:"user_id"`
	InAppEnabled               bool      `json:"in_app_enabled" db:"in_app_enabled"`
	EmailEnabled               bool      `json:"email_enabled" db:"email_enabled"`
	EmailDigest                string    `json:"email_digest" db:"email_digest"`
	NotifyReplies              bool      `json:"notify_replies" db:"notify_replies"`
	NotifyMentions             bool      `json:"notify_mentions" db:"notify_mentions"`
	NotifyVotes                bool      `json:"notify_votes" db:"notify_votes"`
	NotifyBadges               bool      `json:"notify_badges" db:"notify_badges"`
	NotifyModeration           bool      `json:"notify_moderation" db:"notify_moderation"`
	NotifyRankUp               bool      `json:"notify_rank_up" db:"notify_rank_up"`
	NotifyFavoritedClipComment bool      `json:"notify_favorited_clip_comment" db:"notify_favorited_clip_comment"`
	UpdatedAt                  time.Time `json:"updated_at" db:"updated_at"`
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
	NotificationTypePaymentFailed           = "payment_failed"
	NotificationTypePaymentRetry            = "payment_retry"
	NotificationTypeGracePeriodWarning      = "grace_period_warning"
	NotificationTypeSubscriptionDowngraded  = "subscription_downgraded"
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
	ID             uuid.UUID `json:"id" db:"id"`
	SubscriptionID *uuid.UUID `json:"subscription_id,omitempty" db:"subscription_id"`
	EventType      string    `json:"event_type" db:"event_type"`
	StripeEventID  *string   `json:"stripe_event_id,omitempty" db:"stripe_event_id"`
	Payload        string    `json:"payload" db:"payload"` // JSONB stored as string
	CreatedAt      time.Time `json:"created_at" db:"created_at"`
}

// WebhookRetryQueue represents a webhook event pending retry
type WebhookRetryQueue struct {
	ID             uuid.UUID  `json:"id" db:"id"`
	StripeEventID  string     `json:"stripe_event_id" db:"stripe_event_id"`
	EventType      string     `json:"event_type" db:"event_type"`
	Payload        string     `json:"payload" db:"payload"` // JSONB stored as string
	RetryCount     int        `json:"retry_count" db:"retry_count"`
	MaxRetries     int        `json:"max_retries" db:"max_retries"`
	NextRetryAt    *time.Time `json:"next_retry_at,omitempty" db:"next_retry_at"`
	LastError      *string    `json:"last_error,omitempty" db:"last_error"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
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
	ID                   uuid.UUID  `json:"id" db:"id"`
	SubscriptionID       uuid.UUID  `json:"subscription_id" db:"subscription_id"`
	StripeInvoiceID      string     `json:"stripe_invoice_id" db:"stripe_invoice_id"`
	StripePaymentIntentID *string   `json:"stripe_payment_intent_id,omitempty" db:"stripe_payment_intent_id"`
	AmountDue            int64      `json:"amount_due" db:"amount_due"` // Amount in cents
	Currency             string     `json:"currency" db:"currency"`
	AttemptCount         int        `json:"attempt_count" db:"attempt_count"`
	FailureReason        *string    `json:"failure_reason,omitempty" db:"failure_reason"`
	NextRetryAt          *time.Time `json:"next_retry_at,omitempty" db:"next_retry_at"`
	Resolved             bool       `json:"resolved" db:"resolved"`
	ResolvedAt           *time.Time `json:"resolved_at,omitempty" db:"resolved_at"`
	CreatedAt            time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at" db:"updated_at"`
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
