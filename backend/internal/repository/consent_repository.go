package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
)

var (
	// ErrConsentNotFound is returned when consent record is not found
	ErrConsentNotFound = errors.New("consent not found")
)

// ConsentRepository handles cookie consent database operations
type ConsentRepository struct {
	db *pgxpool.Pool
}

// NewConsentRepository creates a new consent repository
func NewConsentRepository(db *pgxpool.Pool) *ConsentRepository {
	return &ConsentRepository{db: db}
}

// SaveConsent saves or updates user cookie consent preferences
func (r *ConsentRepository) SaveConsent(ctx context.Context, consent *models.CookieConsent, ipAddress, userAgent string) error {
	query := `
		INSERT INTO user_cookie_consents (
			user_id, essential, functional, analytics, advertising, 
			ip_address, user_agent, expires_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (user_id) 
		DO UPDATE SET
			essential = EXCLUDED.essential,
			functional = EXCLUDED.functional,
			analytics = EXCLUDED.analytics,
			advertising = EXCLUDED.advertising,
			consent_date = NOW(),
			ip_address = EXCLUDED.ip_address,
			user_agent = EXCLUDED.user_agent,
			expires_at = EXCLUDED.expires_at,
			updated_at = NOW()
		RETURNING id, consent_date, created_at, updated_at
	`

	err := r.db.QueryRow(
		ctx, query,
		consent.UserID,
		consent.Essential,
		consent.Functional,
		consent.Analytics,
		consent.Advertising,
		ipAddress,
		userAgent,
		time.Now().Add(365 * 24 * time.Hour), // 12 months from now
	).Scan(&consent.ID, &consent.ConsentDate, &consent.CreatedAt, &consent.UpdatedAt)

	if err != nil {
		return err
	}

	consent.IPAddress = &ipAddress
	consent.UserAgent = &userAgent
	consent.ExpiresAt = time.Now().Add(365 * 24 * time.Hour)

	return nil
}

// GetConsent retrieves the current consent preferences for a user
func (r *ConsentRepository) GetConsent(ctx context.Context, userID uuid.UUID) (*models.CookieConsent, error) {
	query := `
		SELECT 
			id, user_id, essential, functional, analytics, advertising,
			consent_date, ip_address, user_agent, expires_at, created_at, updated_at
		FROM user_cookie_consents
		WHERE user_id = $1
		ORDER BY consent_date DESC
		LIMIT 1
	`

	var consent models.CookieConsent
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&consent.ID,
		&consent.UserID,
		&consent.Essential,
		&consent.Functional,
		&consent.Analytics,
		&consent.Advertising,
		&consent.ConsentDate,
		&consent.IPAddress,
		&consent.UserAgent,
		&consent.ExpiresAt,
		&consent.CreatedAt,
		&consent.UpdatedAt,
	)

	if err != nil {
		if err.Error() == "no rows in result set" {
			return nil, ErrConsentNotFound
		}
		return nil, err
	}

	return &consent, nil
}

// IsConsentExpired checks if the user's consent has expired
func (r *ConsentRepository) IsConsentExpired(ctx context.Context, userID uuid.UUID) (bool, error) {
	consent, err := r.GetConsent(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrConsentNotFound) {
			return true, nil // No consent = expired
		}
		return true, err
	}

	return time.Now().After(consent.ExpiresAt), nil
}
