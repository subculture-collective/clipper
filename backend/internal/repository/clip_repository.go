package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

const (
	// HotClipsMaterializedView is the name of the materialized view for hot clips
	HotClipsMaterializedView = "hot_clips_materialized"
)

// ClipRepository handles database operations for clips
type ClipRepository struct {
	pool *pgxpool.Pool
}

// NewClipRepository creates a new ClipRepository
func NewClipRepository(pool *pgxpool.Pool) *ClipRepository {
	return &ClipRepository{
		pool: pool,
	}
}

// Create inserts a new clip into the database
func (r *ClipRepository) Create(ctx context.Context, clip *models.Clip) error {
	query := `
		INSERT INTO clips (
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, creator_id, broadcaster_name, broadcaster_id,
			game_id, game_name, language, thumbnail_url, duration,
			view_count, created_at, imported_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
		)
	`

	_, err := r.pool.Exec(ctx, query,
		clip.ID, clip.TwitchClipID, clip.TwitchClipURL, clip.EmbedURL,
		clip.Title, clip.CreatorName, clip.CreatorID, clip.BroadcasterName,
		clip.BroadcasterID, clip.GameID, clip.GameName, clip.Language,
		clip.ThumbnailURL, clip.Duration, clip.ViewCount, clip.CreatedAt,
		clip.ImportedAt,
	)

	if err != nil {
		return fmt.Errorf("failed to create clip: %w", err)
	}

	return nil
}

// GetByTwitchClipID retrieves a clip by its Twitch clip ID
func (r *ClipRepository) GetByTwitchClipID(ctx context.Context, twitchClipID string) (*models.Clip, error) {
	query := `
		SELECT 
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, creator_id, broadcaster_name, broadcaster_id,
			game_id, game_name, language, thumbnail_url, duration,
			view_count, created_at, imported_at, vote_score, comment_count,
			favorite_count, is_featured, is_nsfw, is_removed, removed_reason
		FROM clips
		WHERE twitch_clip_id = $1
	`

	var clip models.Clip
	err := r.pool.QueryRow(ctx, query, twitchClipID).Scan(
		&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL,
		&clip.Title, &clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName,
		&clip.BroadcasterID, &clip.GameID, &clip.GameName, &clip.Language,
		&clip.ThumbnailURL, &clip.Duration, &clip.ViewCount, &clip.CreatedAt,
		&clip.ImportedAt, &clip.VoteScore, &clip.CommentCount, &clip.FavoriteCount,
		&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get clip by twitch ID: %w", err)
	}

	return &clip, nil
}

// UpdateViewCount updates the view count for a clip
func (r *ClipRepository) UpdateViewCount(ctx context.Context, twitchClipID string, viewCount int) error {
	query := `
		UPDATE clips
		SET view_count = $2
		WHERE twitch_clip_id = $1
	`

	_, err := r.pool.Exec(ctx, query, twitchClipID, viewCount)
	if err != nil {
		return fmt.Errorf("failed to update view count: %w", err)
	}

	return nil
}

// ExistsByTwitchClipID checks if a clip exists by Twitch clip ID
func (r *ClipRepository) ExistsByTwitchClipID(ctx context.Context, twitchClipID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM clips WHERE twitch_clip_id = $1)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, twitchClipID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check clip existence: %w", err)
	}

	return exists, nil
}

// GetByID retrieves a clip by its ID
func (r *ClipRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Clip, error) {
	query := `
		SELECT 
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, creator_id, broadcaster_name, broadcaster_id,
			game_id, game_name, language, thumbnail_url, duration,
			view_count, created_at, imported_at, vote_score, comment_count,
			favorite_count, is_featured, is_nsfw, is_removed, removed_reason
		FROM clips
		WHERE id = $1 AND is_removed = false
	`

	var clip models.Clip
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL,
		&clip.Title, &clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName,
		&clip.BroadcasterID, &clip.GameID, &clip.GameName, &clip.Language,
		&clip.ThumbnailURL, &clip.Duration, &clip.ViewCount, &clip.CreatedAt,
		&clip.ImportedAt, &clip.VoteScore, &clip.CommentCount, &clip.FavoriteCount,
		&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get clip by ID: %w", err)
	}

	return &clip, nil
}

