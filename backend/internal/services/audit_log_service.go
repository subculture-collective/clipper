package services

import (
	"context"
	"encoding/csv"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// AuditLogService handles audit log business logic
type AuditLogService struct {
	auditLogRepo *repository.AuditLogRepository
}

// NewAuditLogService creates a new AuditLogService
func NewAuditLogService(auditLogRepo *repository.AuditLogRepository) *AuditLogService {
	return &AuditLogService{
		auditLogRepo: auditLogRepo,
	}
}

// GetAuditLogs retrieves audit logs with optional filters
func (s *AuditLogService) GetAuditLogs(ctx context.Context, filters repository.AuditLogFilters, page, limit int) ([]*models.ModerationAuditLogWithUser, int, error) {
	return s.auditLogRepo.List(ctx, filters, page, limit)
}

// ExportAuditLogsCSV exports audit logs to CSV format
func (s *AuditLogService) ExportAuditLogsCSV(ctx context.Context, filters repository.AuditLogFilters, writer io.Writer) error {
	// Get all logs matching filters
	logs, err := s.auditLogRepo.Export(ctx, filters)
	if err != nil {
		return fmt.Errorf("failed to export audit logs: %w", err)
	}

	// Create CSV writer
	csvWriter := csv.NewWriter(writer)
	defer csvWriter.Flush()

	// Write header
	header := []string{
		"ID",
		"Action",
		"Entity Type",
		"Entity ID",
		"Moderator ID",
		"Moderator Username",
		"Reason",
		"Metadata",
		"Created At",
	}
	if err := csvWriter.Write(header); err != nil {
		return fmt.Errorf("failed to write CSV header: %w", err)
	}

	// Write data rows
	for _, log := range logs {
		var reason string
		if log.Reason != nil {
			reason = *log.Reason
		}

		var moderatorUsername string
		if log.Moderator != nil {
			moderatorUsername = log.Moderator.Username
		}

		metadata := ""
		if log.Metadata != nil {
			metadata = fmt.Sprintf("%v", log.Metadata)
		}

		row := []string{
			log.ID.String(),
			log.Action,
			log.EntityType,
			log.EntityID.String(),
			log.ModeratorID.String(),
			moderatorUsername,
			reason,
			metadata,
			log.CreatedAt.Format(time.RFC3339),
		}

		if err := csvWriter.Write(row); err != nil {
			return fmt.Errorf("failed to write CSV row: %w", err)
		}
	}

	return nil
}

// ParseFiltersFromQuery parses audit log filters from query parameters
func ParseAuditLogFilters(moderatorID, action, entityType, startDate, endDate string) (repository.AuditLogFilters, error) {
	filters := repository.AuditLogFilters{}

	if moderatorID != "" {
		id, err := uuid.Parse(moderatorID)
		if err != nil {
			return filters, fmt.Errorf("invalid moderator_id: %w", err)
		}
		filters.ModeratorID = &id
	}

	if action != "" {
		filters.Action = action
	}

	if entityType != "" {
		filters.EntityType = entityType
	}

	if startDate != "" {
		t, err := time.Parse(time.RFC3339, startDate)
		if err != nil {
			return filters, fmt.Errorf("invalid start_date format (use RFC3339): %w", err)
		}
		filters.StartDate = &t
	}

	if endDate != "" {
		t, err := time.Parse(time.RFC3339, endDate)
		if err != nil {
			return filters, fmt.Errorf("invalid end_date format (use RFC3339): %w", err)
		}
		filters.EndDate = &t
	}

	return filters, nil
}

// LogSubscriptionEvent logs a subscription-related event for audit purposes
func (s *AuditLogService) LogSubscriptionEvent(ctx context.Context, userID uuid.UUID, action string, metadata map[string]interface{}) error {
	log := &models.ModerationAuditLog{
		Action:      action,
		EntityType:  "subscription",
		EntityID:    userID, // Use user ID as entity ID for subscription events
		ModeratorID: userID, // For subscription events, moderator is the user themselves
		Metadata:    metadata,
	}

	return s.auditLogRepo.Create(ctx, log)
}

// LogAccountDeletionRequested logs when a user requests account deletion
func (s *AuditLogService) LogAccountDeletionRequested(ctx context.Context, userID uuid.UUID, reason *string) error {
	metadata := make(map[string]interface{})
	if reason != nil {
		metadata["reason"] = *reason
	}

	log := &models.ModerationAuditLog{
		Action:      "account_deletion_requested",
		EntityType:  "user",
		EntityID:    userID,
		ModeratorID: userID,
		Reason:      reason,
		Metadata:    metadata,
	}

	return s.auditLogRepo.Create(ctx, log)
}

// LogAccountDeletionCancelled logs when a user cancels account deletion
func (s *AuditLogService) LogAccountDeletionCancelled(ctx context.Context, userID uuid.UUID) error {
	log := &models.ModerationAuditLog{
		Action:      "account_deletion_cancelled",
		EntityType:  "user",
		EntityID:    userID,
		ModeratorID: userID,
	}

	return s.auditLogRepo.Create(ctx, log)
}
