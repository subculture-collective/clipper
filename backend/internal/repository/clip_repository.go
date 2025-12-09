package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/utils"
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
			favorite_count, is_featured, is_nsfw, is_removed, removed_reason, is_hidden,
			submitted_by_user_id, submitted_at
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
		&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason, &clip.IsHidden,
		&clip.SubmittedByUserID, &clip.SubmittedAt,
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

// ClaimScrapedClip atomically updates a scraped clip to mark it as claimed by a user.
// This method performs a check-and-update operation to prevent race conditions where
// multiple users attempt to claim the same clip simultaneously.
//
// Parameters:
//   - ctx: Context for the database operation
//   - clipID: The UUID of the clip to claim
//   - userID: The UUID of the user claiming the clip
//   - title: Optional custom title to override the clip's current title (can be nil)
//   - isNSFW: Whether the clip should be marked as NSFW
//   - broadcasterName: Optional broadcaster name override (can be nil)
//   - submittedAt: The timestamp when the clip was claimed/submitted
//
// Returns:
//   - error: Returns "clip not found" if clip doesn't exist, or "clip has already been claimed by another user" if already claimed
//
// The WHERE clause (submitted_by_user_id IS NULL) ensures atomicity - the update will only
// succeed if the clip hasn't been claimed yet, preventing duplicate claims.
//
// Example usage:
//
//	err := repo.ClaimScrapedClip(ctx, clipID, userID, &customTitle, false, &broadcasterOverride, time.Now())
//	if err != nil {
//	    // Handle error - clip may not exist or already claimed
//	}
func (r *ClipRepository) ClaimScrapedClip(ctx context.Context, clipID uuid.UUID, userID uuid.UUID, title *string, isNSFW bool, broadcasterName *string, submittedAt time.Time) error {
	query := `
		UPDATE clips
		SET submitted_by_user_id = $2,
		    submitted_at = $3,
		    title = COALESCE($4, title),
		    is_nsfw = $5,
		    broadcaster_name = COALESCE($6, broadcaster_name)
		WHERE id = $1 AND submitted_by_user_id IS NULL
	`

	result, err := r.pool.Exec(ctx, query, clipID, userID, submittedAt, title, isNSFW, broadcasterName)
	if err != nil {
		return fmt.Errorf("failed to claim scraped clip: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected == 0 {
		// Check if clip exists at all
		var exists bool
		checkQuery := `SELECT EXISTS(SELECT 1 FROM clips WHERE id = $1)`
		if checkErr := r.pool.QueryRow(ctx, checkQuery, clipID).Scan(&exists); checkErr != nil {
			return fmt.Errorf("failed to verify clip existence: %w", checkErr)
		}
		
		if !exists {
			return fmt.Errorf("clip not found")
		}
		
		// Clip exists but update didn't happen - must be already claimed
		return fmt.Errorf("clip has already been claimed by another user")
	}

	return nil
}

// GetByID retrieves a clip by its ID
func (r *ClipRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Clip, error) {
	query := `
		SELECT
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, creator_id, broadcaster_name, broadcaster_id,
			game_id, game_name, language, thumbnail_url, duration,
			view_count, created_at, imported_at, vote_score, comment_count,
			favorite_count, is_featured, is_nsfw, is_removed, removed_reason, is_hidden
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
		&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason, &clip.IsHidden,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get clip by ID: %w", err)
	}

	return &clip, nil
}

// List retrieves clips with pagination
func (r *ClipRepository) List(ctx context.Context, limit, offset int) ([]models.Clip, error) {
	// Delegate to ListWithFilters with empty filters for reuse and to reduce duplication.
	clips, total, err := r.ListWithFilters(ctx, ClipFilters{Sort: "new"}, limit, offset)
	if err != nil {
		return nil, err
	}
	_ = total // total is not needed for simple list
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
	GameID          *string
	BroadcasterID   *string
	Tag             *string
	Search          *string
	Language        *string // Language code (e.g., en, es, fr)
	Timeframe       *string // hour, day, week, month, year, all
	Sort            string  // hot, new, top, rising, discussed
	Top10kStreamers bool    // Filter clips to only top 10k streamers
	ShowHidden      bool    // If true, include hidden clips (for owners/admins)
	CreatorID       *string // Filter by creator ID (for creator dashboard)
}

// ListWithFilters retrieves clips with filters, sorting, and pagination
func (r *ClipRepository) ListWithFilters(ctx context.Context, filters ClipFilters, limit, offset int) ([]models.Clip, int, error) {
	// Build WHERE clause
	whereClauses := []string{"c.is_removed = false"}

	// Filter hidden clips unless ShowHidden is true
	if !filters.ShowHidden {
		whereClauses = append(whereClauses, "c.is_hidden = false")
	}

	args := []interface{}{}
	argIndex := 1

	if filters.GameID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("c.game_id = %s", utils.SQLPlaceholder(argIndex)))
		args = append(args, *filters.GameID)
		argIndex++
	}

	if filters.BroadcasterID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("c.broadcaster_id = %s", utils.SQLPlaceholder(argIndex)))
		args = append(args, *filters.BroadcasterID)
		argIndex++
	}

	if filters.CreatorID != nil {
		whereClauses = append(whereClauses, fmt.Sprintf("c.creator_id = %s", utils.SQLPlaceholder(argIndex)))
		args = append(args, *filters.CreatorID)
		argIndex++
	}

	if filters.Tag != nil {
		whereClauses = append(whereClauses, fmt.Sprintf(`EXISTS (
			SELECT 1 FROM clip_tags ct
			JOIN tags t ON ct.tag_id = t.id
			WHERE ct.clip_id = c.id AND t.slug = %s
		)`, utils.SQLPlaceholder(argIndex)))
		args = append(args, *filters.Tag)
		argIndex++
	}

	if filters.Search != nil && *filters.Search != "" {
		whereClauses = append(whereClauses, fmt.Sprintf("c.title ILIKE %s", utils.SQLPlaceholder(argIndex)))
		args = append(args, "%"+*filters.Search+"%")
		argIndex++
	}

	if filters.Language != nil && *filters.Language != "" {
		placeholder := utils.SQLPlaceholder(argIndex)
		whereClauses = append(whereClauses, fmt.Sprintf("(c.language = %s OR c.language = split_part(%s, '-', 1) OR c.language IS NULL OR c.language = '')", placeholder, placeholder))
		args = append(args, *filters.Language)
		argIndex++
	}

	// Filter by top 10k streamers if requested
	if filters.Top10kStreamers {
		whereClauses = append(whereClauses, `EXISTS (
			SELECT 1 FROM top_streamers ts
			WHERE ts.broadcaster_id = c.broadcaster_id
		)`)
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

	// Add timeframe for discussed (recent clips only, optional)
	if filters.Sort == "discussed" && filters.Timeframe != nil {
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
	case "discussed":
		// Discussed: clips with most comments, breaking ties by creation date
		orderBy = "ORDER BY c.comment_count DESC, c.created_at DESC"
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
			c.favorite_count, c.is_featured, c.is_nsfw, c.is_removed, c.removed_reason, c.is_hidden
		FROM clips c
		%s
		%s
		LIMIT %s OFFSET %s
	`, whereClause, orderBy, utils.SQLPlaceholder(argIndex), utils.SQLPlaceholder(argIndex+1))

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
			&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason, &clip.IsHidden,
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

// IncrementViewCount atomically increments the view count for a clip and returns the new count
func (r *ClipRepository) IncrementViewCount(ctx context.Context, clipID uuid.UUID) (int64, error) {
	query := `
		UPDATE clips
		SET view_count = view_count + 1
		WHERE id = $1
		RETURNING view_count
	`

	var newViewCount int64
	err := r.pool.QueryRow(ctx, query, clipID).Scan(&newViewCount)
	if err != nil {
		return 0, fmt.Errorf("failed to increment view count: %w", err)
	}

	return newViewCount, nil
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
		setClauses = append(setClauses, fmt.Sprintf("%s = %s", field, utils.SQLPlaceholder(argIndex)))
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
	query := fmt.Sprintf("UPDATE clips SET %s WHERE id = %s", setClause, utils.SQLPlaceholder(argIndex))

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
	// Note: HotClipsMaterializedView is a compile-time constant, not user input,
	// so this is safe from SQL injection. PostgreSQL does not support parameterized
	// table/view names in DDL statements like REFRESH MATERIALIZED VIEW.
	query := fmt.Sprintf("REFRESH MATERIALIZED VIEW CONCURRENTLY %s", HotClipsMaterializedView)

	_, err := r.pool.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to refresh hot scores: %w", err)
	}

	return nil
}

