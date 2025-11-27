package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PresetProfile struct {
	ID              uuid.UUID  `json:"id"`
	Name            string     `json:"name"`
	Description     *string    `json:"description,omitempty"`
	VoteWeight      float64    `json:"vote_weight"`
	CommentWeight   float64    `json:"comment_weight"`
	FavoriteWeight  float64    `json:"favorite_weight"`
	ViewWeight      float64    `json:"view_weight"`
	IsSystem        bool       `json:"is_system"`
	CreatedBy       *uuid.UUID `json:"created_by,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedBy       *uuid.UUID `json:"updated_by,omitempty"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type PresetProfileRepository struct {
	db *pgxpool.Pool
}

func NewPresetProfileRepository(db *pgxpool.Pool) *PresetProfileRepository {
	return &PresetProfileRepository{db: db}
}

func (r *PresetProfileRepository) List(ctx context.Context) ([]PresetProfile, error) {
	query := `
		SELECT id, name, description, vote_weight, comment_weight, favorite_weight, view_weight,
		       is_system, created_by, created_at, updated_by, updated_at
		FROM preset_profiles
		ORDER BY is_system DESC, name ASC
	`

	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list preset profiles: %w", err)
	}
	defer rows.Close()

	var profiles []PresetProfile
	for rows.Next() {
		var p PresetProfile
		if err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.VoteWeight, &p.CommentWeight,
			&p.FavoriteWeight, &p.ViewWeight, &p.IsSystem, &p.CreatedBy, &p.CreatedAt,
			&p.UpdatedBy, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to scan preset profile: %w", err)
		}
		profiles = append(profiles, p)
	}

	return profiles, rows.Err()
}

func (r *PresetProfileRepository) Get(ctx context.Context, id uuid.UUID) (*PresetProfile, error) {
	query := `
		SELECT id, name, description, vote_weight, comment_weight, favorite_weight, view_weight,
		       is_system, created_by, created_at, updated_by, updated_at
		FROM preset_profiles
		WHERE id = $1
	`

	var p PresetProfile
	if err := r.db.QueryRow(ctx, query, id).Scan(&p.ID, &p.Name, &p.Description, &p.VoteWeight,
		&p.CommentWeight, &p.FavoriteWeight, &p.ViewWeight, &p.IsSystem, &p.CreatedBy,
		&p.CreatedAt, &p.UpdatedBy, &p.UpdatedAt); err != nil {
		return nil, fmt.Errorf("failed to get preset profile: %w", err)
	}

	return &p, nil
}

func (r *PresetProfileRepository) Create(ctx context.Context, name string, description *string,
	voteWeight, commentWeight, favoriteWeight, viewWeight float64, createdBy uuid.UUID) (*PresetProfile, error) {

	query := `
		INSERT INTO preset_profiles (name, description, vote_weight, comment_weight, favorite_weight, view_weight, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, name, description, vote_weight, comment_weight, favorite_weight, view_weight,
		          is_system, created_by, created_at, updated_by, updated_at
	`

	var p PresetProfile
	if err := r.db.QueryRow(ctx, query, name, description, voteWeight, commentWeight, favoriteWeight,
		viewWeight, createdBy).Scan(&p.ID, &p.Name, &p.Description, &p.VoteWeight, &p.CommentWeight,
		&p.FavoriteWeight, &p.ViewWeight, &p.IsSystem, &p.CreatedBy, &p.CreatedAt, &p.UpdatedBy,
		&p.UpdatedAt); err != nil {
		return nil, fmt.Errorf("failed to create preset profile: %w", err)
	}

	return &p, nil
}

func (r *PresetProfileRepository) Update(ctx context.Context, id uuid.UUID, name string,
	description *string, voteWeight, commentWeight, favoriteWeight, viewWeight float64,
	updatedBy uuid.UUID) (*PresetProfile, error) {

	query := `
		UPDATE preset_profiles
		SET name = $1, description = $2, vote_weight = $3, comment_weight = $4,
		    favorite_weight = $5, view_weight = $6, updated_by = $7, updated_at = NOW()
		WHERE id = $8 AND is_system = FALSE
		RETURNING id, name, description, vote_weight, comment_weight, favorite_weight, view_weight,
		          is_system, created_by, created_at, updated_by, updated_at
	`

	var p PresetProfile
	if err := r.db.QueryRow(ctx, query, name, description, voteWeight, commentWeight, favoriteWeight,
		viewWeight, updatedBy, id).Scan(&p.ID, &p.Name, &p.Description, &p.VoteWeight, &p.CommentWeight,
		&p.FavoriteWeight, &p.ViewWeight, &p.IsSystem, &p.CreatedBy, &p.CreatedAt, &p.UpdatedBy,
		&p.UpdatedAt); err != nil {
		return nil, fmt.Errorf("failed to update preset profile: %w", err)
	}

	return &p, nil
}

func (r *PresetProfileRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM preset_profiles WHERE id = $1 AND is_system = FALSE`
	result, err := r.db.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete preset profile: %w", err)
	}

	if result.RowsAffected() == 0 {
		return fmt.Errorf("preset profile not found or is a system preset")
	}

	return nil
}
