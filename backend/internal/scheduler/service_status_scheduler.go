package scheduler

import (
	"context"
	"log"
	"sync"
	"time"
)

// ServiceStatusServiceInterface defines the interface required by the service status scheduler
type ServiceStatusServiceInterface interface {
	CleanupOldHistory(ctx context.Context, olderThan time.Duration) error
}

// ServiceStatusScheduler manages periodic cleanup of old service status history
type ServiceStatusScheduler struct {
	serviceStatusService ServiceStatusServiceInterface
	cleanupInterval      time.Duration
	retentionPeriod      time.Duration
	stopChan             chan struct{}
	stopOnce             sync.Once
}

// NewServiceStatusScheduler creates a new service status scheduler
// cleanupIntervalHours: how often to run cleanup (e.g., 24 for daily)
// retentionDays: how many days of history to keep (e.g., 30)
func NewServiceStatusScheduler(
	serviceStatusService ServiceStatusServiceInterface,
	cleanupIntervalHours int,
	retentionDays int,
) *ServiceStatusScheduler {
	return &ServiceStatusScheduler{
		serviceStatusService: serviceStatusService,
		cleanupInterval:      time.Duration(cleanupIntervalHours) * time.Hour,
		retentionPeriod:      time.Duration(retentionDays) * 24 * time.Hour,
		stopChan:             make(chan struct{}),
	}
}

// Start begins the periodic cleanup process
func (s *ServiceStatusScheduler) Start(ctx context.Context) {
	log.Printf("Starting service status scheduler (cleanup interval: %v, retention: %v)", s.cleanupInterval, s.retentionPeriod)

	ticker := time.NewTicker(s.cleanupInterval)
	defer ticker.Stop()

	// Run initial cleanup after a short delay to avoid startup congestion
	// This allows other critical services to initialize first
	time.Sleep(5 * time.Minute)
	s.cleanupOldHistory(ctx)

	for {
		select {
		case <-ticker.C:
			s.cleanupOldHistory(ctx)
		case <-s.stopChan:
			log.Println("Service status scheduler stopped")
			return
		case <-ctx.Done():
			log.Println("Service status scheduler stopped due to context cancellation")
			return
		}
	}
}

// Stop stops the scheduler in a thread-safe manner
func (s *ServiceStatusScheduler) Stop() {
	s.stopOnce.Do(func() {
		close(s.stopChan)
	})
}

// cleanupOldHistory removes old service status history records
func (s *ServiceStatusScheduler) cleanupOldHistory(ctx context.Context) {
	log.Println("Starting service status history cleanup...")
	startTime := time.Now()

	if err := s.serviceStatusService.CleanupOldHistory(ctx, s.retentionPeriod); err != nil {
		log.Printf("Service status history cleanup failed: %v", err)
		return
	}

	duration := time.Since(startTime)
	log.Printf("Service status history cleanup completed in %v", duration)
}
