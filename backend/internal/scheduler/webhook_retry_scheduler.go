package scheduler

import (
	"context"
	"log"
	"sync"
	"time"
)

// WebhookRetryServiceInterface defines the interface required by the webhook retry scheduler
type WebhookRetryServiceInterface interface {
	ProcessPendingRetries(ctx context.Context, batchSize int) error
}

// WebhookRetryScheduler manages periodic webhook retry processing
type WebhookRetryScheduler struct {
	webhookRetryService WebhookRetryServiceInterface
	interval            time.Duration
	batchSize           int
	stopChan            chan struct{}
	stopOnce            sync.Once
}

// NewWebhookRetryScheduler creates a new webhook retry scheduler
func NewWebhookRetryScheduler(
	webhookRetryService WebhookRetryServiceInterface,
	intervalMinutes int,
	batchSize int,
) *WebhookRetryScheduler {
	return &WebhookRetryScheduler{
		webhookRetryService: webhookRetryService,
		interval:            time.Duration(intervalMinutes) * time.Minute,
		batchSize:           batchSize,
		stopChan:            make(chan struct{}),
	}
}

// Start begins the periodic webhook retry processing
func (s *WebhookRetryScheduler) Start(ctx context.Context) {
	log.Printf("[WEBHOOK_SCHEDULER] Starting webhook retry scheduler (interval: %v, batch size: %d)",
		s.interval, s.batchSize)

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Run initial processing
	s.processRetries(ctx)

	for {
		select {
		case <-ticker.C:
			s.processRetries(ctx)
		case <-s.stopChan:
			log.Println("[WEBHOOK_SCHEDULER] Webhook retry scheduler stopped")
			return
		case <-ctx.Done():
			log.Println("[WEBHOOK_SCHEDULER] Webhook retry scheduler stopped due to context cancellation")
			return
		}
	}
}

// Stop gracefully stops the scheduler
func (s *WebhookRetryScheduler) Stop() {
	s.stopOnce.Do(func() {
		log.Println("[WEBHOOK_SCHEDULER] Stopping webhook retry scheduler...")
		close(s.stopChan)
	})
}

// processRetries processes pending webhook retries
func (s *WebhookRetryScheduler) processRetries(ctx context.Context) {
	log.Printf("[WEBHOOK_SCHEDULER] Processing webhook retries...")

	if err := s.webhookRetryService.ProcessPendingRetries(ctx, s.batchSize); err != nil {
		log.Printf("[WEBHOOK_SCHEDULER] Error processing webhook retries: %v", err)
	}
}
