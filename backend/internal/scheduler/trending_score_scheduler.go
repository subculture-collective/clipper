package scheduler

import (
	"context"
	"log"
	"sync"
	"time"
)

// TrendingScoreRepositoryInterface defines the interface required by the trending score scheduler
type TrendingScoreRepositoryInterface interface {
	UpdateTrendingScores(ctx context.Context) (int64, error)
}

// TrendingScoreScheduler manages periodic trending score computation/updates
type TrendingScoreScheduler struct {
	clipRepo TrendingScoreRepositoryInterface
	interval time.Duration
	stopChan chan struct{}
	stopOnce sync.Once
}

// NewTrendingScoreScheduler creates a new trending score scheduler
func NewTrendingScoreScheduler(clipRepo TrendingScoreRepositoryInterface, intervalMinutes int) *TrendingScoreScheduler {
	return &TrendingScoreScheduler{
		clipRepo: clipRepo,
		interval: time.Duration(intervalMinutes) * time.Minute,
		stopChan: make(chan struct{}),
	}
}

// Start begins the periodic trending score refresh process
func (s *TrendingScoreScheduler) Start(ctx context.Context) {
	log.Printf("Starting trending score scheduler (interval: %v)", s.interval)

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Run initial refresh
	s.refreshTrendingScores(ctx)

	for {
		select {
		case <-ticker.C:
			s.refreshTrendingScores(ctx)
		case <-s.stopChan:
			log.Println("Trending score scheduler stopped")
			return
		case <-ctx.Done():
			log.Println("Trending score scheduler stopped due to context cancellation")
			return
		}
	}
}

// Stop stops the scheduler in a thread-safe manner
func (s *TrendingScoreScheduler) Stop() {
	s.stopOnce.Do(func() {
		close(s.stopChan)
	})
}

// refreshTrendingScores executes a trending score refresh operation
func (s *TrendingScoreScheduler) refreshTrendingScores(ctx context.Context) {
	log.Println("Starting scheduled trending score refresh...")
	startTime := time.Now()

	rowsUpdated, err := s.clipRepo.UpdateTrendingScores(ctx)
	if err != nil {
		log.Printf("Trending score refresh failed: %v", err)
		return
	}

	duration := time.Since(startTime)
	log.Printf("Trending score refresh completed in %v (updated %d clips)", duration, rowsUpdated)
}
