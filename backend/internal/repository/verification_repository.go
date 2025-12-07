package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

var (
	// ErrVerificationNotFound is returned when a verification is not found
	ErrVerificationNotFound = errors.New("verification not found")
	// ErrActiveVerificationExists is returned when user already has an active verification
	ErrActiveVerificationExists = errors.New("active verification application already exists")
)

// VerificationRepository handles verification database operations
type VerificationRepository struct {
	db *pgxpool.Pool
}

// NewVerificationRepository creates a new verification repository
func NewVerificationRepository(db *pgxpool.Pool) *VerificationRepository {
	return &VerificationRepository{db: db}
}

// Create creates a new verification application
func (r *VerificationRepository) Create(ctx context.Context, verification *models.CreatorVerification) error {
	query := `
		INSERT INTO creator_verifications (
			id, user_id, status, application_reason, identity_document_type,
			follower_count, content_creation_months, platform_username, platform_url
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at
	`

	err := r.db.QueryRow(
		ctx, query,
		verification.ID,
		verification.UserID,
		verification.Status,
		verification.ApplicationReason,
		verification.IdentityDocumentType,
		verification.FollowerCount,
		verification.ContentCreationMonths,
		verification.PlatformUsername,
		verification.PlatformURL,
	).Scan(&verification.CreatedAt, &verification.UpdatedAt)

	if err != nil {
		// Check for unique constraint violation
		if err.Error() == "ERROR: duplicate key value violates unique constraint \"unique_active_application\" (SQLSTATE 23505)" {
			return ErrActiveVerificationExists
		}
		return fmt.Errorf("failed to create verification: %w", err)
	}

	return nil
}

// GetByID retrieves a verification by ID
func (r *VerificationRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.CreatorVerification, error) {
	query := `
		SELECT 
			id, user_id, status, application_reason, identity_document_type,
			identity_verified, identity_verified_at, identity_verified_by,
			follower_count, content_creation_months, platform_username, platform_url,
			reviewed_by, reviewed_at, review_notes, rejection_reason,
			created_at, updated_at
		FROM creator_verifications
		WHERE id = $1
	`

	var verification models.CreatorVerification
	err := r.db.QueryRow(ctx, query, id).Scan(
		&verification.ID,
		&verification.UserID,
		&verification.Status,
		&verification.ApplicationReason,
		&verification.IdentityDocumentType,
		&verification.IdentityVerified,
		&verification.IdentityVerifiedAt,
		&verification.IdentityVerifiedBy,
		&verification.FollowerCount,
		&verification.ContentCreationMonths,
		&verification.PlatformUsername,
		&verification.PlatformURL,
		&verification.ReviewedBy,
		&verification.ReviewedAt,
		&verification.ReviewNotes,
		&verification.RejectionReason,
		&verification.CreatedAt,
		&verification.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVerificationNotFound
		}
		return nil, fmt.Errorf("failed to get verification: %w", err)
	}

	return &verification, nil
}

// GetByUserID retrieves the latest verification for a user
func (r *VerificationRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*models.CreatorVerification, error) {
	query := `
		SELECT 
			id, user_id, status, application_reason, identity_document_type,
			identity_verified, identity_verified_at, identity_verified_by,
			follower_count, content_creation_months, platform_username, platform_url,
			reviewed_by, reviewed_at, review_notes, rejection_reason,
			created_at, updated_at
		FROM creator_verifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT 1
	`

	var verification models.CreatorVerification
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&verification.ID,
		&verification.UserID,
		&verification.Status,
		&verification.ApplicationReason,
		&verification.IdentityDocumentType,
		&verification.IdentityVerified,
		&verification.IdentityVerifiedAt,
		&verification.IdentityVerifiedBy,
		&verification.FollowerCount,
		&verification.ContentCreationMonths,
		&verification.PlatformUsername,
		&verification.PlatformURL,
		&verification.ReviewedBy,
		&verification.ReviewedAt,
		&verification.ReviewNotes,
		&verification.RejectionReason,
		&verification.CreatedAt,
		&verification.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrVerificationNotFound
		}
		return nil, fmt.Errorf("failed to get verification by user: %w", err)
	}

	return &verification, nil
}

