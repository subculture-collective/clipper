package scheduler

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// LiveStatusServiceInterface defines the interface required by the live status scheduler
type LiveStatusServiceInterface interface {
	UpdateLiveStatusForBroadcasters(ctx context.Context, broadcasterIDs []string) error
}

// BroadcasterRepositoryInterface defines the interface for broadcaster data access
type BroadcasterRepositoryInterface interface {
	GetAllFollowedBroadcasterIDs(ctx context.Context) ([]string, error)
}

// LiveStatusScheduler manages periodic live status updates
type LiveStatusScheduler struct {
	liveStatusService LiveStatusServiceInterface
	pool              *pgxpool.Pool
	interval          time.Duration
	stopChan          chan struct{}
	stopOnce          sync.Once
}

// NewLiveStatusScheduler creates a new live status scheduler
func NewLiveStatusScheduler(
	liveStatusService LiveStatusServiceInterface,
	pool *pgxpool.Pool,
	intervalSeconds int,
) *LiveStatusScheduler {
	return &LiveStatusScheduler{
		liveStatusService: liveStatusService,
		pool:              pool,
		interval:          time.Duration(intervalSeconds) * time.Second,
		stopChan:          make(chan struct{}),
	}
}

// Start begins the periodic live status update process
func (s *LiveStatusScheduler) Start(ctx context.Context) {
	log.Printf("Starting live status scheduler (interval: %v)", s.interval)

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Run initial check
	s.updateLiveStatuses(ctx)

	for {
		select {
		case <-ticker.C:
			s.updateLiveStatuses(ctx)
		case <-s.stopChan:
			log.Println("Live status scheduler stopped")
			return
		case <-ctx.Done():
			log.Println("Live status scheduler stopped due to context cancellation")
			return
		}
	}
}

// Stop stops the scheduler in a thread-safe manner
func (s *LiveStatusScheduler) Stop() {
	s.stopOnce.Do(func() {
		close(s.stopChan)
	})
}

// updateLiveStatuses executes a live status update operation
func (s *LiveStatusScheduler) updateLiveStatuses(ctx context.Context) {
	log.Println("Starting scheduled live status update...")
	startTime := time.Now()

	// Get all unique broadcaster IDs from follows
	query := `
		SELECT DISTINCT broadcaster_id 
		FROM broadcaster_follows
	`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		log.Printf("Failed to get followed broadcasters: %v", err)
		return
	}
	defer rows.Close()

	var broadcasterIDs []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			log.Printf("Failed to scan broadcaster ID: %v", err)
			continue
		}
		broadcasterIDs = append(broadcasterIDs, id)
	}

	if len(broadcasterIDs) == 0 {
		log.Println("No broadcasters to check")
		return
	}

	log.Printf("Checking live status for %d broadcasters", len(broadcasterIDs))

	err = s.liveStatusService.UpdateLiveStatusForBroadcasters(ctx, broadcasterIDs)
	if err != nil {
		log.Printf("Live status update failed: %v", err)
		return
	}

	duration := time.Since(startTime)
	log.Printf("Live status update completed in %v", duration)
}
