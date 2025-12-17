package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

// PlaylistRepository handles database operations for playlists
type PlaylistRepository struct {
	pool *pgxpool.Pool
}

// NewPlaylistRepository creates a new PlaylistRepository
func NewPlaylistRepository(pool *pgxpool.Pool) *PlaylistRepository {
	return &PlaylistRepository{
		pool: pool,
	}
}

// Create creates a new playlist
func (r *PlaylistRepository) Create(ctx context.Context, playlist *models.Playlist) error {
	query := `
		INSERT INTO playlists (id, user_id, title, description, cover_url, visibility)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING created_at, updated_at
	`

	err := r.pool.QueryRow(ctx, query,
		playlist.ID,
		playlist.UserID,
		playlist.Title,
		playlist.Description,
		playlist.CoverURL,
		playlist.Visibility,
	).Scan(&playlist.CreatedAt, &playlist.UpdatedAt)

	if err != nil {
		return fmt.Errorf("failed to create playlist: %w", err)
	}

	return nil
}

// GetByID retrieves a playlist by its ID
func (r *PlaylistRepository) GetByID(ctx context.Context, playlistID uuid.UUID) (*models.Playlist, error) {
	query := `
		SELECT id, user_id, title, description, cover_url, visibility, like_count,
		       created_at, updated_at, deleted_at
		FROM playlists
		WHERE id = $1 AND deleted_at IS NULL
	`

	var playlist models.Playlist
	err := r.pool.QueryRow(ctx, query, playlistID).Scan(
		&playlist.ID,
		&playlist.UserID,
		&playlist.Title,
		&playlist.Description,
		&playlist.CoverURL,
		&playlist.Visibility,
		&playlist.LikeCount,
		&playlist.CreatedAt,
		&playlist.UpdatedAt,
		&playlist.DeletedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get playlist: %w", err)
	}

	return &playlist, nil
}

// Update updates a playlist
func (r *PlaylistRepository) Update(ctx context.Context, playlist *models.Playlist) error {
	query := `
		UPDATE playlists
		SET title = $1, description = $2, cover_url = $3, visibility = $4
		WHERE id = $5 AND deleted_at IS NULL
		RETURNING updated_at
	`

	err := r.pool.QueryRow(ctx, query,
		playlist.Title,
		playlist.Description,
		playlist.CoverURL,
		playlist.Visibility,
		playlist.ID,
	).Scan(&playlist.UpdatedAt)

	if err == pgx.ErrNoRows {
		return fmt.Errorf("playlist not found")
	}
	if err != nil {
		return fmt.Errorf("failed to update playlist: %w", err)
	}

	return nil
}

// SoftDelete soft deletes a playlist
func (r *PlaylistRepository) SoftDelete(ctx context.Context, playlistID uuid.UUID) error {
	query := `
		UPDATE playlists
		SET deleted_at = $1
		WHERE id = $2 AND deleted_at IS NULL
	`

	result, err := r.pool.Exec(ctx, query, time.Now(), playlistID)
	if err != nil {
		return fmt.Errorf("failed to delete playlist: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("playlist not found")
	}

	return nil
}

// ListByUserID retrieves playlists owned by a user
func (r *PlaylistRepository) ListByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]*models.Playlist, int, error) {
	// Get total count
	countQuery := `
		SELECT COUNT(*)
		FROM playlists
		WHERE user_id = $1 AND deleted_at IS NULL
	`

	var total int
	err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count playlists: %w", err)
	}

	// Get playlists
	query := `
		SELECT id, user_id, title, description, cover_url, visibility, like_count,
		       created_at, updated_at, deleted_at
		FROM playlists
		WHERE user_id = $1 AND deleted_at IS NULL
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list playlists: %w", err)
	}
	defer rows.Close()

	var playlists []*models.Playlist
	for rows.Next() {
		var playlist models.Playlist
		err := rows.Scan(
			&playlist.ID,
			&playlist.UserID,
			&playlist.Title,
			&playlist.Description,
			&playlist.CoverURL,
			&playlist.Visibility,
			&playlist.LikeCount,
			&playlist.CreatedAt,
			&playlist.UpdatedAt,
			&playlist.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan playlist: %w", err)
		}
		playlists = append(playlists, &playlist)
	}

	return playlists, total, nil
}

// ListPublic retrieves public playlists for discovery
func (r *PlaylistRepository) ListPublic(ctx context.Context, limit, offset int) ([]*models.Playlist, int, error) {
	// Get total count
	countQuery := `
		SELECT COUNT(*)
		FROM playlists
		WHERE visibility = 'public' AND deleted_at IS NULL
	`

	var total int
	err := r.pool.QueryRow(ctx, countQuery).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count public playlists: %w", err)
	}

	// Get playlists
	query := `
		SELECT id, user_id, title, description, cover_url, visibility, like_count,
		       created_at, updated_at, deleted_at
		FROM playlists
		WHERE visibility = 'public' AND deleted_at IS NULL
		ORDER BY like_count DESC, created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list public playlists: %w", err)
	}
	defer rows.Close()

	var playlists []*models.Playlist
	for rows.Next() {
		var playlist models.Playlist
		err := rows.Scan(
			&playlist.ID,
			&playlist.UserID,
			&playlist.Title,
			&playlist.Description,
			&playlist.CoverURL,
			&playlist.Visibility,
			&playlist.LikeCount,
			&playlist.CreatedAt,
			&playlist.UpdatedAt,
			&playlist.DeletedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan playlist: %w", err)
		}
		playlists = append(playlists, &playlist)
	}

	return playlists, total, nil
}

