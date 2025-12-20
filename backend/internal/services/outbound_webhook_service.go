package services

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net"
	"net/http"
	"net/url"
	"strconv"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// OutboundWebhookService handles webhook delivery to third-party endpoints
type OutboundWebhookService struct {
	webhookRepo *repository.OutboundWebhookRepository
	httpClient  *http.Client
}

// NewOutboundWebhookService creates a new outbound webhook service
func NewOutboundWebhookService(webhookRepo *repository.OutboundWebhookRepository) *OutboundWebhookService {
	return &OutboundWebhookService{
		webhookRepo: webhookRepo,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// CreateSubscription creates a new webhook subscription
func (s *OutboundWebhookService) CreateSubscription(ctx context.Context, userID uuid.UUID, req *models.CreateWebhookSubscriptionRequest) (*models.WebhookSubscription, error) {
	// Validate URL for SSRF protection
	if err := s.validateURL(req.URL); err != nil {
		return nil, err
	}

	// Validate events
	if err := s.validateEvents(req.Events); err != nil {
		return nil, err
	}

	// Generate a secure random secret for HMAC signing
	secret, err := s.generateSecret()
	if err != nil {
		return nil, fmt.Errorf("failed to generate secret: %w", err)
	}

	subscription := &models.WebhookSubscription{
		ID:          uuid.New(),
		UserID:      userID,
		URL:         req.URL,
		Secret:      secret,
		Events:      req.Events,
		IsActive:    true,
		Description: req.Description,
	}

	if err := s.webhookRepo.CreateSubscription(ctx, subscription); err != nil {
		return nil, fmt.Errorf("failed to create subscription: %w", err)
	}

	// Update metrics
	s.updateActiveSubscriptionsMetric(ctx)

	return subscription, nil
}

// GetSubscriptionByID retrieves a webhook subscription by ID
func (s *OutboundWebhookService) GetSubscriptionByID(ctx context.Context, id uuid.UUID, userID uuid.UUID) (*models.WebhookSubscription, error) {
	subscription, err := s.webhookRepo.GetSubscriptionByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Ensure the subscription belongs to the user
	if subscription.UserID != userID {
		return nil, fmt.Errorf("subscription not found")
	}

	return subscription, nil
}

// GetSubscriptionsByUserID retrieves all webhook subscriptions for a user
func (s *OutboundWebhookService) GetSubscriptionsByUserID(ctx context.Context, userID uuid.UUID) ([]*models.WebhookSubscription, error) {
	return s.webhookRepo.GetSubscriptionsByUserID(ctx, userID)
}

// UpdateSubscription updates a webhook subscription
func (s *OutboundWebhookService) UpdateSubscription(ctx context.Context, id uuid.UUID, userID uuid.UUID, req *models.UpdateWebhookSubscriptionRequest) error {
	// Verify ownership
	subscription, err := s.webhookRepo.GetSubscriptionByID(ctx, id)
	if err != nil {
		return err
	}

	if subscription.UserID != userID {
		return fmt.Errorf("subscription not found")
	}

	// Validate URL if provided
	if req.URL != nil {
		if err := s.validateURL(*req.URL); err != nil {
			return err
		}
	}

	// Validate events if provided
	var eventsToUpdate []string
	if req.Events != nil {
		// Check if empty array was explicitly provided (invalid)
		if len(req.Events) == 0 {
			return fmt.Errorf("events array cannot be empty; omit the field to keep current events")
		}
		if err := s.validateEvents(req.Events); err != nil {
			return err
		}
		eventsToUpdate = req.Events
	} else {
		// nil means don't update events
		eventsToUpdate = nil
	}

	return s.webhookRepo.UpdateSubscription(ctx, id, req.URL, eventsToUpdate, req.IsActive, req.Description)
}

// DeleteSubscription deletes a webhook subscription
func (s *OutboundWebhookService) DeleteSubscription(ctx context.Context, id uuid.UUID, userID uuid.UUID) error {
	// Verify ownership
	subscription, err := s.webhookRepo.GetSubscriptionByID(ctx, id)
	if err != nil {
		return err
	}

	if subscription.UserID != userID {
		return fmt.Errorf("subscription not found")
	}

	if err := s.webhookRepo.DeleteSubscription(ctx, id); err != nil {
		return err
	}

	// Update metrics
	s.updateActiveSubscriptionsMetric(ctx)

	return nil
}

// RegenerateSecret regenerates the webhook secret for a subscription
func (s *OutboundWebhookService) RegenerateSecret(ctx context.Context, id uuid.UUID, userID uuid.UUID) (string, error) {
	// Verify ownership
	subscription, err := s.webhookRepo.GetSubscriptionByID(ctx, id)
	if err != nil {
		return "", err
	}

	if subscription.UserID != userID {
		return "", fmt.Errorf("subscription not found")
	}

	// Generate new secret
	newSecret, err := s.generateSecret()
	if err != nil {
		return "", fmt.Errorf("failed to generate secret: %w", err)
	}

	// Update subscription with new secret
	if err := s.webhookRepo.UpdateSubscriptionSecret(ctx, id, newSecret); err != nil {
		return "", fmt.Errorf("failed to update subscription: %w", err)
	}

	return newSecret, nil
}

// TriggerEvent triggers a webhook event for all subscribed endpoints
func (s *OutboundWebhookService) TriggerEvent(ctx context.Context, eventType string, eventID uuid.UUID, data map[string]interface{}) error {
	// Get all active subscriptions for this event
	subscriptions, err := s.webhookRepo.GetActiveSubscriptionsByEvent(ctx, eventType)
	if err != nil {
		return fmt.Errorf("failed to get subscriptions: %w", err)
	}

	if len(subscriptions) == 0 {
		log.Printf("[WEBHOOK] No active subscriptions for event %s", eventType)
		return nil
	}

	log.Printf("[WEBHOOK] Triggering event %s for %d subscriptions", eventType, len(subscriptions))

	// Create payload
	payload := models.WebhookEventPayload{
		Event:     eventType,
		Timestamp: time.Now(),
		Data:      data,
	}

	payloadJSON, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Queue delivery for each subscription
	for _, subscription := range subscriptions {
		delivery := &models.WebhookDelivery{
			ID:             uuid.New(),
			SubscriptionID: subscription.ID,
			EventType:      eventType,
			EventID:        eventID,
			Payload:        string(payloadJSON),
			Status:         "pending",
			AttemptCount:   0,
			MaxAttempts:    5,
			NextAttemptAt:  ptrTime(time.Now()),
		}

		if err := s.webhookRepo.CreateDelivery(ctx, delivery); err != nil {
			log.Printf("[WEBHOOK] Failed to create delivery for subscription %s: %v", subscription.ID, err)
			continue
		}

		log.Printf("[WEBHOOK] Queued delivery %s for subscription %s", delivery.ID, subscription.ID)
	}

	return nil
}

// ProcessPendingDeliveries processes pending webhook deliveries
func (s *OutboundWebhookService) ProcessPendingDeliveries(ctx context.Context, batchSize int) error {
	deliveries, err := s.webhookRepo.GetPendingDeliveries(ctx, batchSize)
	if err != nil {
		return fmt.Errorf("failed to get pending deliveries: %w", err)
	}

	if len(deliveries) == 0 {
		return nil
	}

	log.Printf("[WEBHOOK] Processing %d pending deliveries", len(deliveries))

	for _, delivery := range deliveries {
		if err := s.processDelivery(ctx, delivery); err != nil {
			log.Printf("[WEBHOOK] Failed to process delivery %s: %v", delivery.ID, err)
		}
	}

	return nil
}

// processDelivery processes a single webhook delivery
func (s *OutboundWebhookService) processDelivery(ctx context.Context, delivery *models.WebhookDelivery) error {
	// Track delivery start time for metrics
	startTime := time.Now()
	
	// Get subscription details
	subscription, err := s.webhookRepo.GetSubscriptionByID(ctx, delivery.SubscriptionID)
	if err != nil {
		return fmt.Errorf("failed to get subscription: %w", err)
	}

	subscriptionIDStr := subscription.ID.String()

	if !subscription.IsActive {
		log.Printf("[WEBHOOK] Subscription %s is inactive, skipping delivery", subscription.ID)
		// Mark as failed since subscription is inactive
		webhookDeliveryTotal.WithLabelValues(delivery.EventType, "failed").Inc()
		webhookDeliveryDuration.WithLabelValues(delivery.EventType, "failed").Observe(time.Since(startTime).Seconds())
		webhookSubscriptionHealth.WithLabelValues(subscriptionIDStr, "failed").Inc()
		webhookConsecutiveFailures.WithLabelValues(subscriptionIDStr, delivery.EventType).Inc()
		return s.webhookRepo.UpdateDeliveryFailure(ctx, delivery.ID, nil, "subscription is inactive", nil)
	}

	log.Printf("[WEBHOOK] Delivering webhook to %s (attempt %d/%d)", subscription.URL, delivery.AttemptCount+1, delivery.MaxAttempts)

	// Generate signature
	signature := s.generateSignature(delivery.Payload, subscription.Secret)

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", subscription.URL, bytes.NewBufferString(delivery.Payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Signature", signature)
	req.Header.Set("X-Webhook-Event", delivery.EventType)
	req.Header.Set("X-Webhook-Delivery-ID", delivery.ID.String())
	req.Header.Set("User-Agent", "Clipper-Webhooks/1.0")

	// Send request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		// Network error - schedule retry or move to DLQ
		errMsg := fmt.Sprintf("network error: %v", err)
		
		// Track retry rate metric
		webhookRetryRate.WithLabelValues(delivery.EventType, strconv.Itoa(delivery.AttemptCount+1)).Inc()
		
		// Check if this is the final attempt
		if delivery.AttemptCount+1 >= delivery.MaxAttempts {
			log.Printf("[WEBHOOK] Max retries reached for delivery %s (network error), moving to DLQ", delivery.ID)
			
			// Update delivery with final failure status
			if updateErr := s.webhookRepo.UpdateDeliveryFailure(ctx, delivery.ID, nil, errMsg, nil); updateErr != nil {
				log.Printf("[WEBHOOK] Failed to update delivery failure: %v", updateErr)
				return fmt.Errorf("failed to update delivery failure before DLQ: %w", updateErr)
			}
			
			// Get updated delivery to move to DLQ
			updatedDelivery, getErr := s.webhookRepo.GetDeliveryByID(ctx, delivery.ID)
			if getErr != nil {
				log.Printf("[WEBHOOK] Failed to get delivery for DLQ: %v", getErr)
				return fmt.Errorf("failed to get delivery for DLQ: %w", getErr)
			}
			
			// Move to dead-letter queue
			if dlqErr := s.webhookRepo.MoveDeliveryToDeadLetterQueue(ctx, updatedDelivery); dlqErr != nil {
				log.Printf("[WEBHOOK] Failed to move delivery %s to DLQ: %v", delivery.ID, dlqErr)
				return fmt.Errorf("failed to move delivery to DLQ: %w", dlqErr)
			}
			
			log.Printf("[WEBHOOK] Successfully moved delivery %s to DLQ", delivery.ID)
			
			// Record metrics
			webhookDeliveryTotal.WithLabelValues(delivery.EventType, "failed").Inc()
			webhookDeliveryDuration.WithLabelValues(delivery.EventType, "failed").Observe(time.Since(startTime).Seconds())
			webhookSubscriptionHealth.WithLabelValues(subscriptionIDStr, "failed").Inc()
			webhookConsecutiveFailures.WithLabelValues(subscriptionIDStr, delivery.EventType).Inc()
			webhookDLQMovements.WithLabelValues(delivery.EventType, "max_retries_network_error").Inc()
			
			return fmt.Errorf("max retries exceeded: %s", errMsg)
		}
		
		// Schedule retry
		nextRetry := s.calculateNextRetry(delivery.AttemptCount + 1)
		log.Printf("[WEBHOOK] Delivery failed: %s, next retry at %v", errMsg, nextRetry)
		
		// Record metrics
		webhookDeliveryTotal.WithLabelValues(delivery.EventType, "retry").Inc()
		webhookDeliveryDuration.WithLabelValues(delivery.EventType, "retry").Observe(time.Since(startTime).Seconds())
		webhookConsecutiveFailures.WithLabelValues(subscriptionIDStr, delivery.EventType).Inc()
		
		return s.webhookRepo.UpdateDeliveryFailure(ctx, delivery.ID, nil, errMsg, &nextRetry)
	}
	defer resp.Body.Close()

	// Read response body (limit to 10KB)
	responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 10*1024))

	// Record HTTP status code metric
	webhookHTTPStatusCode.WithLabelValues(delivery.EventType, strconv.Itoa(resp.StatusCode)).Inc()

	// Check status code
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		// Success
		log.Printf("[WEBHOOK] Delivery successful: status=%d", resp.StatusCode)
		
		// Calculate time to success (time from first attempt to success)
		// Assuming CreatedAt is the time of first attempt
		if delivery.AttemptCount > 0 {
			// This is a retry that succeeded, track time to success
			timeToSuccess := time.Since(startTime).Seconds() + float64(delivery.AttemptCount)*30 // Rough estimate based on retry delays
			webhookTimeToSuccess.WithLabelValues(delivery.EventType).Observe(timeToSuccess)
		}
		
		// Record success metrics
		webhookDeliveryTotal.WithLabelValues(delivery.EventType, "success").Inc()
		webhookDeliveryDuration.WithLabelValues(delivery.EventType, "success").Observe(time.Since(startTime).Seconds())
		webhookRetryAttempts.WithLabelValues(delivery.EventType, "success").Observe(float64(delivery.AttemptCount))
		webhookSubscriptionHealth.WithLabelValues(subscriptionIDStr, "success").Inc()
		
		// Reset consecutive failures for this subscription
		webhookConsecutiveFailures.WithLabelValues(subscriptionIDStr, delivery.EventType).Set(0)
		
		if err := s.webhookRepo.UpdateDeliverySuccess(ctx, delivery.ID, resp.StatusCode, string(responseBody)); err != nil {
			return fmt.Errorf("failed to update delivery success: %w", err)
		}

		// Update subscription's last delivery time
		if err := s.webhookRepo.UpdateLastDeliveryTime(ctx, subscription.ID, time.Now()); err != nil {
			log.Printf("[WEBHOOK] Failed to update last delivery time: %v", err)
		}

		return nil
	}

	// Failed delivery - schedule retry or move to DLQ
	nextRetry := s.calculateNextRetry(delivery.AttemptCount + 1)
	errMsg := fmt.Sprintf("HTTP %d: %s", resp.StatusCode, string(responseBody))
	
	// Track retry rate metric
	webhookRetryRate.WithLabelValues(delivery.EventType, strconv.Itoa(delivery.AttemptCount+1)).Inc()
	
	// Check if this is the final attempt
	if delivery.AttemptCount+1 >= delivery.MaxAttempts {
		log.Printf("[WEBHOOK] Max retries reached for delivery %s, moving to DLQ", delivery.ID)
		
		// Update delivery with final failure status
		if err := s.webhookRepo.UpdateDeliveryFailure(ctx, delivery.ID, &resp.StatusCode, errMsg, nil); err != nil {
			log.Printf("[WEBHOOK] Failed to update delivery failure: %v", err)
			return fmt.Errorf("failed to update delivery failure before DLQ: %w", err)
		}
		
		// Get updated delivery to move to DLQ
		updatedDelivery, err := s.webhookRepo.GetDeliveryByID(ctx, delivery.ID)
		if err != nil {
			log.Printf("[WEBHOOK] Failed to get delivery for DLQ: %v", err)
			return fmt.Errorf("failed to get delivery for DLQ: %w", err)
		}
		
		// Move to dead-letter queue
		if dlqErr := s.webhookRepo.MoveDeliveryToDeadLetterQueue(ctx, updatedDelivery); dlqErr != nil {
			log.Printf("[WEBHOOK] Failed to move delivery %s to DLQ: %v", delivery.ID, dlqErr)
			return fmt.Errorf("failed to move delivery to DLQ: %w", dlqErr)
		}
		
		log.Printf("[WEBHOOK] Successfully moved delivery %s to DLQ", delivery.ID)
		
		// Record metrics
		webhookDeliveryTotal.WithLabelValues(delivery.EventType, "failed").Inc()
		webhookDeliveryDuration.WithLabelValues(delivery.EventType, "failed").Observe(time.Since(startTime).Seconds())
		webhookRetryAttempts.WithLabelValues(delivery.EventType, "failed").Observe(float64(delivery.AttemptCount + 1))
		webhookSubscriptionHealth.WithLabelValues(subscriptionIDStr, "failed").Inc()
		webhookConsecutiveFailures.WithLabelValues(subscriptionIDStr, delivery.EventType).Inc()
		
		// Determine DLQ movement reason
		dlqReason := "max_retries_http_error"
		if resp.StatusCode >= 400 && resp.StatusCode < 500 {
			dlqReason = "max_retries_client_error"
		} else if resp.StatusCode >= 500 {
			dlqReason = "max_retries_server_error"
		}
		webhookDLQMovements.WithLabelValues(delivery.EventType, dlqReason).Inc()
		
		return fmt.Errorf("max retries exceeded: %s", errMsg)
	}
	
	// Schedule retry
	log.Printf("[WEBHOOK] Delivery failed: %s, next retry at %v", errMsg, nextRetry)
	
	// Record metrics for retry
	webhookDeliveryTotal.WithLabelValues(delivery.EventType, "retry").Inc()
	webhookDeliveryDuration.WithLabelValues(delivery.EventType, "retry").Observe(time.Since(startTime).Seconds())
	webhookRetryAttempts.WithLabelValues(delivery.EventType, "retry").Observe(float64(delivery.AttemptCount + 1))
	webhookConsecutiveFailures.WithLabelValues(subscriptionIDStr, delivery.EventType).Inc()
	
	return s.webhookRepo.UpdateDeliveryFailure(ctx, delivery.ID, &resp.StatusCode, errMsg, &nextRetry)
}

