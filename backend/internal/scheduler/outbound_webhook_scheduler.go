package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/subculture-collective/clipper/internal/services"
)

// OutboundWebhookScheduler handles periodic processing of webhook deliveries
type OutboundWebhookScheduler struct {
	webhookService *services.OutboundWebhookService
	interval       time.Duration
	batchSize      int
	stopChan       chan struct{}
}

// NewOutboundWebhookScheduler creates a new outbound webhook scheduler
func NewOutboundWebhookScheduler(webhookService *services.OutboundWebhookService, interval time.Duration, batchSize int) *OutboundWebhookScheduler {
	return &OutboundWebhookScheduler{
		webhookService: webhookService,
		interval:       interval,
		batchSize:      batchSize,
		stopChan:       make(chan struct{}),
	}
}

// Start starts the webhook delivery scheduler
func (s *OutboundWebhookScheduler) Start(ctx context.Context) {
	log.Printf("[WEBHOOK_SCHEDULER] Starting outbound webhook scheduler (interval: %v, batch size: %d)", s.interval, s.batchSize)

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Process immediately on start
	s.processDeliveries(ctx)

	for {
		select {
		case <-ticker.C:
			s.processDeliveries(ctx)
		case <-s.stopChan:
			log.Println("[WEBHOOK_SCHEDULER] Stopping outbound webhook scheduler")
			return
		case <-ctx.Done():
			log.Println("[WEBHOOK_SCHEDULER] Context cancelled, stopping outbound webhook scheduler")
			return
		}
	}
}

// Stop stops the webhook delivery scheduler
func (s *OutboundWebhookScheduler) Stop() {
	close(s.stopChan)
}

// processDeliveries processes pending webhook deliveries
func (s *OutboundWebhookScheduler) processDeliveries(ctx context.Context) {
	if err := s.webhookService.ProcessPendingDeliveries(ctx, s.batchSize); err != nil {
		log.Printf("[WEBHOOK_SCHEDULER] Error processing deliveries: %v", err)
	}
}