// List retrieves verifications with pagination and filtering
func (r *VerificationRepository) List(ctx context.Context, status *models.VerificationStatus, limit, offset int) ([]models.VerificationWithUser, int, error) {
	// Build query based on filters
	countQuery := `SELECT COUNT(*) FROM creator_verifications`
	query := `
		SELECT 
			cv.id, cv.user_id, cv.status, cv.application_reason, cv.identity_document_type,
			cv.identity_verified, cv.identity_verified_at, cv.identity_verified_by,
			cv.follower_count, cv.content_creation_months, cv.platform_username, cv.platform_url,
			cv.reviewed_by, cv.reviewed_at, cv.review_notes, cv.rejection_reason,
			cv.created_at, cv.updated_at,
			u.username, u.display_name, u.avatar_url
		FROM creator_verifications cv
		JOIN users u ON cv.user_id = u.id
	`

	args := make([]interface{}, 0)
	argIndex := 1

	if status != nil {
		countQuery += " WHERE status = $" + fmt.Sprintf("%d", argIndex)
		query += " WHERE cv.status = $" + fmt.Sprintf("%d", argIndex)
		args = append(args, *status)
		argIndex++
	}

	// Get total count
	var total int
	if err := r.db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("failed to count verifications: %w", err)
	}

	// Add ordering and pagination
	query += fmt.Sprintf(" ORDER BY cv.created_at DESC LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list verifications: %w", err)
	}
	defer rows.Close()

	verifications := make([]models.VerificationWithUser, 0)
	for rows.Next() {
		var v models.VerificationWithUser
		err := rows.Scan(
			&v.ID,
			&v.UserID,
			&v.Status,
			&v.ApplicationReason,
			&v.IdentityDocumentType,
			&v.IdentityVerified,
			&v.IdentityVerifiedAt,
			&v.IdentityVerifiedBy,
			&v.FollowerCount,
			&v.ContentCreationMonths,
			&v.PlatformUsername,
			&v.PlatformURL,
			&v.ReviewedBy,
			&v.ReviewedAt,
			&v.ReviewNotes,
			&v.RejectionReason,
			&v.CreatedAt,
			&v.UpdatedAt,
			&v.Username,
			&v.DisplayName,
			&v.AvatarURL,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to scan verification: %w", err)
		}
		verifications = append(verifications, v)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("error iterating verifications: %w", err)
	}

	return verifications, total, nil
}

// Update updates a verification application
func (r *VerificationRepository) Update(ctx context.Context, verification *models.CreatorVerification) error {
	query := `
		UPDATE creator_verifications
		SET status = $1,
		    identity_verified = $2,
		    identity_verified_at = $3,
		    identity_verified_by = $4,
		    reviewed_by = $5,
		    reviewed_at = $6,
		    review_notes = $7,
		    rejection_reason = $8,
		    updated_at = NOW()
		WHERE id = $9
		RETURNING updated_at
	`

	err := r.db.QueryRow(
		ctx, query,
		verification.Status,
		verification.IdentityVerified,
		verification.IdentityVerifiedAt,
		verification.IdentityVerifiedBy,
		verification.ReviewedBy,
		verification.ReviewedAt,
		verification.ReviewNotes,
		verification.RejectionReason,
		verification.ID,
	).Scan(&verification.UpdatedAt)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrVerificationNotFound
		}
		return fmt.Errorf("failed to update verification: %w", err)
	}

	return nil
}

// CreateAuditLog creates a new audit log entry for a verification action
func (r *VerificationRepository) CreateAuditLog(ctx context.Context, log *models.VerificationAuditLog) error {
	// Convert metadata to JSONB
	var metadataJSON []byte
	var err error
	if log.Metadata != nil {
		metadataJSON, err = json.Marshal(log.Metadata)
		if err != nil {
			return fmt.Errorf("failed to marshal metadata: %w", err)
		}
	}

	query := `
		INSERT INTO verification_audit_logs (
			id, verification_id, action, performed_by, 
			previous_status, new_status, notes, metadata
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at
	`

	err = r.db.QueryRow(
		ctx, query,
		log.ID,
		log.VerificationID,
		log.Action,
		log.PerformedBy,
		log.PreviousStatus,
		log.NewStatus,
		log.Notes,
		metadataJSON,
	).Scan(&log.CreatedAt)

	if err != nil {
		return fmt.Errorf("failed to create audit log: %w", err)
	}

	return nil
}

// GetAuditLogs retrieves audit logs for a verification
func (r *VerificationRepository) GetAuditLogs(ctx context.Context, verificationID uuid.UUID) ([]models.VerificationAuditLog, error) {
	query := `
		SELECT 
			id, verification_id, action, performed_by,
			previous_status, new_status, notes, metadata, created_at
		FROM verification_audit_logs
		WHERE verification_id = $1
		ORDER BY created_at DESC
	`

	rows, err := r.db.Query(ctx, query, verificationID)
	if err != nil {
		return nil, fmt.Errorf("failed to get audit logs: %w", err)
	}
	defer rows.Close()

	logs := make([]models.VerificationAuditLog, 0)
	for rows.Next() {
		var log models.VerificationAuditLog
		var metadataJSON sql.RawBytes

		err := rows.Scan(
			&log.ID,
			&log.VerificationID,
			&log.Action,
			&log.PerformedBy,
			&log.PreviousStatus,
			&log.NewStatus,
			&log.Notes,
			&metadataJSON,
			&log.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan audit log: %w", err)
		}

		// Parse metadata JSON
		if metadataJSON != nil {
			if err := json.Unmarshal(metadataJSON, &log.Metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
		}

		logs = append(logs, log)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating audit logs: %w", err)
	}

	return logs, nil
}