// UpsertTopStreamer inserts or updates a top streamer record
func (r *ClipRepository) UpsertTopStreamer(ctx context.Context, broadcasterID, broadcasterName string, rank int, followerCount, viewCount int64) error {
	query := `
		INSERT INTO top_streamers (broadcaster_id, broadcaster_name, rank, follower_count, view_count, last_updated)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (broadcaster_id)
		DO UPDATE SET
			broadcaster_name = EXCLUDED.broadcaster_name,
			rank = EXCLUDED.rank,
			follower_count = EXCLUDED.follower_count,
			view_count = EXCLUDED.view_count,
			last_updated = NOW()
	`

	_, err := r.pool.Exec(ctx, query, broadcasterID, broadcasterName, rank, followerCount, viewCount)
	if err != nil {
		return fmt.Errorf("failed to upsert top streamer: %w", err)
	}

	return nil
}

// ClearTopStreamers clears all top streamer records (useful before bulk insert)
func (r *ClipRepository) ClearTopStreamers(ctx context.Context) error {
	query := `TRUNCATE TABLE top_streamers`

	_, err := r.pool.Exec(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to clear top streamers: %w", err)
	}

	return nil
}

// GetTopStreamersCount returns the count of top streamers in the database
func (r *ClipRepository) GetTopStreamersCount(ctx context.Context) (int, error) {
	query := `SELECT COUNT(*) FROM top_streamers`

	var count int
	err := r.pool.QueryRow(ctx, query).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to count top streamers: %w", err)
	}

	return count, nil
}

