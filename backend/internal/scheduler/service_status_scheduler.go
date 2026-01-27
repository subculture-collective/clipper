package scheduler

import (
	"context"
	"sync"
	"time"

	"github.com/subculture-collective/clipper/pkg/utils"
)

const serviceStatusSchedulerName = "service_status"

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
	utils.Info("Starting service status scheduler", map[string]interface{}{
		"scheduler":        serviceStatusSchedulerName,
		"cleanup_interval": s.cleanupInterval.String(),
		"retention":        s.retentionPeriod.String(),
	})

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
			utils.Info("Service status scheduler stopped", map[string]interface{}{
				"scheduler": serviceStatusSchedulerName,
			})
			return
		case <-ctx.Done():
			utils.Info("Service status scheduler stopped due to context cancellation", map[string]interface{}{
				"scheduler": serviceStatusSchedulerName,
			})
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
	utils.Info("Starting service status history cleanup", map[string]interface{}{
		"scheduler": serviceStatusSchedulerName,
	})
	startTime := time.Now()

	if err := s.serviceStatusService.CleanupOldHistory(ctx, s.retentionPeriod); err != nil {
		utils.Error("Service status history cleanup failed", err, map[string]interface{}{
			"scheduler": serviceStatusSchedulerName,
			"retention": s.retentionPeriod.String(),
		})
		return
	}

	duration := time.Since(startTime)
	utils.Info("Service status history cleanup completed", map[string]interface{}{
		"scheduler": serviceStatusSchedulerName,
		"duration":  duration.String(),
	})
}
