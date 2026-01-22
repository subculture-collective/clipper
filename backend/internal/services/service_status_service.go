package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/pkg/database"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// ServiceStatusService manages service status tracking
type ServiceStatusService struct {
	db *database.DB
}

// NewServiceStatusService creates a new service status service
func NewServiceStatusService(db *database.DB) *ServiceStatusService {
	return &ServiceStatusService{
		db: db,
	}
}

// GetAllServiceStatus returns the current status of all services
func (s *ServiceStatusService) GetAllServiceStatus(ctx context.Context) ([]models.ServiceStatus, error) {
	query := `
		SELECT id, service_name, status, status_message, last_check_at,
		       response_time_ms, error_rate, metadata, created_at, updated_at
		FROM service_status
		ORDER BY service_name ASC
	`

	rows, err := s.db.Pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query service status: %w", err)
	}
	defer rows.Close()

	var statuses []models.ServiceStatus
	for rows.Next() {
		var status models.ServiceStatus
		var metadataJSON []byte

		err := rows.Scan(
			&status.ID,
			&status.ServiceName,
			&status.Status,
			&status.StatusMessage,
			&status.LastCheckAt,
			&status.ResponseTimeMs,
			&status.ErrorRate,
			&metadataJSON,
			&status.CreatedAt,
			&status.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan service status: %w", err)
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &status.Metadata); err != nil {
				utils.GetLogger().Warn("Failed to unmarshal metadata", map[string]interface{}{
					"service": status.ServiceName,
					"error":   err.Error(),
				})
			}
		}

		statuses = append(statuses, status)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating service status rows: %w", err)
	}

	return statuses, nil
}

// GetServiceStatus returns the status of a specific service
func (s *ServiceStatusService) GetServiceStatus(ctx context.Context, serviceName string) (*models.ServiceStatus, error) {
	query := `
		SELECT id, service_name, status, status_message, last_check_at,
		       response_time_ms, error_rate, metadata, created_at, updated_at
		FROM service_status
		WHERE service_name = $1
	`

	var status models.ServiceStatus
	var metadataJSON []byte

	err := s.db.Pool.QueryRow(ctx, query, serviceName).Scan(
		&status.ID,
		&status.ServiceName,
		&status.Status,
		&status.StatusMessage,
		&status.LastCheckAt,
		&status.ResponseTimeMs,
		&status.ErrorRate,
		&metadataJSON,
		&status.CreatedAt,
		&status.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get service status: %w", err)
	}

	if len(metadataJSON) > 0 {
		if err := json.Unmarshal(metadataJSON, &status.Metadata); err != nil {
			utils.GetLogger().Warn("Failed to unmarshal metadata", map[string]interface{}{
				"service": status.ServiceName,
				"error":   err.Error(),
			})
		}
	}

	return &status, nil
}