// generateSignature generates HMAC-SHA256 signature for webhook payload
func (s *OutboundWebhookService) generateSignature(payload, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(payload))
	return hex.EncodeToString(h.Sum(nil))
}

// generateSecret generates a cryptographically secure random secret
func (s *OutboundWebhookService) generateSecret() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// validateEvents validates that all events are supported
func (s *OutboundWebhookService) validateEvents(events []string) error {
	supportedEvents := make(map[string]bool)
	for _, event := range models.GetSupportedWebhookEvents() {
		supportedEvents[event] = true
	}

	for _, event := range events {
		if !supportedEvents[event] {
			return fmt.Errorf("unsupported event: %s", event)
		}
	}

	return nil
}

// validateURL validates webhook URL and protects against SSRF attacks
func (s *OutboundWebhookService) validateURL(urlStr string) error {
	u, err := url.Parse(urlStr)
	if err != nil {
		return fmt.Errorf("invalid URL: %w", err)
	}

	// Only allow HTTP/HTTPS
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("only http and https schemes are allowed")
	}

	// Resolve hostname to IP
	ips, err := net.LookupIP(u.Hostname())
	if err != nil {
		return fmt.Errorf("cannot resolve hostname: %w", err)
	}

	// Check if any resolved IP is private/internal
	for _, ip := range ips {
		if ip.IsLoopback() || ip.IsPrivate() || ip.IsLinkLocalUnicast() {
			return fmt.Errorf("webhook URLs cannot point to private/internal addresses")
		}
	}

	return nil
}

