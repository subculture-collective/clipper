package middleware

import (
	"context"

	"github.com/google/uuid"
)

// SubscriptionChecker defines the interface for subscription checking
type SubscriptionChecker interface {
	IsProUser(ctx context.Context, userID uuid.UUID) bool
	HasActiveSubscription(ctx context.Context, userID uuid.UUID) bool
}

// AuditLogger defines the interface for audit logging
type AuditLogger interface {
	LogEntitlementDenial(ctx context.Context, userID uuid.UUID, action string, metadata map[string]interface{}) error
}