// IsTopStreamer checks if a broadcaster is in the top streamers list
func (r *ClipRepository) IsTopStreamer(ctx context.Context, broadcasterID string) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM top_streamers WHERE broadcaster_id = $1)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, broadcasterID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check top streamer status: %w", err)
	}

	return exists, nil
}

// GetByIDs retrieves clips by their IDs, maintaining the order of the provided IDs
func (r *ClipRepository) GetByIDs(ctx context.Context, clipIDs []uuid.UUID) ([]models.Clip, error) {
	if len(clipIDs) == 0 {
		return []models.Clip{}, nil
	}

	query := `
		SELECT
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, creator_id, broadcaster_name, broadcaster_id,
			game_id, game_name, language, thumbnail_url, duration,
			view_count, created_at, imported_at, vote_score, comment_count,
			favorite_count, is_featured, is_nsfw, is_removed, removed_reason
		FROM clips
		WHERE id = ANY($1)
	`

	rows, err := r.pool.Query(ctx, query, clipIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to query clips by IDs: %w", err)
	}
	defer rows.Close()

	// Create a map to store clips by ID
	clipMap := make(map[uuid.UUID]models.Clip)
	for rows.Next() {
		var clip models.Clip
		if err := rows.Scan(
			&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL,
			&clip.Title, &clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName,
			&clip.BroadcasterID, &clip.GameID, &clip.GameName, &clip.Language,
			&clip.ThumbnailURL, &clip.Duration, &clip.ViewCount, &clip.CreatedAt,
			&clip.ImportedAt, &clip.VoteScore, &clip.CommentCount, &clip.FavoriteCount,
			&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason,
		); err != nil {
			return nil, fmt.Errorf("failed to scan clip: %w", err)
		}
		clipMap[clip.ID] = clip
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating clips: %w", err)
	}

	// Maintain the order of the provided IDs
	clips := make([]models.Clip, 0, len(clipIDs))
	for _, id := range clipIDs {
		if clip, ok := clipMap[id]; ok {
			clips = append(clips, clip)
		}
	}

	return clips, nil
}