// calculateNextRetry calculates the next retry time using exponential backoff
func (s *OutboundWebhookService) calculateNextRetry(attemptCount int) time.Time {
	baseDelay := 30 * time.Second
	maxDelay := 1 * time.Hour

	// Calculate exponential backoff: 30s, 1m, 2m, 4m, etc.
	delay := time.Duration(float64(baseDelay) * math.Pow(2, float64(attemptCount)))

	// Cap at max delay
	if delay > maxDelay {
		delay = maxDelay
	}

	return time.Now().Add(delay)
}

// GetDeliveriesBySubscriptionID retrieves deliveries for a subscription with pagination
func (s *OutboundWebhookService) GetDeliveriesBySubscriptionID(ctx context.Context, subscriptionID uuid.UUID, userID uuid.UUID, page, limit int) ([]*models.WebhookDelivery, int, error) {
	// Verify ownership
	subscription, err := s.webhookRepo.GetSubscriptionByID(ctx, subscriptionID)
	if err != nil {
		return nil, 0, err
	}

	if subscription.UserID != userID {
		return nil, 0, fmt.Errorf("subscription not found")
	}

	offset := (page - 1) * limit
	deliveries, err := s.webhookRepo.GetDeliveriesBySubscriptionID(ctx, subscriptionID, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.webhookRepo.CountDeliveriesBySubscriptionID(ctx, subscriptionID)
	if err != nil {
		return nil, 0, err
	}

	return deliveries, total, nil
}

// updateActiveSubscriptionsMetric updates the Prometheus gauge for active subscriptions
func (s *OutboundWebhookService) updateActiveSubscriptionsMetric(ctx context.Context) {
	count, err := s.webhookRepo.CountActiveSubscriptions(ctx)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to count active subscriptions for metrics: %v", err)
		return
	}
	webhookSubscriptionsActive.Set(float64(count))
}

