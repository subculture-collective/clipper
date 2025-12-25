package scheduler

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/metrics"
)

// ClipSyncServiceInterface defines the interface required by the scheduler
type ClipSyncServiceInterface interface {
	SyncTrendingClips(ctx context.Context, hours int, opts *services.TrendingSyncOptions) (*services.SyncStats, error)
}

// ClipSyncScheduler manages periodic clip synchronization
type ClipSyncScheduler struct {
	syncService ClipSyncServiceInterface
	interval    time.Duration
	stopChan    chan struct{}
	stopOnce    sync.Once
}

// NewClipSyncScheduler creates a new scheduler
func NewClipSyncScheduler(syncService ClipSyncServiceInterface, intervalMinutes int) *ClipSyncScheduler {
	return &ClipSyncScheduler{
		syncService: syncService,
		interval:    time.Duration(intervalMinutes) * time.Minute,
		stopChan:    make(chan struct{}),
	}
}

// Start begins the periodic sync process
func (s *ClipSyncScheduler) Start(ctx context.Context) {
	log.Printf("Starting clip sync scheduler (interval: %v)", s.interval)

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Run initial sync
	s.runSync(ctx)

	for {
		select {
		case <-ticker.C:
			s.runSync(ctx)
		case <-s.stopChan:
			log.Println("Clip sync scheduler stopped")
			return
		case <-ctx.Done():
			log.Println("Clip sync scheduler stopped due to context cancellation")
			return
		}
	}
}

// Stop stops the scheduler in a thread-safe manner
func (s *ClipSyncScheduler) Stop() {
	s.stopOnce.Do(func() {
		close(s.stopChan)
	})
}

// runSync executes a sync operation
func (s *ClipSyncScheduler) runSync(ctx context.Context) {
	jobName := "clip_sync"
	log.Println("Starting scheduled clip sync...")
	startTime := time.Now()

	// Sync trending clips from the last 24 hours
	// Rotate pagination over a fixed window to keep volume low
	stats, err := s.syncService.SyncTrendingClips(ctx, 24, &services.TrendingSyncOptions{MaxPages: services.DefaultTrendingPageWindow})
	duration := time.Since(startTime)

	// Record metrics
	metrics.JobExecutionDuration.WithLabelValues(jobName).Observe(duration.Seconds())

	if err != nil {
		log.Printf("Scheduled sync failed: %v", err)
		metrics.JobExecutionTotal.WithLabelValues(jobName, "failed").Inc()
		return
	}

	metrics.JobExecutionTotal.WithLabelValues(jobName, "success").Inc()
	metrics.JobLastSuccessTimestamp.WithLabelValues(jobName).Set(float64(time.Now().Unix()))
	metrics.JobItemsProcessed.WithLabelValues(jobName, "success").Add(float64(stats.ClipsCreated + stats.ClipsUpdated))
	metrics.JobItemsProcessed.WithLabelValues(jobName, "skipped").Add(float64(stats.ClipsSkipped))
	if len(stats.Errors) > 0 {
		metrics.JobItemsProcessed.WithLabelValues(jobName, "failed").Add(float64(len(stats.Errors)))
	}

	log.Printf("Scheduled sync completed: fetched=%d created=%d updated=%d skipped=%d errors=%d duration=%v",
		stats.ClipsFetched, stats.ClipsCreated, stats.ClipsUpdated, stats.ClipsSkipped,
		len(stats.Errors), stats.EndTime.Sub(stats.StartTime))

	if len(stats.Errors) > 0 {
		log.Printf("Sync errors: %v", stats.Errors)
	}
}
