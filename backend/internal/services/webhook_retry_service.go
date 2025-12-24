package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"time"

	"github.com/stripe/stripe-go/v81"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// WebhookRetryService handles processing of webhook retries from the queue
type WebhookRetryService struct {
	webhookRepo         *repository.WebhookRepository
	subscriptionService *SubscriptionService
}

// NewWebhookRetryService creates a new webhook retry service
func NewWebhookRetryService(
	webhookRepo *repository.WebhookRepository,
	subscriptionService *SubscriptionService,
) *WebhookRetryService {
	return &WebhookRetryService{
		webhookRepo:         webhookRepo,
		subscriptionService: subscriptionService,
	}
}

// ProcessPendingRetries processes webhook events that are ready for retry
func (s *WebhookRetryService) ProcessPendingRetries(ctx context.Context, batchSize int) error {
	log.Printf("[WEBHOOK_RETRY] Processing pending retries (batch size: %d)", batchSize)

	// Get pending retries
	items, err := s.webhookRepo.GetPendingRetries(ctx, batchSize)
	if err != nil {
		return fmt.Errorf("failed to get pending retries: %w", err)
	}

	if len(items) == 0 {
		log.Printf("[WEBHOOK_RETRY] No pending retries found")
		return nil
	}

	log.Printf("[WEBHOOK_RETRY] Found %d pending retries", len(items))

	for _, item := range items {
		if err := s.processRetry(ctx, item); err != nil {
			log.Printf("[WEBHOOK_RETRY] Failed to process retry for event %s: %v", item.StripeEventID, err)
		}
	}

	return nil
}

// processRetry processes a single retry attempt
func (s *WebhookRetryService) processRetry(ctx context.Context, item *models.WebhookRetryQueue) error {
	log.Printf("[WEBHOOK_RETRY] Processing retry %d/%d for event %s (type: %s)",
		item.RetryCount+1, item.MaxRetries, item.StripeEventID, item.EventType)

	// Parse the payload into a Stripe event
	var event stripe.Event
	if err := json.Unmarshal([]byte(item.Payload), &event); err != nil {
		errMsg := fmt.Sprintf("failed to unmarshal event payload: %v", err)
		log.Printf("[WEBHOOK_RETRY] %s", errMsg)

		// This is a permanent error, move to DLQ
		if err := s.webhookRepo.MoveToDeadLetterQueue(ctx, item, errMsg); err != nil {
			log.Printf("[WEBHOOK_RETRY] Failed to move event %s to DLQ: %v", item.StripeEventID, err)
		}
		return fmt.Errorf("%s", errMsg)
	}

	// Process the event using the subscription service
	err := s.subscriptionService.processWebhookWithRetry(ctx, event)

	if err != nil {
		// Increment retry count
		newRetryCount := item.RetryCount + 1

		// Check if we've exhausted retries
		if newRetryCount >= item.MaxRetries {
			log.Printf("[WEBHOOK_RETRY] Max retries reached for event %s, moving to DLQ", item.StripeEventID)
			if dlqErr := s.webhookRepo.MoveToDeadLetterQueue(ctx, item, err.Error()); dlqErr != nil {
				log.Printf("[WEBHOOK_RETRY] Failed to move event %s to DLQ: %v", item.StripeEventID, dlqErr)
			}
			return err
		}

		// Calculate next retry time with exponential backoff
		nextRetry := s.calculateNextRetry(newRetryCount)
		log.Printf("[WEBHOOK_RETRY] Retry failed for event %s, scheduling next retry at %v",
			item.StripeEventID, nextRetry)

		// Update retry queue item
		if updateErr := s.webhookRepo.UpdateRetryQueueItem(ctx, item.ID, newRetryCount, &nextRetry, err.Error()); updateErr != nil {
			log.Printf("[WEBHOOK_RETRY] Failed to update retry queue item: %v", updateErr)
			// Attempt to move to DLQ to prevent rapid retry loops
			dlqErr := s.webhookRepo.MoveToDeadLetterQueue(ctx, item, fmt.Sprintf("Failed to update retry queue item: %v; original error: %v", updateErr, err))
			if dlqErr != nil {
				log.Printf("[WEBHOOK_RETRY] Failed to move event %s to DLQ after update failure: %v", item.StripeEventID, dlqErr)
			}
			return fmt.Errorf("failed to update retry queue item for event %s: %w (original error: %v)", item.StripeEventID, updateErr, err)
		}

		return err
	}

	// Success! Remove from retry queue
	log.Printf("[WEBHOOK_RETRY] Successfully processed event %s, removing from queue", item.StripeEventID)
	if err := s.webhookRepo.RemoveFromRetryQueue(ctx, item.StripeEventID); err != nil {
		log.Printf("[WEBHOOK_RETRY] Failed to remove event %s from retry queue: %v", item.StripeEventID, err)
		return fmt.Errorf("successfully processed event %s but failed to remove from retry queue: %w", item.StripeEventID, err)
	}

	return nil
}

// calculateNextRetry calculates the next retry time using exponential backoff
// Base delay: 30 seconds
// Formula: base * 2^(retryCount) with max of 1 hour
func (s *WebhookRetryService) calculateNextRetry(retryCount int) time.Time {
	baseDelay := 30 * time.Second
	maxDelay := 1 * time.Hour

	// Calculate exponential backoff: 30s, 1m, 2m, 4m, etc.
	delay := time.Duration(float64(baseDelay) * math.Pow(2, float64(retryCount)))

	// Cap at max delay
	if delay > maxDelay {
		delay = maxDelay
	}

	return time.Now().Add(delay)
}

// GetRetryQueueStats returns statistics about the retry queue
func (s *WebhookRetryService) GetRetryQueueStats(ctx context.Context) (map[string]interface{}, error) {
	// Get pending retries count efficiently
	pendingCount, err := s.webhookRepo.CountPendingRetries(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to count pending retries: %w", err)
	}

	// Get DLQ count
	dlqCount, err := s.webhookRepo.CountDeadLetterQueueItems(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to count DLQ items: %w", err)
	}

	// Update Prometheus metrics
	webhookRetryQueueSize.Set(float64(pendingCount))
	webhookDeadLetterQueueSize.Set(float64(dlqCount))

	stats := map[string]interface{}{
		"pending_retries": pendingCount,
		"dlq_items":       dlqCount,
		"timestamp":       time.Now(),
	}

	return stats, nil
}
