package scheduler

import (
	"context"
	"log"
	"sync"
	"time"
)

// ClipRepositoryInterface defines the interface required by the hot score scheduler
type ClipRepositoryInterface interface {
	RefreshHotScores(ctx context.Context) error
}

// HotScoreScheduler manages periodic hot score computation/updates
type HotScoreScheduler struct {
	clipRepo ClipRepositoryInterface
	interval time.Duration
	stopChan chan struct{}
	stopOnce sync.Once
}

// NewHotScoreScheduler creates a new hot score scheduler
func NewHotScoreScheduler(clipRepo ClipRepositoryInterface, intervalMinutes int) *HotScoreScheduler {
	return &HotScoreScheduler{
		clipRepo: clipRepo,
		interval: time.Duration(intervalMinutes) * time.Minute,
		stopChan: make(chan struct{}),
	}
}

// Start begins the periodic hot score refresh process
func (s *HotScoreScheduler) Start(ctx context.Context) {
	log.Printf("Starting hot score scheduler (interval: %v)", s.interval)

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Run initial refresh
	s.refreshHotScores(ctx)

	for {
		select {
		case <-ticker.C:
			s.refreshHotScores(ctx)
		case <-s.stopChan:
			log.Println("Hot score scheduler stopped")
			return
		case <-ctx.Done():
			log.Println("Hot score scheduler stopped due to context cancellation")
			return
		}
	}
}

// Stop stops the scheduler in a thread-safe manner
func (s *HotScoreScheduler) Stop() {
	s.stopOnce.Do(func() {
		close(s.stopChan)
	})
}

// refreshHotScores executes a hot score refresh operation
func (s *HotScoreScheduler) refreshHotScores(ctx context.Context) {
	log.Println("Starting scheduled hot score refresh...")
	startTime := time.Now()

	err := s.clipRepo.RefreshHotScores(ctx)
	if err != nil {
		log.Printf("Hot score refresh failed: %v", err)
		return
	}

	duration := time.Since(startTime)
	log.Printf("Hot score refresh completed in %v", duration)
}