// AddClip adds a clip to a playlist
func (r *PlaylistRepository) AddClip(ctx context.Context, playlistID, clipID uuid.UUID, orderIndex int) error {
	query := `
		INSERT INTO playlist_items (playlist_id, clip_id, order_index)
		VALUES ($1, $2, $3)
		ON CONFLICT (playlist_id, clip_id) DO NOTHING
	`

	_, err := r.pool.Exec(ctx, query, playlistID, clipID, orderIndex)
	if err != nil {
		return fmt.Errorf("failed to add clip to playlist: %w", err)
	}

	return nil
}

// RemoveClip removes a clip from a playlist
func (r *PlaylistRepository) RemoveClip(ctx context.Context, playlistID, clipID uuid.UUID) error {
	query := `
		DELETE FROM playlist_items
		WHERE playlist_id = $1 AND clip_id = $2
	`

	result, err := r.pool.Exec(ctx, query, playlistID, clipID)
	if err != nil {
		return fmt.Errorf("failed to remove clip from playlist: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("clip not found in playlist")
	}

	return nil
}

// GetClips retrieves clips in a playlist with pagination
func (r *PlaylistRepository) GetClips(ctx context.Context, playlistID uuid.UUID, limit, offset int) ([]models.PlaylistClipRef, int, error) {
	// Get total count
	countQuery := `
		SELECT COUNT(*)
		FROM playlist_items
		WHERE playlist_id = $1
	`

	var total int
	err := r.pool.QueryRow(ctx, countQuery, playlistID).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count clips: %w", err)
	}

	// Get clips
	query := `
		SELECT 
			c.id, c.twitch_clip_id, c.twitch_clip_url, c.embed_url, c.title,
			c.creator_name, c.creator_id, c.broadcaster_name, c.broadcaster_id,
			c.game_id, c.game_name, c.language, c.thumbnail_url, c.duration,
			c.view_count, c.created_at, c.imported_at, c.vote_score,
			c.comment_count, c.favorite_count, c.is_featured, c.is_nsfw,
			c.is_removed, c.removed_reason, c.is_hidden,
			c.submitted_by_user_id, c.submitted_at,
			c.trending_score, c.hot_score, c.popularity_index, c.engagement_count,
			c.dmca_removed, c.dmca_notice_id, c.dmca_removed_at, c.dmca_reinstated_at,
			pi.order_index
		FROM playlist_items pi
		JOIN clips c ON pi.clip_id = c.id
		WHERE pi.playlist_id = $1
		ORDER BY pi.order_index ASC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.pool.Query(ctx, query, playlistID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get clips: %w", err)
	}
	defer rows.Close()

	var clips []models.PlaylistClipRef
	for rows.Next() {
		var clipRef models.PlaylistClipRef
		err := rows.Scan(
			&clipRef.ID,
			&clipRef.TwitchClipID,
			&clipRef.TwitchClipURL,
			&clipRef.EmbedURL,
			&clipRef.Title,
			&clipRef.CreatorName,
			&clipRef.CreatorID,
			&clipRef.BroadcasterName,
			&clipRef.BroadcasterID,
			&clipRef.GameID,
			&clipRef.GameName,
			&clipRef.Language,
			&clipRef.ThumbnailURL,
			&clipRef.Duration,
			&clipRef.ViewCount,
			&clipRef.CreatedAt,
			&clipRef.ImportedAt,
			&clipRef.VoteScore,
			&clipRef.CommentCount,
			&clipRef.FavoriteCount,
			&clipRef.IsFeatured,
			&clipRef.IsNSFW,
			&clipRef.IsRemoved,
			&clipRef.RemovedReason,
			&clipRef.IsHidden,
			&clipRef.SubmittedByUserID,
			&clipRef.SubmittedAt,
			&clipRef.TrendingScore,
			&clipRef.HotScore,
			&clipRef.PopularityIndex,
			&clipRef.EngagementCount,
			&clipRef.DMCARemoved,
			&clipRef.DMCANoticeID,
			&clipRef.DMCARemovedAt,
			&clipRef.DMCAReinstatedAt,
			&clipRef.OrderIndex,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan clip: %w", err)
		}
		clips = append(clips, clipRef)
	}

	return clips, total, nil
}

// GetClipCount returns the number of clips in a playlist
func (r *PlaylistRepository) GetClipCount(ctx context.Context, playlistID uuid.UUID) (int, error) {
	query := `
		SELECT COUNT(*)
		FROM playlist_items
		WHERE playlist_id = $1
	`

	var count int
	err := r.pool.QueryRow(ctx, query, playlistID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get clip count: %w", err)
	}

	return count, nil
}

// HasClip checks if a clip is already in a playlist
func (r *PlaylistRepository) HasClip(ctx context.Context, playlistID, clipID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM playlist_items
			WHERE playlist_id = $1 AND clip_id = $2
		)
	`

	var exists bool
	err := r.pool.QueryRow(ctx, query, playlistID, clipID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check clip existence: %w", err)
	}

	return exists, nil
}

