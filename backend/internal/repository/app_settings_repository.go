package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AppSettingsRepository handles database operations for app settings
type AppSettingsRepository struct {
	pool *pgxpool.Pool
}

// NewAppSettingsRepository creates a new AppSettingsRepository
func NewAppSettingsRepository(pool *pgxpool.Pool) *AppSettingsRepository {
	return &AppSettingsRepository{
		pool: pool,
	}
}

// AppSetting represents a single application setting
type AppSetting struct {
	ID          uuid.UUID  `db:"id"`
	Key         string     `db:"key"`
	Value       string     `db:"value"`
	ValueType   string     `db:"value_type"`
	Description *string    `db:"description"`
	UpdatedBy   *uuid.UUID `db:"updated_by"`
	CreatedAt   string     `db:"created_at"`
	UpdatedAt   string     `db:"updated_at"`
}

// Get retrieves a setting by key
func (r *AppSettingsRepository) Get(ctx context.Context, key string) (*AppSetting, error) {
	query := `
		SELECT id, key, value, value_type, description, updated_by, created_at, updated_at
		FROM app_settings
		WHERE key = $1
	`

	var setting AppSetting
	err := r.pool.QueryRow(ctx, query, key).Scan(
		&setting.ID, &setting.Key, &setting.Value, &setting.ValueType,
		&setting.Description, &setting.UpdatedBy, &setting.CreatedAt, &setting.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to get app setting: %w", err)
	}

	return &setting, nil
}

// Set updates or creates a setting
func (r *AppSettingsRepository) Set(ctx context.Context, key, value, valueType string, updatedBy *uuid.UUID) error {
	query := `
		INSERT INTO app_settings (key, value, value_type, updated_by, updated_at)
		VALUES ($1, $2, $3, $4, NOW())
		ON CONFLICT (key)
		DO UPDATE SET
			value = EXCLUDED.value,
			value_type = EXCLUDED.value_type,
			updated_by = EXCLUDED.updated_by,
			updated_at = NOW()
	`

	_, err := r.pool.Exec(ctx, query, key, value, valueType, updatedBy)
	if err != nil {
		return fmt.Errorf("failed to set app setting: %w", err)
	}

	return nil
}

// GetByPrefix retrieves all settings matching a key prefix
func (r *AppSettingsRepository) GetByPrefix(ctx context.Context, prefix string) ([]AppSetting, error) {
	query := `
		SELECT id, key, value, value_type, description, updated_by, created_at, updated_at
		FROM app_settings
		WHERE key LIKE $1
		ORDER BY key
	`

	rows, err := r.pool.Query(ctx, query, prefix+"%")
	if err != nil {
		return nil, fmt.Errorf("failed to query settings by prefix: %w", err)
	}
	defer rows.Close()

	var settings []AppSetting
	for rows.Next() {
		var setting AppSetting
		err := rows.Scan(
			&setting.ID, &setting.Key, &setting.Value, &setting.ValueType,
			&setting.Description, &setting.UpdatedBy, &setting.CreatedAt, &setting.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan setting: %w", err)
		}
		settings = append(settings, setting)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating settings: %w", err)
	}

	return settings, nil
}
