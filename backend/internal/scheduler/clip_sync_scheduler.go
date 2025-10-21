package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/subculture-collective/clipper/internal/services"
)

// ClipSyncScheduler manages periodic clip synchronization
type ClipSyncScheduler struct {
	syncService *services.ClipSyncService
	interval    time.Duration
	stopChan    chan struct{}
}

// NewClipSyncScheduler creates a new scheduler
func NewClipSyncScheduler(syncService *services.ClipSyncService, intervalMinutes int) *ClipSyncScheduler {
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

// Stop stops the scheduler
func (s *ClipSyncScheduler) Stop() {
	close(s.stopChan)
}

// runSync executes a sync operation
func (s *ClipSyncScheduler) runSync(ctx context.Context) {
	log.Println("Starting scheduled clip sync...")

	// Sync trending clips from the last 24 hours
	// Fetch 10 clips per game from top 10 games = ~100 clips total
	stats, err := s.syncService.SyncTrendingClips(ctx, 24, 10)
	if err != nil {
		log.Printf("Scheduled sync failed: %v", err)
		return
	}

	log.Printf("Scheduled sync completed: fetched=%d created=%d updated=%d skipped=%d errors=%d duration=%v",
		stats.ClipsFetched, stats.ClipsCreated, stats.ClipsUpdated, stats.ClipsSkipped,
		len(stats.Errors), stats.EndTime.Sub(stats.StartTime))

	if len(stats.Errors) > 0 {
		log.Printf("Sync errors: %v", stats.Errors)
	}
}
