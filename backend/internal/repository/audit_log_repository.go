package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/utils"
)

// AuditLogRepository handles database operations for moderation audit logs
type AuditLogRepository struct {
	db *pgxpool.Pool
}

// NewAuditLogRepository creates a new AuditLogRepository
func NewAuditLogRepository(db *pgxpool.Pool) *AuditLogRepository {
	return &AuditLogRepository{db: db}
}

// Create creates a new audit log entry
func (r *AuditLogRepository) Create(ctx context.Context, log *models.ModerationAuditLog) error {
	// Convert metadata to JSON
	var metadataJSON []byte
	var err error
	if log.Metadata != nil {
		metadataJSON, err = json.Marshal(log.Metadata)
		if err != nil {
			return fmt.Errorf("failed to marshal metadata: %w", err)
		}
	}

	query := `
		INSERT INTO moderation_audit_logs (
			id, action, entity_type, entity_id, moderator_id, reason, metadata, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8
		)`

	_, err = r.db.Exec(ctx, query,
		log.ID,
		log.Action,
		log.EntityType,
		log.EntityID,
		log.ModeratorID,
		log.Reason,
		metadataJSON,
		log.CreatedAt,
	)

	return err
}

// List retrieves audit logs with optional filters
func (r *AuditLogRepository) List(ctx context.Context, filters AuditLogFilters, page, limit int) ([]*models.ModerationAuditLogWithUser, int, error) {
	offset := (page - 1) * limit

	// Build query with filters
	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argPos := 1

	if filters.ModeratorID != nil {
		whereClause += fmt.Sprintf(" AND mal.moderator_id = %s", utils.SQLPlaceholder(argPos))
		args = append(args, *filters.ModeratorID)
		argPos++
	}

	if filters.Action != "" {
		whereClause += fmt.Sprintf(" AND mal.action = %s", utils.SQLPlaceholder(argPos))
		args = append(args, filters.Action)
		argPos++
	}

	if filters.EntityType != "" {
		whereClause += fmt.Sprintf(" AND mal.entity_type = %s", utils.SQLPlaceholder(argPos))
		args = append(args, filters.EntityType)
		argPos++
	}

	if filters.StartDate != nil {
		whereClause += fmt.Sprintf(" AND mal.created_at >= %s", utils.SQLPlaceholder(argPos))
		args = append(args, *filters.StartDate)
		argPos++
	}

	if filters.EndDate != nil {
		whereClause += fmt.Sprintf(" AND mal.created_at <= %s", utils.SQLPlaceholder(argPos))
		args = append(args, *filters.EndDate)
		argPos++
	}

	// Count total
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM moderation_audit_logs mal %s", whereClause)
	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get logs with moderator info
	query := fmt.Sprintf(`
		SELECT 
			mal.id, mal.action, mal.entity_type, mal.entity_id, mal.moderator_id, 
			mal.reason, mal.metadata, mal.created_at,
			u.id, u.twitch_id, u.username, u.display_name, u.email, u.avatar_url,
			u.bio, u.karma_points, u.role, u.is_banned, u.created_at, u.updated_at, u.last_login_at
		FROM moderation_audit_logs mal
		JOIN users u ON mal.moderator_id = u.id
		%s
		ORDER BY mal.created_at DESC
		LIMIT %s OFFSET %s`, whereClause, utils.SQLPlaceholder(argPos), utils.SQLPlaceholder(argPos+1))

	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*models.ModerationAuditLogWithUser
	for rows.Next() {
		var log models.ModerationAuditLogWithUser
		var user models.User
		var metadataJSON []byte

		err := rows.Scan(
			&log.ID,
			&log.Action,
			&log.EntityType,
			&log.EntityID,
			&log.ModeratorID,
			&log.Reason,
			&metadataJSON,
			&log.CreatedAt,
			&user.ID,
			&user.TwitchID,
			&user.Username,
			&user.DisplayName,
			&user.Email,
			&user.AvatarURL,
			&user.Bio,
			&user.KarmaPoints,
			&user.Role,
			&user.IsBanned,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.LastLoginAt,
		)
		if err != nil {
			return nil, 0, err
		}

		// Unmarshal metadata
		if metadataJSON != nil {
			if err := json.Unmarshal(metadataJSON, &log.Metadata); err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		log.Moderator = &user
		logs = append(logs, &log)
	}

	return logs, total, rows.Err()
}

// AuditLogFilters represents filters for querying audit logs
type AuditLogFilters struct {
	ModeratorID *uuid.UUID
	Action      string
	EntityType  string
	StartDate   *time.Time
	EndDate     *time.Time
}

// Export retrieves all audit logs matching filters for export (no pagination)
func (r *AuditLogRepository) Export(ctx context.Context, filters AuditLogFilters) ([]*models.ModerationAuditLogWithUser, error) {
	// Build query with filters
	whereClause := "WHERE 1=1"
	args := []interface{}{}
	argPos := 1

	if filters.ModeratorID != nil {
		whereClause += fmt.Sprintf(" AND mal.moderator_id = %s", utils.SQLPlaceholder(argPos))
		args = append(args, *filters.ModeratorID)
		argPos++
	}

	if filters.Action != "" {
		whereClause += fmt.Sprintf(" AND mal.action = %s", utils.SQLPlaceholder(argPos))
		args = append(args, filters.Action)
		argPos++
	}

	if filters.EntityType != "" {
		whereClause += fmt.Sprintf(" AND mal.entity_type = %s", utils.SQLPlaceholder(argPos))
		args = append(args, filters.EntityType)
		argPos++
	}

	if filters.StartDate != nil {
		whereClause += fmt.Sprintf(" AND mal.created_at >= %s", utils.SQLPlaceholder(argPos))
		args = append(args, *filters.StartDate)
		argPos++
	}

	if filters.EndDate != nil {
		whereClause += fmt.Sprintf(" AND mal.created_at <= %s", utils.SQLPlaceholder(argPos))
		args = append(args, *filters.EndDate)
		argPos++
	}

	// Get logs with moderator info (no limit)
	query := fmt.Sprintf(`
		SELECT 
			mal.id, mal.action, mal.entity_type, mal.entity_id, mal.moderator_id, 
			mal.reason, mal.metadata, mal.created_at,
			u.id, u.twitch_id, u.username, u.display_name, u.email, u.avatar_url,
			u.bio, u.karma_points, u.role, u.is_banned, u.created_at, u.updated_at, u.last_login_at
		FROM moderation_audit_logs mal
		JOIN users u ON mal.moderator_id = u.id
		%s
		ORDER BY mal.created_at DESC`, whereClause)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []*models.ModerationAuditLogWithUser
	for rows.Next() {
		var log models.ModerationAuditLogWithUser
		var user models.User
		var metadataJSON []byte

		err := rows.Scan(
			&log.ID,
			&log.Action,
			&log.EntityType,
			&log.EntityID,
			&log.ModeratorID,
			&log.Reason,
			&metadataJSON,
			&log.CreatedAt,
			&user.ID,
			&user.TwitchID,
			&user.Username,
			&user.DisplayName,
			&user.Email,
			&user.AvatarURL,
			&user.Bio,
			&user.KarmaPoints,
			&user.Role,
			&user.IsBanned,
			&user.CreatedAt,
			&user.UpdatedAt,
			&user.LastLoginAt,
		)
		if err != nil {
			return nil, err
		}

		// Unmarshal metadata
		if metadataJSON != nil {
			if err := json.Unmarshal(metadataJSON, &log.Metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		log.Moderator = &user
		logs = append(logs, &log)
	}

	return logs, rows.Err()
}
