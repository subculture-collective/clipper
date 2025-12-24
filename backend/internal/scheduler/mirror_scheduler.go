package scheduler

import (
	"context"
	"log"
	"sync"
	"time"
)

// MirrorServiceInterface defines the interface required by the mirror scheduler
type MirrorServiceInterface interface {
	SyncPopularClips(ctx context.Context) error
	CleanupExpiredMirrors(ctx context.Context) (int64, error)
}

// MirrorScheduler manages periodic mirror sync and cleanup operations
type MirrorScheduler struct {
	mirrorService   MirrorServiceInterface
	syncInterval    time.Duration
	cleanupInterval time.Duration
	stopChan        chan struct{}
	stopOnce        sync.Once
	startOnce       sync.Once
	running         bool
	mu              sync.Mutex
}

// NewMirrorScheduler creates a new mirror scheduler
func NewMirrorScheduler(
	mirrorService MirrorServiceInterface,
	syncIntervalMinutes int,
	cleanupIntervalMinutes int,
) *MirrorScheduler {
	return &MirrorScheduler{
		mirrorService:   mirrorService,
		syncInterval:    time.Duration(syncIntervalMinutes) * time.Minute,
		cleanupInterval: time.Duration(cleanupIntervalMinutes) * time.Minute,
		stopChan:        make(chan struct{}),
	}
}

// Start begins the periodic mirror sync and cleanup processes
func (s *MirrorScheduler) Start(ctx context.Context) {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		log.Println("Mirror scheduler is already running")
		return
	}
	s.running = true
	s.mu.Unlock()

	log.Printf("Starting mirror scheduler (sync: %v, cleanup: %v)", s.syncInterval, s.cleanupInterval)

	syncTicker := time.NewTicker(s.syncInterval)
	cleanupTicker := time.NewTicker(s.cleanupInterval)
	defer syncTicker.Stop()
	defer cleanupTicker.Stop()
	defer func() {
		s.mu.Lock()
		s.running = false
		s.mu.Unlock()
	}()

	// Run initial sync
	s.syncMirrors(ctx)

	for {
		select {
		case <-syncTicker.C:
			s.syncMirrors(ctx)
		case <-cleanupTicker.C:
			s.cleanupMirrors(ctx)
		case <-s.stopChan:
			log.Println("Mirror scheduler stopped")
			return
		case <-ctx.Done():
			log.Println("Mirror scheduler stopped due to context cancellation")
			return
		}
	}
}

// Stop stops the mirror scheduler
func (s *MirrorScheduler) Stop() {
	s.stopOnce.Do(func() {
		close(s.stopChan)
	})
}

// syncMirrors performs the mirror sync operation
func (s *MirrorScheduler) syncMirrors(ctx context.Context) {
	log.Println("Running mirror sync...")
	start := time.Now()

	if err := s.mirrorService.SyncPopularClips(ctx); err != nil {
		log.Printf("ERROR: Mirror sync failed: %v", err)
		return
	}

	duration := time.Since(start)
	log.Printf("Mirror sync completed in %v", duration)
}

// cleanupMirrors performs the mirror cleanup operation
func (s *MirrorScheduler) cleanupMirrors(ctx context.Context) {
	log.Println("Running mirror cleanup...")
	start := time.Now()

	count, err := s.mirrorService.CleanupExpiredMirrors(ctx)
	if err != nil {
		log.Printf("ERROR: Mirror cleanup failed: %v", err)
		return
	}

	duration := time.Since(start)
	log.Printf("Mirror cleanup completed in %v: removed %d expired mirrors", duration, count)
}