// ListForSitemap retrieves all non-removed clips with minimal info for sitemap generation
// Limits to 10,000 clips to keep sitemap size manageable (Google's recommended limit is 50,000 URLs).
// For sites with more clips, consider implementing a sitemap index with multiple sitemap files.
// Returns clips ordered by creation date (newest first).
func (r *ClipRepository) ListForSitemap(ctx context.Context) ([]models.Clip, error) {
	query := `
		SELECT id, created_at
		FROM clips
		WHERE is_removed = false
		ORDER BY created_at DESC
		LIMIT 10000
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list clips for sitemap: %w", err)
	}
	defer rows.Close()

	var clips []models.Clip
	for rows.Next() {
		var clip models.Clip
		if err := rows.Scan(&clip.ID, &clip.CreatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan clip: %w", err)
		}
		clips = append(clips, clip)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating clips: %w", err)
	}

	return clips, nil
}

// ListClipsByBroadcaster retrieves clips for a specific broadcaster with pagination and sorting
func (r *ClipRepository) ListClipsByBroadcaster(ctx context.Context, broadcasterID, sort string, limit, offset int) ([]models.Clip, int, error) {
	// Get total count
	countQuery := `
		SELECT COUNT(*)
		FROM clips
		WHERE broadcaster_id = $1 AND is_removed = false
	`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, broadcasterID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count broadcaster clips: %w", err)
	}

	// Build order by clause based on sort parameter
	orderBy := "created_at DESC" // default: recent
	switch sort {
	case "popular":
		orderBy = "vote_score DESC, created_at DESC"
	case "trending":
		// Sort by popularity with recency tiebreaker (not true trending/hot score)
		orderBy = "vote_score DESC, view_count DESC, created_at DESC"
	}

	// Get clips
	query := fmt.Sprintf(`
		SELECT
			id, twitch_clip_id, twitch_clip_url, embed_url, title,
			creator_name, creator_id, broadcaster_name, broadcaster_id,
			game_id, game_name, language, thumbnail_url, duration,
			view_count, created_at, imported_at, vote_score, comment_count,
			favorite_count, is_featured, is_nsfw, is_removed, removed_reason, is_hidden,
			submitted_by_user_id, submitted_at
		FROM clips
		WHERE broadcaster_id = $1 AND is_removed = false
		ORDER BY %s
		LIMIT $2 OFFSET $3
	`, orderBy)

	rows, err := r.pool.Query(ctx, query, broadcasterID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list broadcaster clips: %w", err)
	}
	defer rows.Close()

	var clips []models.Clip
	for rows.Next() {
		var clip models.Clip
		if err := rows.Scan(
			&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL,
			&clip.Title, &clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName,
			&clip.BroadcasterID, &clip.GameID, &clip.GameName, &clip.Language,
			&clip.ThumbnailURL, &clip.Duration, &clip.ViewCount, &clip.CreatedAt,
			&clip.ImportedAt, &clip.VoteScore, &clip.CommentCount, &clip.FavoriteCount,
			&clip.IsFeatured, &clip.IsNSFW, &clip.IsRemoved, &clip.RemovedReason, &clip.IsHidden,
			&clip.SubmittedByUserID, &clip.SubmittedAt,
		); err != nil {
			return nil, 0, fmt.Errorf("failed to scan clip: %w", err)
		}
		clips = append(clips, clip)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating clips: %w", err)
	}

	return clips, total, nil
}

// UpdateMetadata updates the title of a clip
func (r *ClipRepository) UpdateMetadata(ctx context.Context, clipID uuid.UUID, title *string) error {
	// Whitelist of allowed fields for metadata update
	allowedFields := map[string]struct{}{
		"title": {},
	}

	updates := make(map[string]interface{})
	if title != nil {
		updates["title"] = *title
	}

	// Filter updates to only include allowed fields
	filteredUpdates := make(map[string]interface{})
	for field, value := range updates {
		if _, ok := allowedFields[field]; ok {
			filteredUpdates[field] = value
		}
	}

	if len(filteredUpdates) == 0 {
		return nil
	}

	return r.Update(ctx, clipID, filteredUpdates)
}

// UpdateVisibility updates the visibility status of a clip
func (r *ClipRepository) UpdateVisibility(ctx context.Context, clipID uuid.UUID, isHidden bool) error {
	query := `
UPDATE clips
SET is_hidden = $2
WHERE id = $1
`

	_, err := r.pool.Exec(ctx, query, clipID, isHidden)
	if err != nil {
		return fmt.Errorf("failed to update clip visibility: %w", err)
	}

	return nil
}
