package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
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
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
	Update(ctx context.Context, user *models.User) error
}

// WebhookRepositoryInterface defines the interface for webhook repository operations
type WebhookRepositoryInterface interface {
	AddToRetryQueue(ctx context.Context, eventID string, eventType string, event stripe.Event, maxRetries int) error
	GetFromRetryQueue(ctx context.Context, limit int) ([]*models.WebhookRetryQueue, error)
	UpdateRetryStatus(ctx context.Context, id uuid.UUID, status string, attempts int, lastError *string) error
	DeleteFromRetryQueue(ctx context.Context, id uuid.UUID) error
}