// UpdateServiceStatus updates or creates a service status
func (s *ServiceStatusService) UpdateServiceStatus(
	ctx context.Context,
	serviceName string,
	status string,
	statusMessage *string,
	responseTimeMs *int,
	errorRate *float64,
	metadata map[string]interface{},
) error {
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO service_status (service_name, status, status_message, last_check_at,
		                            response_time_ms, error_rate, metadata)
		VALUES ($1, $2, $3, NOW(), $4, $5, $6)
		ON CONFLICT (service_name)
		DO UPDATE SET
			status = EXCLUDED.status,
			status_message = EXCLUDED.status_message,
			last_check_at = EXCLUDED.last_check_at,
			response_time_ms = EXCLUDED.response_time_ms,
			error_rate = EXCLUDED.error_rate,
			metadata = EXCLUDED.metadata,
			updated_at = NOW()
	`

	_, err = s.db.Pool.Exec(ctx, query, serviceName, status, statusMessage, responseTimeMs, errorRate, metadataJSON)
	if err != nil {
		return fmt.Errorf("failed to update service status: %w", err)
	}

	// Also record in history for trending analysis.
	// Note: History logging failures are non-fatal to ensure current status updates always succeed.
	// This design prioritizes real-time status reliability over complete historical records.
	historyQuery := `
		INSERT INTO status_history (service_name, status, response_time_ms, error_rate, checked_at, metadata)
		VALUES ($1, $2, $3, $4, NOW(), $5)
	`

	_, err = s.db.Pool.Exec(ctx, historyQuery, serviceName, status, responseTimeMs, errorRate, metadataJSON)
	if err != nil {
		utils.GetLogger().Warn("Failed to record status history", map[string]interface{}{
			"service": serviceName,
			"error":   err.Error(),
		})
	}

	return nil
}

// GetStatusHistory returns historical status data for a service
func (s *ServiceStatusService) GetStatusHistory(
	ctx context.Context,
	serviceName string,
	since time.Time,
) ([]models.StatusHistory, error) {
	query := `
		SELECT id, service_name, status, response_time_ms, error_rate, checked_at, metadata
		FROM status_history
		WHERE service_name = $1 AND checked_at >= $2
		ORDER BY checked_at ASC
	`

	rows, err := s.db.Pool.Query(ctx, query, serviceName, since)
	if err != nil {
		return nil, fmt.Errorf("failed to query status history: %w", err)
	}
	defer rows.Close()

	var history []models.StatusHistory
	for rows.Next() {
		var h models.StatusHistory
		var metadataJSON []byte

		err := rows.Scan(
			&h.ID,
			&h.ServiceName,
			&h.Status,
			&h.ResponseTimeMs,
			&h.ErrorRate,
			&h.CheckedAt,
			&metadataJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan status history: %w", err)
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &h.Metadata); err != nil {
				utils.GetLogger().Warn("Failed to unmarshal metadata", map[string]interface{}{
					"service": h.ServiceName,
					"error":   err.Error(),
				})
			}
		}

		history = append(history, h)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating status history rows: %w", err)
	}

	return history, nil
}

// GetAllStatusHistory returns historical data for all services
func (s *ServiceStatusService) GetAllStatusHistory(
	ctx context.Context,
	since time.Time,
) (map[string][]models.StatusHistory, error) {
	query := `
		SELECT id, service_name, status, response_time_ms, error_rate, checked_at, metadata
		FROM status_history
		WHERE checked_at >= $1
		ORDER BY service_name ASC, checked_at ASC
	`

	rows, err := s.db.Pool.Query(ctx, query, since)
	if err != nil {
		return nil, fmt.Errorf("failed to query status history: %w", err)
	}
	defer rows.Close()

	historyMap := make(map[string][]models.StatusHistory)
	for rows.Next() {
		var h models.StatusHistory
		var metadataJSON []byte

		err := rows.Scan(
			&h.ID,
			&h.ServiceName,
			&h.Status,
			&h.ResponseTimeMs,
			&h.ErrorRate,
			&h.CheckedAt,
			&metadataJSON,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan status history: %w", err)
		}

		if len(metadataJSON) > 0 {
			if err := json.Unmarshal(metadataJSON, &h.Metadata); err != nil {
				utils.GetLogger().Warn("Failed to unmarshal metadata", map[string]interface{}{
					"service": h.ServiceName,
					"error":   err.Error(),
				})
			}
		}

		historyMap[h.ServiceName] = append(historyMap[h.ServiceName], h)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating status history rows: %w", err)
	}

	return historyMap, nil
}

// CleanupOldHistory removes status history older than the specified duration
func (s *ServiceStatusService) CleanupOldHistory(ctx context.Context, olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)

	query := `DELETE FROM status_history WHERE checked_at < $1`

	result, err := s.db.Pool.Exec(ctx, query, cutoff)
	if err != nil {
		return fmt.Errorf("failed to cleanup old history: %w", err)
	}

	rowsAffected := result.RowsAffected()
	if rowsAffected > 0 {
		utils.GetLogger().Info("Cleaned up old status history", map[string]interface{}{
			"rows_deleted": rowsAffected,
			"cutoff":       cutoff,
		})
	}

	return nil
}

// GetOverallStatus returns the overall system status based on service health aggregation.
// Status calculation thresholds:
//   - If >50% of services are unhealthy, overall status is "unhealthy"
//   - If >30% of services are degraded or unhealthy, overall status is "degraded"
//   - Otherwise, overall status is "healthy"
//   - If no services are tracked, returns "unhealthy" to indicate missing monitoring
//
// These thresholds ensure that the system reports degraded status before complete failure,
// allowing operators time to respond to issues.
func (s *ServiceStatusService) GetOverallStatus(ctx context.Context) (string, error) {
	query := `
		SELECT status, COUNT(*) as count
		FROM service_status
		GROUP BY status
	`

	rows, err := s.db.Pool.Query(ctx, query)
	if err != nil {
		return "", fmt.Errorf("failed to query overall status: %w", err)
	}
	defer rows.Close()

	statusCounts := make(map[string]int)
	total := 0

	for rows.Next() {
		var status string
		var count int
		if err := rows.Scan(&status, &count); err != nil {
			return "", fmt.Errorf("failed to scan status count: %w", err)
		}
		statusCounts[status] = count
		total += count
	}

	if err := rows.Err(); err != nil {
		return "", fmt.Errorf("error iterating status count rows: %w", err)
	}

	if total == 0 {
		return models.ServiceStatusUnhealthy, nil
	}

	// If more than 50% are unhealthy, overall is unhealthy
	unhealthyCount := statusCounts[models.ServiceStatusUnhealthy]
	if float64(unhealthyCount)/float64(total) > 0.5 {
		return models.ServiceStatusUnhealthy, nil
	}

	// If more than 30% are degraded or unhealthy, overall is degraded
	degradedCount := statusCounts[models.ServiceStatusDegraded]
	if float64(degradedCount+unhealthyCount)/float64(total) > 0.3 {
		return models.ServiceStatusDegraded, nil
	}

	return models.ServiceStatusHealthy, nil
}
