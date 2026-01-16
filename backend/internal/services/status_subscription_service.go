package services

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/pkg/database"
)

// StatusSubscriptionService manages status subscriptions
type StatusSubscriptionService struct {
	db *database.DB
}

// NewStatusSubscriptionService creates a new status subscription service
func NewStatusSubscriptionService(db *database.DB) *StatusSubscriptionService {
	return &StatusSubscriptionService{
		db: db,
	}
}

// CreateSubscription creates a new status subscription
func (s *StatusSubscriptionService) CreateSubscription(
	ctx context.Context,
	userID uuid.UUID,
	serviceName *string,
	notificationType string,
	webhookURL *string,
) (*models.StatusSubscription, error) {
	id := uuid.New()

	query := `
		INSERT INTO status_subscriptions (id, user_id, service_name, notification_type, webhook_url, is_active)
		VALUES ($1, $2, $3, $4, $5, TRUE)
		ON CONFLICT (user_id, service_name, notification_type)
		DO UPDATE SET is_active = TRUE, webhook_url = EXCLUDED.webhook_url, updated_at = NOW()
		RETURNING id, user_id, service_name, notification_type, webhook_url, is_active, created_at, updated_at
	`

	var subscription models.StatusSubscription
	err := s.db.QueryRowContext(ctx, query, id, userID, serviceName, notificationType, webhookURL).Scan(
		&subscription.ID,
		&subscription.UserID,
		&subscription.ServiceName,
		&subscription.NotificationType,
		&subscription.WebhookURL,
		&subscription.IsActive,
		&subscription.CreatedAt,
		&subscription.UpdatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}

	return &subscription, nil
}

// GetUserSubscriptions returns all subscriptions for a user
func (s *StatusSubscriptionService) GetUserSubscriptions(ctx context.Context, userID uuid.UUID) ([]models.StatusSubscription, error) {
	query := `
		SELECT id, user_id, service_name, notification_type, webhook_url, is_active, created_at, updated_at
		FROM status_subscriptions
		WHERE user_id = $1
		ORDER BY created_at DESC
	`

	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to query subscriptions: %w", err)
	}
	defer rows.Close()

	var subscriptions []models.StatusSubscription
	for rows.Next() {
		var sub models.StatusSubscription
		err := rows.Scan(
			&sub.ID,
			&sub.UserID,
			&sub.ServiceName,
			&sub.NotificationType,
			&sub.WebhookURL,
			&sub.IsActive,
			&sub.CreatedAt,
			&sub.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan subscription: %w", err)
		}
		subscriptions = append(subscriptions, sub)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating subscription rows: %w", err)
	}

	return subscriptions, nil
}

// GetSubscription returns a specific subscription by ID
func (s *StatusSubscriptionService) GetSubscription(ctx context.Context, subscriptionID uuid.UUID) (*models.StatusSubscription, error) {
	query := `
		SELECT id, user_id, service_name, notification_type, webhook_url, is_active, created_at, updated_at
		FROM status_subscriptions
		WHERE id = $1
	`

	var subscription models.StatusSubscription
	err := s.db.QueryRowContext(ctx, query, subscriptionID).Scan(
		&subscription.ID,
		&subscription.UserID,
		&subscription.ServiceName,
		&subscription.NotificationType,
		&subscription.WebhookURL,
		&subscription.IsActive,
		&subscription.CreatedAt,
		&subscription.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get subscription: %w", err)
	}

	return &subscription, nil
}

// UpdateSubscription updates a subscription's active status
func (s *StatusSubscriptionService) UpdateSubscription(
	ctx context.Context,
	subscriptionID uuid.UUID,
	isActive bool,
) error {
	query := `
		UPDATE status_subscriptions
		SET is_active = $1, updated_at = NOW()
		WHERE id = $2
	`

	result, err := s.db.ExecContext(ctx, query, isActive, subscriptionID)
	if err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("subscription not found")
	}

	return nil
}

// DeleteSubscription deletes a subscription
func (s *StatusSubscriptionService) DeleteSubscription(ctx context.Context, subscriptionID uuid.UUID) error {
	query := `DELETE FROM status_subscriptions WHERE id = $1`

	result, err := s.db.ExecContext(ctx, query, subscriptionID)
	if err != nil {
		return fmt.Errorf("failed to delete subscription: %w", err)
	}

	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return fmt.Errorf("subscription not found")
	}

	return nil
}

// GetSubscribersForService returns all active subscribers for a specific service
func (s *StatusSubscriptionService) GetSubscribersForService(
	ctx context.Context,
	serviceName string,
) ([]models.StatusSubscription, error) {
	query := `
		SELECT id, user_id, service_name, notification_type, webhook_url, is_active, created_at, updated_at
		FROM status_subscriptions
		WHERE (service_name = $1 OR service_name IS NULL) AND is_active = TRUE
		ORDER BY created_at ASC
	`

	rows, err := s.db.QueryContext(ctx, query, serviceName)
	if err != nil {
		return nil, fmt.Errorf("failed to query subscribers: %w", err)
	}
	defer rows.Close()

	var subscriptions []models.StatusSubscription
	for rows.Next() {
		var sub models.StatusSubscription
		err := rows.Scan(
			&sub.ID,
			&sub.UserID,
			&sub.ServiceName,
			&sub.NotificationType,
			&sub.WebhookURL,
			&sub.IsActive,
			&sub.CreatedAt,
			&sub.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan subscription: %w", err)
		}
		subscriptions = append(subscriptions, sub)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating subscription rows: %w", err)
	}

	return subscriptions, nil
}
