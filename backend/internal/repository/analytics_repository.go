package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

// AnalyticsRepository handles analytics data access
type AnalyticsRepository struct {
	db *pgxpool.Pool
}

// NewAnalyticsRepository creates a new analytics repository
func NewAnalyticsRepository(db *pgxpool.Pool) *AnalyticsRepository {
	return &AnalyticsRepository{db: db}
}

// TrackEvent records an analytics event
func (r *AnalyticsRepository) TrackEvent(ctx context.Context, event *models.AnalyticsEvent) error {
	query := `
		INSERT INTO analytics_events (event_type, user_id, clip_id, metadata, ip_address, user_agent, referrer)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at
	`

	return r.db.QueryRow(ctx, query,
		event.EventType,
		event.UserID,
		event.ClipID,
		event.Metadata,
		event.IPAddress,
		event.UserAgent,
		event.Referrer,
	).Scan(&event.ID, &event.CreatedAt)
}

// GetCreatorAnalytics retrieves analytics for a specific creator
func (r *AnalyticsRepository) GetCreatorAnalytics(ctx context.Context, creatorName string) (*models.CreatorAnalytics, error) {
	query := `
		SELECT creator_name, creator_id, total_clips, total_views, total_upvotes,
		       total_downvotes, total_comments, total_favorites, avg_engagement_rate,
		       follower_count, updated_at
		FROM creator_analytics
		WHERE creator_name = $1
	`

	var analytics models.CreatorAnalytics
	err := r.db.QueryRow(ctx, query, creatorName).Scan(
		&analytics.CreatorName,
		&analytics.CreatorID,
		&analytics.TotalClips,
		&analytics.TotalViews,
		&analytics.TotalUpvotes,
		&analytics.TotalDownvotes,
		&analytics.TotalComments,
		&analytics.TotalFavorites,
		&analytics.AvgEngagementRate,
		&analytics.FollowerCount,
		&analytics.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &analytics, nil
}

// GetCreatorTopClips retrieves top-performing clips for a creator
func (r *AnalyticsRepository) GetCreatorTopClips(ctx context.Context, creatorName string, sortBy string, limit int) ([]models.CreatorTopClip, error) {
	// Determine sort column
	sortColumn := "c.vote_score"
	switch sortBy {
	case "views":
		sortColumn = "COALESCE(ca.total_views, 0)"
	case "comments":
		sortColumn = "c.comment_count"
	case "votes":
		sortColumn = "c.vote_score"
	}

	query := fmt.Sprintf(`
		SELECT c.id, c.twitch_clip_id, c.twitch_clip_url, c.embed_url, c.title,
		       c.creator_name, c.creator_id, c.broadcaster_name, c.broadcaster_id,
		       c.game_id, c.game_name, c.language, c.thumbnail_url, c.duration,
		       c.view_count, c.created_at, c.imported_at, c.vote_score,
		       c.comment_count, c.favorite_count, c.is_featured, c.is_nsfw,
		       c.is_removed, c.removed_reason,
		       COALESCE(ca.total_views, 0) as views,
		       CASE 
		           WHEN COALESCE(ca.total_views, 0) > 0 
		           THEN (c.vote_score::float + c.comment_count::float) / ca.total_views::float
		           ELSE 0
		       END as engagement_rate
		FROM clips c
		LEFT JOIN clip_analytics ca ON c.id = ca.clip_id
		WHERE c.creator_name = $1 AND c.is_removed = false
		ORDER BY %s DESC
		LIMIT $2
	`, sortColumn)

	rows, err := r.db.Query(ctx, query, creatorName, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var clips []models.CreatorTopClip
	for rows.Next() {
		var clip models.CreatorTopClip
		err := rows.Scan(
			&clip.ID,
			&clip.TwitchClipID,
			&clip.TwitchClipURL,
			&clip.EmbedURL,
			&clip.Title,
			&clip.CreatorName,
			&clip.CreatorID,
			&clip.BroadcasterName,
			&clip.BroadcasterID,
			&clip.GameID,
			&clip.GameName,
			&clip.Language,
			&clip.ThumbnailURL,
			&clip.Duration,
			&clip.ViewCount,
			&clip.CreatedAt,
			&clip.ImportedAt,
			&clip.VoteScore,
			&clip.CommentCount,
			&clip.FavoriteCount,
			&clip.IsFeatured,
			&clip.IsNSFW,
			&clip.IsRemoved,
			&clip.RemovedReason,
			&clip.Views,
			&clip.EngagementRate,
		)
		if err != nil {
			return nil, err
		}
		clips = append(clips, clip)
	}

	return clips, rows.Err()
}

// GetCreatorTrends retrieves time-series data for creator metrics
func (r *AnalyticsRepository) GetCreatorTrends(ctx context.Context, creatorName string, metricType string, days int) ([]models.TrendDataPoint, error) {
	query := `
		SELECT da.date, COALESCE(SUM(da.value), 0) as value
		FROM daily_analytics da
		WHERE da.entity_type = 'creator'
		  AND da.entity_id = $1
		  AND da.metric_type = $2
		  AND da.date >= CURRENT_DATE - $3 * INTERVAL '1 day'
		GROUP BY da.date
		ORDER BY da.date ASC
	`

	rows, err := r.db.Query(ctx, query, creatorName, metricType, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trends []models.TrendDataPoint
	for rows.Next() {
		var point models.TrendDataPoint
		err := rows.Scan(&point.Date, &point.Value)
		if err != nil {
			return nil, err
		}
		trends = append(trends, point)
	}

	return trends, rows.Err()
}

// GetClipAnalytics retrieves analytics for a specific clip
func (r *AnalyticsRepository) GetClipAnalytics(ctx context.Context, clipID uuid.UUID) (*models.ClipAnalytics, error) {
	query := `
		SELECT clip_id, total_views, unique_viewers, avg_view_duration,
		       total_shares, peak_concurrent_viewers, retention_rate,
		       first_viewed_at, last_viewed_at, updated_at
		FROM clip_analytics
		WHERE clip_id = $1
	`

	var analytics models.ClipAnalytics
	err := r.db.QueryRow(ctx, query, clipID).Scan(
		&analytics.ClipID,
		&analytics.TotalViews,
		&analytics.UniqueViewers,
		&analytics.AvgViewDuration,
		&analytics.TotalShares,
		&analytics.PeakConcurrentViews,
		&analytics.RetentionRate,
		&analytics.FirstViewedAt,
		&analytics.LastViewedAt,
		&analytics.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &analytics, nil
}

// GetUserAnalytics retrieves personal statistics for a user
func (r *AnalyticsRepository) GetUserAnalytics(ctx context.Context, userID uuid.UUID) (*models.UserAnalytics, error) {
	query := `
		SELECT user_id, clips_upvoted, clips_downvoted, comments_posted,
		       clips_favorited, searches_performed, days_active,
		       total_karma_earned, last_active_at, updated_at
		FROM user_analytics
		WHERE user_id = $1
	`

	var analytics models.UserAnalytics
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&analytics.UserID,
		&analytics.ClipsUpvoted,
		&analytics.ClipsDownvoted,
		&analytics.CommentsPosted,
		&analytics.ClipsFavorited,
		&analytics.SearchesPerformed,
		&analytics.DaysActive,
		&analytics.TotalKarmaEarned,
		&analytics.LastActiveAt,
		&analytics.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &analytics, nil
}

// GetPlatformAnalytics retrieves platform-wide statistics
func (r *AnalyticsRepository) GetPlatformAnalytics(ctx context.Context, date time.Time) (*models.PlatformAnalytics, error) {
	query := `
		SELECT id, date, total_users, active_users_daily, active_users_weekly,
		       active_users_monthly, new_users_today, total_clips, new_clips_today,
		       total_votes, votes_today, total_comments, comments_today,
		       total_views, views_today, avg_session_duration, metadata, created_at
		FROM platform_analytics
		WHERE date = $1
	`

	var analytics models.PlatformAnalytics
	err := r.db.QueryRow(ctx, query, date).Scan(
		&analytics.ID,
		&analytics.Date,
		&analytics.TotalUsers,
		&analytics.ActiveUsersDaily,
		&analytics.ActiveUsersWeekly,
		&analytics.ActiveUsersMonthly,
		&analytics.NewUsersToday,
		&analytics.TotalClips,
		&analytics.NewClipsToday,
		&analytics.TotalVotes,
		&analytics.VotesToday,
		&analytics.TotalComments,
		&analytics.CommentsToday,
		&analytics.TotalViews,
		&analytics.ViewsToday,
		&analytics.AvgSessionDuration,
		&analytics.Metadata,
		&analytics.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	return &analytics, nil
}

// GetPlatformOverviewMetrics retrieves current platform KPIs
func (r *AnalyticsRepository) GetPlatformOverviewMetrics(ctx context.Context) (*models.PlatformOverviewMetrics, error) {
	query := `
		WITH latest_analytics AS (
			SELECT * FROM platform_analytics
			ORDER BY date DESC
			LIMIT 1
		)
		SELECT 
			COALESCE(total_users, 0),
			COALESCE(active_users_daily, 0),
			COALESCE(active_users_monthly, 0),
			COALESCE(total_clips, 0),
			COALESCE(new_clips_today, 0),
			COALESCE(total_votes, 0),
			COALESCE(total_comments, 0),
			COALESCE(avg_session_duration, 0)
		FROM latest_analytics
	`

	var metrics models.PlatformOverviewMetrics
	err := r.db.QueryRow(ctx, query).Scan(
		&metrics.TotalUsers,
		&metrics.ActiveUsersDaily,
		&metrics.ActiveUsersMonthly,
		&metrics.TotalClips,
		&metrics.ClipsAddedToday,
		&metrics.TotalVotes,
		&metrics.TotalComments,
		&metrics.AvgSessionDuration,
	)

	if err != nil {
		return nil, err
	}

	return &metrics, nil
}

// GetMostPopularGames retrieves top games by clip count and views
func (r *AnalyticsRepository) GetMostPopularGames(ctx context.Context, limit int) ([]models.GameMetric, error) {
	query := `
		SELECT 
			c.game_id,
			c.game_name,
			COUNT(*) as clip_count,
			COALESCE(SUM(ca.total_views), 0) as view_count
		FROM clips c
		LEFT JOIN clip_analytics ca ON c.id = ca.clip_id
		WHERE c.is_removed = false AND c.game_name IS NOT NULL
		GROUP BY c.game_id, c.game_name
		ORDER BY clip_count DESC, view_count DESC
		LIMIT $1
	`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var games []models.GameMetric
	for rows.Next() {
		var game models.GameMetric
		err := rows.Scan(&game.GameID, &game.GameName, &game.ClipCount, &game.ViewCount)
		if err != nil {
			return nil, err
		}
		games = append(games, game)
	}

	return games, rows.Err()
}

// GetMostPopularCreators retrieves top creators by metrics
func (r *AnalyticsRepository) GetMostPopularCreators(ctx context.Context, limit int) ([]models.CreatorMetric, error) {
	query := `
		SELECT 
			creator_id,
			creator_name,
			total_clips,
			total_views,
			total_upvotes
		FROM creator_analytics
		ORDER BY total_views DESC, total_upvotes DESC
		LIMIT $1
	`

	rows, err := r.db.Query(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var creators []models.CreatorMetric
	for rows.Next() {
		var creator models.CreatorMetric
		err := rows.Scan(
			&creator.CreatorID,
			&creator.CreatorName,
			&creator.ClipCount,
			&creator.ViewCount,
			&creator.VoteScore,
		)
		if err != nil {
			return nil, err
		}
		creators = append(creators, creator)
	}

	return creators, rows.Err()
}

// GetTrendingTags retrieves most used tags recently
func (r *AnalyticsRepository) GetTrendingTags(ctx context.Context, days int, limit int) ([]models.TagMetric, error) {
	query := `
		SELECT t.id, t.name, COUNT(*) as usage_count
		FROM tags t
		JOIN clip_tags ct ON t.id = ct.tag_id
		JOIN clips c ON ct.clip_id = c.id
		WHERE ct.created_at >= CURRENT_DATE - $1 * INTERVAL '1 day'
		  AND c.is_removed = false
		GROUP BY t.id, t.name
		ORDER BY usage_count DESC
		LIMIT $2
	`

	rows, err := r.db.Query(ctx, query, days, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []models.TagMetric
	for rows.Next() {
		var tag models.TagMetric
		err := rows.Scan(&tag.TagID, &tag.TagName, &tag.UsageCount)
		if err != nil {
			return nil, err
		}
		tags = append(tags, tag)
	}

	return tags, rows.Err()
}

// GetPlatformTrends retrieves time-series data for platform metrics
func (r *AnalyticsRepository) GetPlatformTrends(ctx context.Context, metricType string, days int) ([]models.TrendDataPoint, error) {
	// Map metric types to column names
	var column string
	switch metricType {
	case "users":
		column = "new_users_today"
	case "clips":
		column = "new_clips_today"
	case "views":
		column = "views_today"
	case "votes":
		column = "votes_today"
	case "comments":
		column = "comments_today"
	default:
		return nil, fmt.Errorf("invalid metric type: %s", metricType)
	}

	query := fmt.Sprintf(`
		SELECT date, %s as value
		FROM platform_analytics
		WHERE date >= CURRENT_DATE - $1 * INTERVAL '1 day'
		ORDER BY date ASC
	`, column)

	rows, err := r.db.Query(ctx, query, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var trends []models.TrendDataPoint
	for rows.Next() {
		var point models.TrendDataPoint
		var value int
		err := rows.Scan(&point.Date, &value)
		if err != nil {
			return nil, err
		}
		point.Value = int64(value)
		trends = append(trends, point)
	}

	return trends, rows.Err()
}

// GetAverageClipVoteScore retrieves the average vote score across all clips
func (r *AnalyticsRepository) GetAverageClipVoteScore(ctx context.Context) (float64, error) {
	query := `
SELECT COALESCE(AVG(vote_score), 0) as avg_vote_score
FROM clips
WHERE is_removed = false
`

	var avgScore float64
	err := r.db.QueryRow(ctx, query).Scan(&avgScore)
	if err != nil {
		return 0, err
	}

	return avgScore, nil
}