// ReorderClips updates the order of clips in a playlist
func (r *PlaylistRepository) ReorderClips(ctx context.Context, playlistID uuid.UUID, clipIDs []uuid.UUID) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	query := `
		UPDATE playlist_items
		SET order_index = $1
		WHERE playlist_id = $2 AND clip_id = $3
	`

	for i, clipID := range clipIDs {
		_, err := tx.Exec(ctx, query, i, playlistID, clipID)
		if err != nil {
			return fmt.Errorf("failed to update order for clip %s: %w", clipID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// LikePlaylist adds a like to a playlist
func (r *PlaylistRepository) LikePlaylist(ctx context.Context, userID, playlistID uuid.UUID) error {
	query := `
		INSERT INTO playlist_likes (user_id, playlist_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, playlist_id) DO NOTHING
	`

	_, err := r.pool.Exec(ctx, query, userID, playlistID)
	if err != nil {
		return fmt.Errorf("failed to like playlist: %w", err)
	}

	return nil
}

// UnlikePlaylist removes a like from a playlist
func (r *PlaylistRepository) UnlikePlaylist(ctx context.Context, userID, playlistID uuid.UUID) error {
	query := `
		DELETE FROM playlist_likes
		WHERE user_id = $1 AND playlist_id = $2
	`

	_, err := r.pool.Exec(ctx, query, userID, playlistID)
	if err != nil {
		return fmt.Errorf("failed to unlike playlist: %w", err)
	}

	return nil
}

// IsLiked checks if a user has liked a playlist
func (r *PlaylistRepository) IsLiked(ctx context.Context, userID, playlistID uuid.UUID) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM playlist_likes
			WHERE user_id = $1 AND playlist_id = $2
		)
	`

	var liked bool
	err := r.pool.QueryRow(ctx, query, userID, playlistID).Scan(&liked)
	if err != nil {
		return false, fmt.Errorf("failed to check if liked: %w", err)
	}

	return liked, nil
}

// GetCreator retrieves the creator of a playlist
func (r *PlaylistRepository) GetCreator(ctx context.Context, userID uuid.UUID) (*models.User, error) {
	query := `
		SELECT id, username, display_name, avatar_url
		FROM users
		WHERE id = $1
	`

	var user models.User
	err := r.pool.QueryRow(ctx, query, userID).Scan(
		&user.ID,
		&user.Username,
		&user.DisplayName,
		&user.AvatarURL,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get creator: %w", err)
	}

	return &user, nil
}