// List retrieves clips with pagination
func (r *ClipRepository) List(ctx context.Context, limit, offset int) ([]models.Clip, error) {
	query := `
		SELECT 
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, creator_id, broadcaster_name, broadcaster_id,
			game_id, game_name, language, thumbnail_url, duration,
			view_count, created_at, imported_at, vote_score, comment_count,
			favorite_count, is_featured, is_nsfw, is_removed, removed_reason
		FROM clips
		WHERE is_removed = false
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to list clips: %w", err)
	}
	defer rows.Close()

	var clips []models.Clip
	for rows.Next() {
		var clip models.Clip
		err := rows.Scan(
			&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL,
			&clip.Title, &clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName,
			&clip.BroadcasterID, &clip.GameID, &clip.GameName, &clip.Language,
			&clip.ThumbnailURL, &clip.Duration, &clip.ViewCount, &clip.CreatedAt,
			&clip.ImportedAt, &clip.VoteScore, &clip.CommentCount, &clip.FavoriteCount,
			&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan clip: %w", err)
		}
		clips = append(clips, clip)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating clips: %w", err)
	}

	return clips, nil
}

// GetRecentClips gets clips from the last N hours
func (r *ClipRepository) GetRecentClips(ctx context.Context, hours int, limit int) ([]models.Clip, error) {
	query := `
		SELECT 
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, creator_id, broadcaster_name, broadcaster_id,
			game_id, game_name, language, thumbnail_url, duration,
			view_count, created_at, imported_at, vote_score, comment_count,
			favorite_count, is_featured, is_nsfw, is_removed, removed_reason
		FROM clips
		WHERE is_removed = false AND created_at > NOW() - INTERVAL '1 hour' * $1
		ORDER BY view_count DESC, created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, hours, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get recent clips: %w", err)
	}
	defer rows.Close()

	var clips []models.Clip
	for rows.Next() {
		var clip models.Clip
		err := rows.Scan(
			&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL,
			&clip.Title, &clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName,
			&clip.BroadcasterID, &clip.GameID, &clip.GameName, &clip.Language,
			&clip.ThumbnailURL, &clip.Duration, &clip.ViewCount, &clip.CreatedAt,
			&clip.ImportedAt, &clip.VoteScore, &clip.CommentCount, &clip.FavoriteCount,
			&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan clip: %w", err)
		}
		clips = append(clips, clip)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating clips: %w", err)
	}

	return clips, nil
}