// GetDeliveryStats returns statistics about webhook deliveries
func (s *OutboundWebhookService) GetDeliveryStats(ctx context.Context) (map[string]interface{}, error) {
	// Get active subscriptions count
	activeCount, err := s.webhookRepo.CountActiveSubscriptions(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to count active subscriptions: %w", err)
	}

	// Get pending deliveries count
	pendingCount, err := s.webhookRepo.CountPendingDeliveries(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to count pending deliveries: %w", err)
	}

	// Get recent delivery stats (last hour)
	recentStats, err := s.webhookRepo.GetRecentDeliveryStats(ctx)
	if err != nil {
		// Log error but don't fail
		log.Printf("[WEBHOOK] Failed to get recent delivery stats: %v", err)
		recentStats = map[string]int{
			"success": 0,
			"failed":  0,
		}
	}

	stats := map[string]interface{}{
		"active_subscriptions": activeCount,
		"pending_deliveries":   pendingCount,
		"recent_deliveries":    recentStats,
	}

	return stats, nil
}

// GetDeadLetterQueueItems retrieves items from the dead-letter queue with pagination
func (s *OutboundWebhookService) GetDeadLetterQueueItems(ctx context.Context, page, limit int) ([]*models.OutboundWebhookDeadLetterQueue, int, error) {
	offset := (page - 1) * limit
	items, err := s.webhookRepo.GetDeadLetterQueueItems(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.webhookRepo.CountDeadLetterQueueItems(ctx)
	if err != nil {
		return nil, 0, err
	}

	return items, total, nil
}

// ReplayDeadLetterQueueItem attempts to replay a failed webhook delivery
func (s *OutboundWebhookService) ReplayDeadLetterQueueItem(ctx context.Context, dlqID uuid.UUID) error {
	// Get the DLQ item
	dlqItem, err := s.webhookRepo.GetDeadLetterQueueItemByID(ctx, dlqID)
	if err != nil {
		return fmt.Errorf("failed to get DLQ item: %w", err)
	}

	// Get subscription details
	subscription, err := s.webhookRepo.GetSubscriptionByID(ctx, dlqItem.SubscriptionID)
	if err != nil {
		return fmt.Errorf("failed to get subscription: %w", err)
	}

	if !subscription.IsActive {
		return fmt.Errorf("subscription is inactive")
	}

	log.Printf("[WEBHOOK] Replaying DLQ item %s to %s", dlqID, subscription.URL)

	// Generate signature
	signature := s.generateSignature(dlqItem.Payload, subscription.Secret)

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", subscription.URL, bytes.NewBufferString(dlqItem.Payload))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Webhook-Signature", signature)
	req.Header.Set("X-Webhook-Event", dlqItem.EventType)
	req.Header.Set("X-Webhook-Delivery-ID", dlqItem.DeliveryID.String())
	req.Header.Set("X-Webhook-Replay", "true")
	req.Header.Set("User-Agent", "Clipper-Webhooks/1.0")

	// Send request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		// Update DLQ item with failed replay
		_ = s.webhookRepo.UpdateDLQItemReplayStatus(ctx, dlqID, false)
		return fmt.Errorf("network error during replay: %w", err)
	}
	defer resp.Body.Close()

	// Read response body (limit to 10KB)
	responseBody, _ := io.ReadAll(io.LimitReader(resp.Body, 10*1024))

	// Check status code
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		// Success
		log.Printf("[WEBHOOK] Replay successful: status=%d", resp.StatusCode)
		if err := s.webhookRepo.UpdateDLQItemReplayStatus(ctx, dlqID, true); err != nil {
			log.Printf("[WEBHOOK] Failed to update DLQ replay status: %v", err)
			return fmt.Errorf("replay succeeded but failed to update DLQ replay status: %w", err)
		}
		return nil
	}

	// Failed replay
	_ = s.webhookRepo.UpdateDLQItemReplayStatus(ctx, dlqID, false)
	return fmt.Errorf("replay failed with HTTP %d: %s", resp.StatusCode, string(responseBody))
}

// DeleteDeadLetterQueueItem deletes a DLQ item
func (s *OutboundWebhookService) DeleteDeadLetterQueueItem(ctx context.Context, dlqID uuid.UUID) error {
	return s.webhookRepo.DeleteDeadLetterQueueItem(ctx, dlqID)
}

// Helper function to create a pointer to time.Time
func ptrTime(t time.Time) *time.Time {
	return &t
}
