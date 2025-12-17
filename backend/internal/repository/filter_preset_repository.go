package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

type FilterPresetRepository struct {
	pool *pgxpool.Pool
}

func NewFilterPresetRepository(pool *pgxpool.Pool) *FilterPresetRepository {
	return &FilterPresetRepository{pool: pool}
}

// CreatePreset creates a new filter preset for a user
func (r *FilterPresetRepository) CreatePreset(ctx context.Context, preset *models.UserFilterPreset) error {
	// Check if user already has 10 presets (max limit)
	var count int
	err := r.pool.QueryRow(ctx, 
		`SELECT COUNT(*) FROM user_filter_presets WHERE user_id = $1`,
		preset.UserID,
	).Scan(&count)
	if err != nil {
		return fmt.Errorf("failed to check preset count: %w", err)
	}
	if count >= 10 {
		return fmt.Errorf("maximum of 10 presets allowed per user")
	}

	query := `
		INSERT INTO user_filter_presets (id, user_id, name, filters_json, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, created_at, updated_at
	`
	
	return r.pool.QueryRow(ctx, query,
		preset.ID, preset.UserID, preset.Name, preset.FiltersJSON,
		preset.CreatedAt, preset.UpdatedAt,
	).Scan(&preset.ID, &preset.CreatedAt, &preset.UpdatedAt)
}

// GetPresetByID retrieves a filter preset by ID
func (r *FilterPresetRepository) GetPresetByID(ctx context.Context, presetID uuid.UUID) (*models.UserFilterPreset, error) {
	query := `
		SELECT id, user_id, name, filters_json, created_at, updated_at
		FROM user_filter_presets
		WHERE id = $1
	`
	
	preset := &models.UserFilterPreset{}
	err := r.pool.QueryRow(ctx, query, presetID).Scan(
		&preset.ID, &preset.UserID, &preset.Name, &preset.FiltersJSON,
		&preset.CreatedAt, &preset.UpdatedAt,
	)
	
	if err == pgx.ErrNoRows {
		return nil, fmt.Errorf("preset not found")
	}
	
	return preset, err
}

// GetUserPresets retrieves all filter presets for a user
func (r *FilterPresetRepository) GetUserPresets(ctx context.Context, userID uuid.UUID) ([]*models.UserFilterPreset, error) {
	query := `
		SELECT id, user_id, name, filters_json, created_at, updated_at
		FROM user_filter_presets
		WHERE user_id = $1
		ORDER BY created_at DESC
	`
	
	rows, err := r.pool.Query(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	
	presets := []*models.UserFilterPreset{}
	for rows.Next() {
		preset := &models.UserFilterPreset{}
		err := rows.Scan(
			&preset.ID, &preset.UserID, &preset.Name, &preset.FiltersJSON,
			&preset.CreatedAt, &preset.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		presets = append(presets, preset)
	}
	
	return presets, rows.Err()
}

// UpdatePreset updates a filter preset
func (r *FilterPresetRepository) UpdatePreset(ctx context.Context, preset *models.UserFilterPreset) error {
	query := `
		UPDATE user_filter_presets
		SET name = $2, filters_json = $3, updated_at = $4
		WHERE id = $1
		RETURNING updated_at
	`
	
	return r.pool.QueryRow(ctx, query,
		preset.ID, preset.Name, preset.FiltersJSON, time.Now(),
	).Scan(&preset.UpdatedAt)
}

// DeletePreset deletes a filter preset
func (r *FilterPresetRepository) DeletePreset(ctx context.Context, presetID uuid.UUID, userID uuid.UUID) error {
	query := `DELETE FROM user_filter_presets WHERE id = $1 AND user_id = $2`
	result, err := r.pool.Exec(ctx, query, presetID, userID)
	if err != nil {
		return err
	}
	
	if result.RowsAffected() == 0 {
		return fmt.Errorf("preset not found or unauthorized")
	}
	
	return nil
}

// ParseFiltersJSON parses the filters JSON into a FilterPresetFilters struct
func ParseFiltersJSON(filtersJSON string) (*models.FilterPresetFilters, error) {
	var filters models.FilterPresetFilters
	err := json.Unmarshal([]byte(filtersJSON), &filters)
	if err != nil {
		return nil, fmt.Errorf("failed to parse filters JSON: %w", err)
	}
	return &filters, nil
}

// FiltersToJSON converts FilterPresetFilters to JSON string
func FiltersToJSON(filters *models.FilterPresetFilters) (string, error) {
	data, err := json.Marshal(filters)
	if err != nil {
		return "", fmt.Errorf("failed to marshal filters to JSON: %w", err)
	}
	return string(data), nil
}