// CountImportedToday counts the number of clips imported today
func (r *ClipRepository) CountImportedToday(ctx context.Context) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM clips
		WHERE imported_at > CURRENT_DATE
	`

	var count int
	err := r.pool.QueryRow(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count imported clips: %w", err)
	}

	return count, nil
}

// GetLastSyncTime gets the last time clips were synced
func (r *ClipRepository) GetLastSyncTime(ctx context.Context) (*time.Time, error) {
	query := `
		SELECT MAX(imported_at)
		FROM clips
	`

	var lastSync *time.Time
	err := r.pool.QueryRow(ctx, query).Scan(&lastSync)
	if err != nil {
		return nil, fmt.Errorf("failed to get last sync time: %w", err)
	}

	return lastSync, nil
}

// ClipFilters represents filters for listing clips
type ClipFilters struct {
	GameID        *string
	BroadcasterID *string
	Tag           *string
	Search        *string
	Timeframe     *string // hour, day, week, month, year, all
	Sort          string  // hot, new, top, rising
}

// ListWithFilters retrieves clips with filters, sorting, and pagination
func (r *ClipRepository) ListWithFilters(ctx context.Context, filters ClipFilters, limit, offset int) ([]models.Clip, int, error) {
	// Build WHERE clause
	whereClauses := []string{"c.is_removed = false"}
	args := []interface{}{}
	argIndex := 1

	if filters.GameID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("c.game_id = $%d", argIndex))
		args = append(args, *filters.GameID)
		argIndex++
	}

	if filters.BroadcasterID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("c.broadcaster_id = $%d", argIndex))
		args = append(args, *filters.BroadcasterID)
		argIndex++
	}

	if filters.Tag != nil {
		whereClauses = append(whereClauses, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM clip_tags ct
			JOIN tags t ON ct.tag_id = t.id
			WHERE ct.clip_id = c.id AND t.slug = $%d
		)`, argIndex))
		args = append(args, *filters.Tag)
		argIndex++
	}

	if filters.Search != nil && *filters.Search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("c.title ILIKE $%d", argIndex))
		args = append(args, "%"+*filters.Search+"%")
		argIndex++
	}

	// Add timeframe filter for top sort
	if filters.Sort == "top" && filters.Timeframe != nil {
		switch *filters.Timeframe {
		case "hour":
			whereClauses = append(whereClauses, "c.created_at > NOW() - INTERVAL '1 hour'")
		case "day":
			whereClauses = append(whereClauses, "c.created_at > NOW() - INTERVAL '1 day'")
		case "week":
			whereClauses = append(whereClauses, "c.created_at > NOW() - INTERVAL '7 days'")
		case "month":
			whereClauses = append(whereClauses, "c.created_at > NOW() - INTERVAL '30 days'")
		case "year":
			whereClauses = append(whereClauses, "c.created_at > NOW() - INTERVAL '365 days'")
		}
	}

	// Add timeframe for rising (recent clips only)
	if filters.Sort == "rising" {
		whereClauses = append(whereClauses, "c.created_at > NOW() - INTERVAL '48 hours'")
	}

	whereClause := "WHERE " + whereClauses[0]
	for i := 1; i < len(whereClauses); i++ {
		whereClause += " AND " + whereClauses[i]
	}

	// Build ORDER BY clause
	var orderBy string
	switch filters.Sort {
	case "hot":
		orderBy = "ORDER BY calculate_hot_score(c.vote_score, c.created_at) DESC"
	case "new":
		orderBy = "ORDER BY c.created_at DESC"
	case "top":
		orderBy = "ORDER BY c.vote_score DESC, c.created_at DESC"
	case "rising":
		// Rising: recent clips with high velocity (view_count + vote_score combined with recency)
		orderBy = "ORDER BY (c.vote_score + (c.view_count / 100)) * (1 + 1.0 / (EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 3600.0 + 2)) DESC"
	default:
		orderBy = "ORDER BY calculate_hot_score(c.vote_score, c.created_at) DESC"
	}

	// Count query
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM clips c %s", whereClause)
	var total int
	err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count clips: %w", err)
	}

	// Main query
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT 
			c.id, c.twitch_clip_id, c.twitch_clip_url, c.embed_url, c.title,
			c.creator_name, c.creator_id, c.broadcaster_name, c.broadcaster_id,
			c.game_id, c.game_name, c.language, c.thumbnail_url, c.duration,
			c.view_count, c.created_at, c.imported_at, c.vote_score, c.comment_count,
			c.favorite_count, c.is_featured, c.is_nsfw, c.is_removed, c.removed_reason
		FROM clips c
		%s
		%s
		LIMIT $%d OFFSET $%d
	`, whereClause, orderBy, argIndex, argIndex+1)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list clips: %w", err)
	}
	defer rows.Close()

	var clips []models.Clip
	for rows.Next() {
		var clip models.Clip
		err := rows.Scan(
			&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL,
			&clip.Title, &clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName,
			&clip.BroadcasterID, &clip.GameID, &clip.GameName, &clip.Language,
			&clip.ThumbnailURL, &clip.Duration, &clip.ViewCount, &clip.CreatedAt,
			&clip.ImportedAt, &clip.VoteScore, &clip.CommentCount, &clip.FavoriteCount,
			&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan clip: %w", err)
		}
		clips = append(clips, clip)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating clips: %w", err)
	}

	return clips, total, nil
}

// IncrementViewCount atomically increments the view count for a clip
func (r *ClipRepository) IncrementViewCount(ctx context.Context, clipID uuid.UUID) error {
	query := `
		UPDATE clips
		SET view_count = view_count + 1
		WHERE id = $1
	`

	_, err := r.pool.Exec(ctx, query, clipID)
	if err != nil {
		return fmt.Errorf("failed to increment view count: %w", err)
	}

	return nil
}

// Update updates a clip (for admin operations)
func (r *ClipRepository) Update(ctx context.Context, clipID uuid.UUID, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	// Build dynamic update query
	setClauses := []string{}
	args := []interface{}{}
	argIndex := 1

	for field, value := range updates {
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", field, argIndex))
		args = append(args, value)
		argIndex++
	}

	args = append(args, clipID)
	setClause := setClauses[0]
	if len(setClauses) > 1 {
		for i := 1; i < len(setClauses); i++ {
			setClause += ", " + setClauses[i]
		}
	}
	query := fmt.Sprintf("UPDATE clips SET %s WHERE id = $%d", setClause, argIndex)

	_, err := r.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to update clip: %w", err)
	}

	return nil
}

// SoftDelete marks a clip as removed
func (r *ClipRepository) SoftDelete(ctx context.Context, clipID uuid.UUID, reason string) error {
	query := `
		UPDATE clips
		SET is_removed = true, removed_reason = $2
		WHERE id = $1
	`

	_, err := r.pool.Exec(ctx, query, clipID, reason)
	if err != nil {
		return fmt.Errorf("failed to soft delete clip: %w", err)
	}

	return nil
}

// GetRelated finds related clips based on game, broadcaster, and tags
func (r *ClipRepository) GetRelated(ctx context.Context, clipID uuid.UUID, limit int) ([]models.Clip, error) {
	query := `
		WITH current_clip AS (
			SELECT game_id, broadcaster_id
			FROM clips
			WHERE id = $1
		),
		current_tags AS (
			SELECT tag_id
			FROM clip_tags
			WHERE clip_id = $1
		)
		SELECT 
			c.id, c.twitch_clip_id, c.twitch_clip_url, c.embed_url, c.title,
			c.creator_name, c.creator_id, c.broadcaster_name, c.broadcaster_id,
			c.game_id, c.game_name, c.language, c.thumbnail_url, c.duration,
			c.view_count, c.created_at, c.imported_at, c.vote_score, c.comment_count,
			c.favorite_count, c.is_featured, c.is_nsfw, c.is_removed, c.removed_reason,
			(
				CASE WHEN c.game_id = (SELECT game_id FROM current_clip) THEN 3 ELSE 0 END +
				CASE WHEN c.broadcaster_id = (SELECT broadcaster_id FROM current_clip) THEN 2 ELSE 0 END +
				COALESCE((
					SELECT COUNT(*)
					FROM clip_tags ct
					WHERE ct.clip_id = c.id AND ct.tag_id IN (SELECT tag_id FROM current_tags)
				), 0)
			) as relevance_score
		FROM clips c
		WHERE c.id != $1 AND c.is_removed = false
		ORDER BY relevance_score DESC, c.vote_score DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, clipID, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get related clips: %w", err)
	}
	defer rows.Close()

	var clips []models.Clip
	for rows.Next() {
		var clip models.Clip
		var relevanceScore int
		err := rows.Scan(
			&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL,
			&clip.Title, &clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName,
			&clip.BroadcasterID, &clip.GameID, &clip.GameName, &clip.Language,
			&clip.ThumbnailURL, &clip.Duration, &clip.ViewCount, &clip.CreatedAt,
			&clip.ImportedAt, &clip.VoteScore, &clip.CommentCount, &clip.FavoriteCount,
			&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason,
			&relevanceScore,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan related clip: %w", err)
		}
		clips = append(clips, clip)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating related clips: %w", err)
	}

	return clips, nil
}

// RemoveClip marks a clip as removed with a reason
func (r *ClipRepository) RemoveClip(ctx context.Context, clipID uuid.UUID, reason *string) error {
	query := `
		UPDATE clips
		SET is_removed = true, removed_reason = $2
		WHERE id = $1
	`

	_, err := r.pool.Exec(ctx, query, clipID, reason)
	return err
}

// RefreshHotScores refreshes the materialized view for hot clips
// This should be called periodically to update hot scores for discovery lists
func (r *ClipRepository) RefreshHotScores(ctx context.Context) error {
	query := fmt.Sprintf("REFRESH MATERIALIZED VIEW CONCURRENTLY %s", HotClipsMaterializedView)

	_, err := r.pool.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to refresh hot scores: %w", err)
	}

	return nil
}
