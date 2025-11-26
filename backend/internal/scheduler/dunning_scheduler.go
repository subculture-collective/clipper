package scheduler

import (
	"context"
	"log"
	"sync"
	"time"
)

// DunningServiceInterface defines the interface required by the dunning scheduler
type DunningServiceInterface interface {
	ProcessExpiredGracePeriods(ctx context.Context) error
	SendGracePeriodWarnings(ctx context.Context) error
}

// DunningScheduler manages periodic dunning processing tasks
type DunningScheduler struct {
	dunningService           DunningServiceInterface
	gracePeriodCheckInterval time.Duration
	warningCheckInterval     time.Duration
	stopChan                 chan struct{}
	stopOnce                 sync.Once
	wg                       sync.WaitGroup
}

// NewDunningScheduler creates a new dunning scheduler
func NewDunningScheduler(
	dunningService DunningServiceInterface,
	gracePeriodCheckMinutes int,
	warningCheckMinutes int,
) *DunningScheduler {
	// Default intervals if not specified
	if gracePeriodCheckMinutes <= 0 {
		gracePeriodCheckMinutes = 60 // Check hourly for expired grace periods
	}
	if warningCheckMinutes <= 0 {
		warningCheckMinutes = 1440 // Check daily for warnings (24 hours)
	}

	return &DunningScheduler{
		dunningService:           dunningService,
		gracePeriodCheckInterval: time.Duration(gracePeriodCheckMinutes) * time.Minute,
		warningCheckInterval:     time.Duration(warningCheckMinutes) * time.Minute,
		stopChan:                 make(chan struct{}),
	}
}

// Start begins the periodic dunning processing
func (s *DunningScheduler) Start(ctx context.Context) {
	log.Printf("[DUNNING_SCHEDULER] Starting dunning scheduler")
	log.Printf("[DUNNING_SCHEDULER] Grace period check interval: %v", s.gracePeriodCheckInterval)
	log.Printf("[DUNNING_SCHEDULER] Warning check interval: %v", s.warningCheckInterval)

	// Start grace period expiry checker
	s.wg.Add(1)
	go s.runGracePeriodChecker(ctx)

	// Start warning sender
	s.wg.Add(1)
	go s.runWarningChecker(ctx)
}

// runGracePeriodChecker runs the grace period expiry check loop
func (s *DunningScheduler) runGracePeriodChecker(ctx context.Context) {
	defer s.wg.Done()

	ticker := time.NewTicker(s.gracePeriodCheckInterval)
	defer ticker.Stop()

	// Run initial check
	s.processExpiredGracePeriods(ctx)

	for {
		select {
		case <-ticker.C:
			s.processExpiredGracePeriods(ctx)
		case <-s.stopChan:
			log.Println("[DUNNING_SCHEDULER] Grace period checker stopped")
			return
		case <-ctx.Done():
			log.Println("[DUNNING_SCHEDULER] Grace period checker stopped due to context cancellation")
			return
		}
	}
}

// runWarningChecker runs the grace period warning loop
func (s *DunningScheduler) runWarningChecker(ctx context.Context) {
	defer s.wg.Done()

	ticker := time.NewTicker(s.warningCheckInterval)
	defer ticker.Stop()

	// Run initial check
	s.sendGracePeriodWarnings(ctx)

	for {
		select {
		case <-ticker.C:
			s.sendGracePeriodWarnings(ctx)
		case <-s.stopChan:
			log.Println("[DUNNING_SCHEDULER] Warning checker stopped")
			return
		case <-ctx.Done():
			log.Println("[DUNNING_SCHEDULER] Warning checker stopped due to context cancellation")
			return
		}
	}
}

// Stop gracefully stops the scheduler
func (s *DunningScheduler) Stop() {
	s.stopOnce.Do(func() {
		log.Println("[DUNNING_SCHEDULER] Stopping dunning scheduler...")
		close(s.stopChan)

		// Wait for goroutines to finish with timeout
		done := make(chan struct{})
		go func() {
			s.wg.Wait()
			close(done)
		}()

		select {
		case <-done:
			log.Println("[DUNNING_SCHEDULER] Dunning scheduler stopped successfully")
		case <-time.After(30 * time.Second):
			log.Println("[DUNNING_SCHEDULER] Dunning scheduler stop timed out")
		}
	})
}

// processExpiredGracePeriods processes subscriptions with expired grace periods
func (s *DunningScheduler) processExpiredGracePeriods(ctx context.Context) {
	log.Printf("[DUNNING_SCHEDULER] Processing expired grace periods...")

	if err := s.dunningService.ProcessExpiredGracePeriods(ctx); err != nil {
		log.Printf("[DUNNING_SCHEDULER] Error processing expired grace periods: %v", err)
	} else {
		log.Printf("[DUNNING_SCHEDULER] Successfully processed expired grace periods")
	}
}

// sendGracePeriodWarnings sends warnings to users approaching grace period expiry
func (s *DunningScheduler) sendGracePeriodWarnings(ctx context.Context) {
	log.Printf("[DUNNING_SCHEDULER] Sending grace period warnings...")

	if err := s.dunningService.SendGracePeriodWarnings(ctx); err != nil {
		log.Printf("[DUNNING_SCHEDULER] Error sending grace period warnings: %v", err)
	} else {
		log.Printf("[DUNNING_SCHEDULER] Successfully sent grace period warnings")
	}
}
