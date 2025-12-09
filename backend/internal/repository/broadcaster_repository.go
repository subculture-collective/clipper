package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

// BroadcasterRepository handles database operations for broadcasters
type BroadcasterRepository struct {
	pool *pgxpool.Pool
}

// NewBroadcasterRepository creates a new broadcaster repository
func NewBroadcasterRepository(pool *pgxpool.Pool) *BroadcasterRepository {
	return &BroadcasterRepository{pool: pool}
}

// FollowBroadcaster adds a follow relationship between a user and broadcaster
func (r *BroadcasterRepository) FollowBroadcaster(ctx context.Context, userID uuid.UUID, broadcasterID, broadcasterName string) error {
	query := `
		INSERT INTO broadcaster_follows (user_id, broadcaster_id, broadcaster_name)
		VALUES ($1, $2, $3)
		ON CONFLICT (user_id, broadcaster_id) DO NOTHING
	`
	_, err := r.pool.Exec(ctx, query, userID, broadcasterID, broadcasterName)
	if err != nil {
		return fmt.Errorf("failed to follow broadcaster: %w", err)
	}
	return nil
}

// UnfollowBroadcaster removes a follow relationship between a user and broadcaster
func (r *BroadcasterRepository) UnfollowBroadcaster(ctx context.Context, userID uuid.UUID, broadcasterID string) error {
	query := `
		DELETE FROM broadcaster_follows
		WHERE user_id = $1 AND broadcaster_id = $2
	`
	result, err := r.pool.Exec(ctx, query, userID, broadcasterID)
	if err != nil {
		return fmt.Errorf("failed to unfollow broadcaster: %w", err)
	}
	if result.RowsAffected() == 0 {
		return errors.New("follow relationship not found")
	}
	return nil
}

// IsFollowing checks if a user is following a broadcaster
func (r *BroadcasterRepository) IsFollowing(ctx context.Context, userID uuid.UUID, broadcasterID string) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM broadcaster_follows
			WHERE user_id = $1 AND broadcaster_id = $2
		)
	`
	var exists bool
	err := r.pool.QueryRow(ctx, query, userID, broadcasterID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check follow status: %w", err)
	}
	return exists, nil
}

// GetFollowerCount returns the number of followers for a broadcaster
func (r *BroadcasterRepository) GetFollowerCount(ctx context.Context, broadcasterID string) (int, error) {
	query := `
		SELECT COUNT(*) FROM broadcaster_follows
		WHERE broadcaster_id = $1
	`
	var count int
	err := r.pool.QueryRow(ctx, query, broadcasterID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("failed to get follower count: %w", err)
	}
	return count, nil
}

// GetBroadcasterStats returns statistics for a broadcaster from the clips table
func (r *BroadcasterRepository) GetBroadcasterStats(ctx context.Context, broadcasterID string) (totalClips int, totalViews int64, avgVoteScore float64, err error) {
	query := `
		SELECT 
			COUNT(*) as total_clips,
			COALESCE(SUM(view_count), 0) as total_views,
			COALESCE(AVG(vote_score), 0) as avg_vote_score
		FROM clips
		WHERE broadcaster_id = $1 AND is_removed = false
	`
	err = r.pool.QueryRow(ctx, query, broadcasterID).Scan(&totalClips, &totalViews, &avgVoteScore)
	if err != nil && err != pgx.ErrNoRows {
		return 0, 0, 0, fmt.Errorf("failed to get broadcaster stats: %w", err)
	}
	return totalClips, totalViews, avgVoteScore, nil
}

// GetBroadcasterByName returns broadcaster info from clips (since we don't have a separate broadcaster table)
func (r *BroadcasterRepository) GetBroadcasterByName(ctx context.Context, broadcasterName string) (broadcasterID, displayName string, err error) {
	query := `
		SELECT broadcaster_id, broadcaster_name
		FROM clips
		WHERE broadcaster_name = $1
		LIMIT 1
	`
	err = r.pool.QueryRow(ctx, query, broadcasterName).Scan(&broadcasterID, &displayName)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", "", sql.ErrNoRows
		}
		return "", "", fmt.Errorf("failed to get broadcaster by name: %w", err)
	}
	return broadcasterID, displayName, nil
}

// GetBroadcasterByID returns broadcaster info from clips
func (r *BroadcasterRepository) GetBroadcasterByID(ctx context.Context, broadcasterID string) (broadcasterName, displayName string, err error) {
	query := `
		SELECT broadcaster_name
		FROM clips
		WHERE broadcaster_id = $1
		LIMIT 1
	`
	err = r.pool.QueryRow(ctx, query, broadcasterID).Scan(&broadcasterName)
	if err != nil {
		if err == pgx.ErrNoRows {
			return "", "", sql.ErrNoRows
		}
		return "", "", fmt.Errorf("failed to get broadcaster by id: %w", err)
	}
	// Display name will be fetched from Twitch API in the handler
	return broadcasterName, broadcasterName, nil
}

// ListUserFollows returns all broadcasters a user is following
func (r *BroadcasterRepository) ListUserFollows(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.BroadcasterFollow, int, error) {
	// Get total count
	countQuery := `SELECT COUNT(*) FROM broadcaster_follows WHERE user_id = $1`
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count user follows: %w", err)
	}

	// Get paginated results
	query := `
		SELECT id, user_id, broadcaster_id, broadcaster_name, created_at
		FROM broadcaster_follows
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list user follows: %w", err)
	}
	defer rows.Close()

	var follows []models.BroadcasterFollow
	for rows.Next() {
		var follow models.BroadcasterFollow
		if err := rows.Scan(&follow.ID, &follow.UserID, &follow.BroadcasterID, &follow.BroadcasterName, &follow.CreatedAt); err != nil {
			return nil, 0, fmt.Errorf("failed to scan follow: %w", err)
		}
		follows = append(follows, follow)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating follows: %w", err)
	}

	return follows, total, nil
}
