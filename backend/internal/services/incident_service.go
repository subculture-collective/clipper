package services

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/pkg/database"
)

// IncidentService manages service incidents
type IncidentService struct {
	db *database.DB
}

// NewIncidentService creates a new incident service
func NewIncidentService(db *database.DB) *IncidentService {
	return &IncidentService{
		db: db,
	}
}

// CreateIncident creates a new incident
func (s *IncidentService) CreateIncident(
	ctx context.Context,
	serviceName string,
	title string,
	description *string,
	severity string,
	createdBy *uuid.UUID,
) (*models.StatusIncident, error) {
	id := uuid.New()
	now := time.Now()

	query := `
		INSERT INTO status_incidents (id, service_name, title, description, severity, status, started_at, created_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id, service_name, title, description, severity, status, started_at, resolved_at, created_by, created_at, updated_at
	`

	var incident models.StatusIncident
	err := s.db.QueryRowContext(
		ctx,
		query,
		id,
		serviceName,
		title,
		description,
		severity,
		models.IncidentStatusInvestigating,
		now,
		createdBy,
		now,
		now,
	).Scan(
		&incident.ID,
		&incident.ServiceName,
		&incident.Title,
		&incident.Description,
		&incident.Severity,
		&incident.Status,
		&incident.StartedAt,
		&incident.ResolvedAt,
		&incident.CreatedBy,
		&incident.CreatedAt,
		&incident.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create incident: %w", err)
	}

	return &incident, nil
}

// GetIncident returns a specific incident by ID
func (s *IncidentService) GetIncident(ctx context.Context, incidentID uuid.UUID) (*models.StatusIncident, error) {
	query := `
		SELECT id, service_name, title, description, severity, status, started_at, resolved_at, created_by, created_at, updated_at
		FROM status_incidents
		WHERE id = $1
	`

	var incident models.StatusIncident
	err := s.db.QueryRowContext(ctx, query, incidentID).Scan(
		&incident.ID,
		&incident.ServiceName,
		&incident.Title,
		&incident.Description,
		&incident.Severity,
		&incident.Status,
		&incident.StartedAt,
		&incident.ResolvedAt,
		&incident.CreatedBy,
		&incident.CreatedAt,
		&incident.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get incident: %w", err)
	}

	return &incident, nil
}

// ListIncidents returns a list of incidents with optional filtering
func (s *IncidentService) ListIncidents(
	ctx context.Context,
	serviceName *string,
	status *string,
	limit int,
	offset int,
) ([]models.StatusIncident, int, error) {
	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argCount := 0

	if serviceName != nil {
		argCount++
		whereClause += fmt.Sprintf(" AND service_name = $%d", argCount)
		args = append(args, *serviceName)
	}

	if status != nil {
		argCount++
		whereClause += fmt.Sprintf(" AND status = $%d", argCount)
		args = append(args, *status)
	}

	// Get total count
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM status_incidents %s", whereClause)
	var total int
	err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to count incidents: %w", err)
	}

	// Get incidents
	query := fmt.Sprintf(`
		SELECT id, service_name, title, description, severity, status, started_at, resolved_at, created_by, created_at, updated_at
		FROM status_incidents
		%s
		ORDER BY started_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argCount+1, argCount+2)

	args = append(args, limit, offset)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to query incidents: %w", err)
	}
	defer rows.Close()

	var incidents []models.StatusIncident
	for rows.Next() {
		var incident models.StatusIncident
		err := rows.Scan(
			&incident.ID,
			&incident.ServiceName,
			&incident.Title,
			&incident.Description,
			&incident.Severity,
			&incident.Status,
			&incident.StartedAt,
			&incident.ResolvedAt,
			&incident.CreatedBy,
			&incident.CreatedAt,
			&incident.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan incident: %w", err)
		}
		incidents = append(incidents, incident)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating incident rows: %w", err)
	}

	return incidents, total, nil
}

// UpdateIncident adds an update to an incident
func (s *IncidentService) UpdateIncident(
	ctx context.Context,
	incidentID uuid.UUID,
	status *string,
	message string,
	updatedBy *uuid.UUID,
) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	// Update incident status if provided
	if status != nil {
		updateQuery := `
			UPDATE status_incidents
			SET status = $1, updated_at = NOW()
			WHERE id = $2
		`
		_, err = tx.ExecContext(ctx, updateQuery, *status, incidentID)
		if err != nil {
			return fmt.Errorf("failed to update incident: %w", err)
		}

		// If status is resolved, set resolved_at
		if *status == models.IncidentStatusResolved {
			resolveQuery := `
				UPDATE status_incidents
				SET resolved_at = NOW()
				WHERE id = $1 AND resolved_at IS NULL
			`
			_, err = tx.ExecContext(ctx, resolveQuery, incidentID)
			if err != nil {
				return fmt.Errorf("failed to set resolved_at: %w", err)
			}
		}
	}

	// Add incident update
	updateID := uuid.New()
	insertQuery := `
		INSERT INTO status_incident_updates (id, incident_id, status, message, created_by, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
	`

	updateStatus := models.IncidentStatusInvestigating
	if status != nil {
		updateStatus = *status
	}

	_, err = tx.ExecContext(ctx, insertQuery, updateID, incidentID, updateStatus, message, updatedBy)
	if err != nil {
		return fmt.Errorf("failed to create incident update: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("failed to commit transaction: %w", err)
	}

	return nil
}

// GetIncidentUpdates returns all updates for an incident
func (s *IncidentService) GetIncidentUpdates(ctx context.Context, incidentID uuid.UUID) ([]models.StatusIncidentUpdate, error) {
	query := `
		SELECT id, incident_id, status, message, created_by, created_at
		FROM status_incident_updates
		WHERE incident_id = $1
		ORDER BY created_at DESC
	`

	rows, err := s.db.QueryContext(ctx, query, incidentID)
	if err != nil {
		return nil, fmt.Errorf("failed to query incident updates: %w", err)
	}
	defer rows.Close()

	var updates []models.StatusIncidentUpdate
	for rows.Next() {
		var update models.StatusIncidentUpdate
		err := rows.Scan(
			&update.ID,
			&update.IncidentID,
			&update.Status,
			&update.Message,
			&update.CreatedBy,
			&update.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan incident update: %w", err)
		}
		updates = append(updates, update)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating incident update rows: %w", err)
	}

	return updates, nil
}

// GetActiveIncidents returns all active (non-resolved) incidents
func (s *IncidentService) GetActiveIncidents(ctx context.Context) ([]models.StatusIncident, error) {
	query := `
		SELECT id, service_name, title, description, severity, status, started_at, resolved_at, created_by, created_at, updated_at
		FROM status_incidents
		WHERE status != $1
		ORDER BY severity DESC, started_at DESC
	`

	rows, err := s.db.QueryContext(ctx, query, models.IncidentStatusResolved)
	if err != nil {
		return nil, fmt.Errorf("failed to query active incidents: %w", err)
	}
	defer rows.Close()

	var incidents []models.StatusIncident
	for rows.Next() {
		var incident models.StatusIncident
		err := rows.Scan(
			&incident.ID,
			&incident.ServiceName,
			&incident.Title,
			&incident.Description,
			&incident.Severity,
			&incident.Status,
			&incident.StartedAt,
			&incident.ResolvedAt,
			&incident.CreatedBy,
			&incident.CreatedAt,
			&incident.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan incident: %w", err)
		}
		incidents = append(incidents, incident)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating incident rows: %w", err)
	}

	return incidents, nil
}
