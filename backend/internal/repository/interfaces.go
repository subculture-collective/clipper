package repository

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
)

// SubscriptionRepositoryInterface defines the interface for subscription repository operations
type SubscriptionRepositoryInterface interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*models.Subscription, error)
	GetByStripeCustomerID(ctx context.Context, customerID string) (*models.Subscription, error)
	GetByStripeSubscriptionID(ctx context.Context, subscriptionID string) (*models.Subscription, error)
	Create(ctx context.Context, sub *models.Subscription) error
	Update(ctx context.Context, sub *models.Subscription) error
	GetEventByStripeEventID(ctx context.Context, eventID string) (*models.SubscriptionEvent, error)
	LogSubscriptionEvent(ctx context.Context, subscriptionID *uuid.UUID, eventType string, stripeEventID *string, eventData interface{}) error
}

// UserRepositoryInterface defines the interface for user repository operations
type UserRepositoryInterface interface {
	GetByID(ctx context.Context, userID uuid.UUID) (*models.User, error)
	GetByUsername(ctx context.Context, username string) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
	Update(ctx context.Context, user *models.User) error
}

// WebhookRepositoryInterface defines the interface for webhook repository operations
type WebhookRepositoryInterface interface {
	AddToRetryQueue(ctx context.Context, stripeEventID string, eventType string, payload interface{}, maxRetries int) error
	GetPendingRetries(ctx context.Context, limit int) ([]*models.WebhookRetryQueue, error)
	UpdateRetryQueueItem(ctx context.Context, id uuid.UUID, retryCount int, nextRetryAt *time.Time, lastError string) error
	RemoveFromRetryQueue(ctx context.Context, stripeEventID string) error
}
