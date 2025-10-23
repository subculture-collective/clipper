package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

// FavoriteRepository handles database operations for favorites
type FavoriteRepository struct {
	pool *pgxpool.Pool
}

// NewFavoriteRepository creates a new FavoriteRepository
func NewFavoriteRepository(pool *pgxpool.Pool) *FavoriteRepository {
	return &FavoriteRepository{
		pool: pool,
	}
}

// Create adds a clip to favorites
func (r *FavoriteRepository) Create(ctx context.Context, userID, clipID uuid.UUID) error {
	query := `
		INSERT INTO favorites (user_id, clip_id)
		VALUES ($1, $2)
		ON CONFLICT (user_id, clip_id) DO NOTHING
	`

	_, err := r.pool.Exec(ctx, query, userID, clipID)
	if err != nil {
		return fmt.Errorf("failed to create favorite: %w", err)
	}

	return nil
}

// Delete removes a clip from favorites
func (r *FavoriteRepository) Delete(ctx context.Context, userID, clipID uuid.UUID) error {
	query := `DELETE FROM favorites WHERE user_id = $1 AND clip_id = $2`

	_, err := r.pool.Exec(ctx, query, userID, clipID)
	if err != nil {
		return fmt.Errorf("failed to delete favorite: %w", err)
	}

	return nil
}

// IsFavorited checks if a user has favorited a clip
func (r *FavoriteRepository) IsFavorited(ctx context.Context, userID, clipID uuid.UUID) (bool, error) {
	query := `SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND clip_id = $2)`

	var exists bool
	err := r.pool.QueryRow(ctx, query, userID, clipID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("failed to check favorite status: %w", err)
	}

	return exists, nil
}

// GetByUserID retrieves all favorites for a user
func (r *FavoriteRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit, offset int) ([]models.Favorite, error) {
	query := `
		SELECT id, user_id, clip_id, created_at
		FROM favorites
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := r.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get favorites: %w", err)
	}
	defer rows.Close()

	var favorites []models.Favorite
	for rows.Next() {
		var fav models.Favorite
		err := rows.Scan(&fav.ID, &fav.UserID, &fav.ClipID, &fav.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan favorite: %w", err)
		}
		favorites = append(favorites, fav)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating favorites: %w", err)
	}

	return favorites, nil
}

// GetByID retrieves a favorite by ID
func (r *FavoriteRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Favorite, error) {
	query := `
		SELECT id, user_id, clip_id, created_at
		FROM favorites
		WHERE id = $1
	`

	var fav models.Favorite
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&fav.ID, &fav.UserID, &fav.ClipID, &fav.CreatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("failed to get favorite: %w", err)
	}

	return &fav, nil
}
