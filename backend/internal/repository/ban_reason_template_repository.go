package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/subculture-collective/clipper/backend/internal/models"
)

type BanReasonTemplateRepository struct {
	db *sqlx.DB
}

func NewBanReasonTemplateRepository(db *sqlx.DB) *BanReasonTemplateRepository {
	return &BanReasonTemplateRepository{db: db}
}

// GetByID retrieves a template by ID
func (r *BanReasonTemplateRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.BanReasonTemplate, error) {
	var template models.BanReasonTemplate
	query := `SELECT * FROM ban_reason_templates WHERE id = $1`
	err := r.db.GetContext(ctx, &template, query, id)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	return &template, err
}

// List retrieves templates with optional filtering
func (r *BanReasonTemplateRepository) List(ctx context.Context, broadcasterID *string, includeDefaults bool) ([]models.BanReasonTemplate, error) {
	var templates []models.BanReasonTemplate
	
	query := `SELECT * FROM ban_reason_templates WHERE `
	args := []interface{}{}
	argNum := 1
	
	if broadcasterID != nil {
		query += `(broadcaster_id = $` + string(rune('0'+argNum)) + ` OR (is_default = true AND $` + string(rune('0'+argNum+1)) + `))`
		args = append(args, *broadcasterID, includeDefaults)
	} else if includeDefaults {
		query += `is_default = true`
	} else {
		query += `broadcaster_id IS NULL AND is_default = false`
	}
	
	query += ` ORDER BY is_default DESC, usage_count DESC, name ASC`
	
	err := r.db.SelectContext(ctx, &templates, query, args...)
	return templates, err
}

// Create creates a new template
func (r *BanReasonTemplateRepository) Create(ctx context.Context, template *models.BanReasonTemplate) error {
	query := `
		INSERT INTO ban_reason_templates (name, reason, duration_seconds, is_default, broadcaster_id, created_by, created_at, updated_at, usage_count)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`
	now := time.Now()
	template.CreatedAt = now
	template.UpdatedAt = now
	template.UsageCount = 0
	
	return r.db.GetContext(ctx, &template.ID, query,
		template.Name,
		template.Reason,
		template.DurationSeconds,
		template.IsDefault,
		template.BroadcasterID,
		template.CreatedBy,
		template.CreatedAt,
		template.UpdatedAt,
		template.UsageCount,
	)
}

// Update updates an existing template
func (r *BanReasonTemplateRepository) Update(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	updates["updated_at"] = time.Now()
	
	// Build dynamic update query
	query := `UPDATE ban_reason_templates SET `
	args := []interface{}{}
	argNum := 1
	
	for field, value := range updates {
		if argNum > 1 {
			query += ", "
		}
		query += field + ` = $` + string(rune('0'+argNum))
		args = append(args, value)
		argNum++
	}
	
	query += ` WHERE id = $` + string(rune('0'+argNum))
	args = append(args, id)
	
	_, err := r.db.ExecContext(ctx, query, args...)
	return err
}

// Delete deletes a template
func (r *BanReasonTemplateRepository) Delete(ctx context.Context, id uuid.UUID) error {
	query := `DELETE FROM ban_reason_templates WHERE id = $1 AND is_default = false`
	result, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}
	
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	
	return nil
}

// IncrementUsage increments the usage count for a template
func (r *BanReasonTemplateRepository) IncrementUsage(ctx context.Context, id uuid.UUID) error {
	query := `UPDATE ban_reason_templates SET usage_count = usage_count + 1, last_used_at = $1 WHERE id = $2`
	_, err := r.db.ExecContext(ctx, query, time.Now(), id)
	return err
}

// GetUsageStats retrieves usage statistics for templates
func (r *BanReasonTemplateRepository) GetUsageStats(ctx context.Context, broadcasterID *string) ([]models.BanReasonTemplate, error) {
	var templates []models.BanReasonTemplate
	
	query := `SELECT * FROM ban_reason_templates WHERE `
	args := []interface{}{}
	
	if broadcasterID != nil {
		query += `broadcaster_id = $1 ORDER BY usage_count DESC, name ASC`
		args = append(args, *broadcasterID)
	} else {
		query += `is_default = true ORDER BY usage_count DESC, name ASC`
	}
	
	err := r.db.SelectContext(ctx, &templates, query, args...)
	return templates, err
}
