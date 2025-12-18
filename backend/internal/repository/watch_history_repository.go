package repository

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

// WatchHistoryRepository handles database operations for watch history
type WatchHistoryRepository struct {
	pool *pgxpool.Pool
}

// NewWatchHistoryRepository creates a new watch history repository
func NewWatchHistoryRepository(pool *pgxpool.Pool) *WatchHistoryRepository {
	return &WatchHistoryRepository{pool: pool}
}

// RecordWatchProgress records or updates watch progress for a clip
func (r *WatchHistoryRepository) RecordWatchProgress(ctx context.Context, userID, clipID uuid.UUID, progressSeconds, durationSeconds int, sessionID string) error {
	// Guard against division by zero
	if durationSeconds <= 0 {
		return fmt.Errorf("duration_seconds must be greater than 0")
	}

	// Determine if completed (>90% watched)
	progressPercent := float64(progressSeconds) / float64(durationSeconds)
	completed := progressPercent >= 0.9

	query := `
		INSERT INTO watch_history (user_id, clip_id, progress_seconds, duration_seconds, completed, session_id, watched_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (user_id, clip_id) 
		DO UPDATE SET 
			progress_seconds = EXCLUDED.progress_seconds,
			duration_seconds = EXCLUDED.duration_seconds,
			completed = EXCLUDED.completed,
			session_id = EXCLUDED.session_id,
			watched_at = NOW(),
			updated_at = NOW()
	`

	_, err := r.pool.Exec(ctx, query, userID, clipID, progressSeconds, durationSeconds, completed, sessionID)
	return err
}

// GetWatchHistory retrieves watch history for a user with optional filters
func (r *WatchHistoryRepository) GetWatchHistory(ctx context.Context, userID uuid.UUID, filterType string, limit int) ([]models.WatchHistoryEntry, error) {
	if limit <= 0 {
		limit = 50
	}

	var whereClause string
	switch filterType {
	case "completed":
		whereClause = "AND wh.completed = TRUE"
	case "in-progress":
		whereClause = "AND wh.completed = FALSE AND wh.progress_seconds > 0"
	default:
		whereClause = ""
	}

	query := fmt.Sprintf(`
		SELECT wh.id, wh.user_id, wh.clip_id, wh.progress_seconds, wh.duration_seconds, 
		       wh.completed, wh.session_id, wh.watched_at, wh.created_at, wh.updated_at,
		       c.id, c.twitch_clip_id, c.twitch_clip_url, c.embed_url, c.title, 
		       c.creator_name, c.creator_id, c.broadcaster_name, c.broadcaster_id,
		       c.game_id, c.game_name, c.language, c.thumbnail_url, c.duration,
		       c.view_count, c.created_at, c.imported_at, c.vote_score,
		       c.comment_count, c.favorite_count, c.is_featured, c.is_nsfw,
		       c.is_removed, c.removed_reason
		FROM watch_history wh
		LEFT JOIN clips c ON wh.clip_id = c.id
		WHERE wh.user_id = $1 %s
		ORDER BY wh.watched_at DESC
		LIMIT $2
	`, whereClause)

	rows, err := r.pool.Query(ctx, query, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var history []models.WatchHistoryEntry
	for rows.Next() {
		var entry models.WatchHistoryEntry
		var clip models.Clip

		err := rows.Scan(
			&entry.ID, &entry.UserID, &entry.ClipID, &entry.ProgressSeconds, &entry.DurationSeconds,
			&entry.Completed, &entry.SessionID, &entry.WatchedAt, &entry.CreatedAt, &entry.UpdatedAt,
			&clip.ID, &clip.TwitchClipID, &clip.TwitchClipURL, &clip.EmbedURL, &clip.Title,
			&clip.CreatorName, &clip.CreatorID, &clip.BroadcasterName, &clip.BroadcasterID,
			&clip.GameID, &clip.GameName, &clip.Language, &clip.ThumbnailURL, &clip.Duration,
			&clip.ViewCount, &clip.CreatedAt, &clip.ImportedAt, &clip.VoteScore,
			&clip.CommentCount, &clip.FavoriteCount, &clip.IsFeatured, &clip.IsNSFW,
			&clip.IsRemoved, &clip.RemovedReason,
		)
		if err != nil {
			return nil, err
		}

		entry.Clip = &clip
		entry.ProgressPercent = float64(entry.ProgressSeconds) / float64(entry.DurationSeconds) * 100
		history = append(history, entry)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return history, nil
}

// GetResumePosition gets the resume position for a specific clip
func (r *WatchHistoryRepository) GetResumePosition(ctx context.Context, userID, clipID uuid.UUID) (int, bool, error) {
	var progressSeconds int
	var completed bool

	query := `
		SELECT progress_seconds, completed
		FROM watch_history
		WHERE user_id = $1 AND clip_id = $2
	`

	err := r.pool.QueryRow(ctx, query, userID, clipID).Scan(&progressSeconds, &completed)
	if err == sql.ErrNoRows {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}

	return progressSeconds, completed, nil
}

// ClearWatchHistory deletes all watch history for a user
func (r *WatchHistoryRepository) ClearWatchHistory(ctx context.Context, userID uuid.UUID) error {
	query := `DELETE FROM watch_history WHERE user_id = $1`
	_, err := r.pool.Exec(ctx, query, userID)
	return err
}

// IsWatchHistoryEnabled checks if watch history tracking is enabled for a user
func (r *WatchHistoryRepository) IsWatchHistoryEnabled(ctx context.Context, userID uuid.UUID) (bool, error) {
	var enabled bool
	query := `SELECT watch_history_enabled FROM users WHERE id = $1`
	err := r.pool.QueryRow(ctx, query, userID).Scan(&enabled)
	if err != nil {
		return false, err
	}
	return enabled, nil
}
