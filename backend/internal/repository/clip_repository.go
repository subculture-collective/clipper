package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
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
