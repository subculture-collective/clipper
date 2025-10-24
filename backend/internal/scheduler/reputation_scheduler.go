package scheduler

import (
	"context"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// ReputationServiceInterface defines the interface required by the scheduler
type ReputationServiceInterface interface {
	CheckAndAwardBadges(ctx context.Context, userID uuid.UUID) ([]string, error)
	UpdateUserStats(ctx context.Context, userID uuid.UUID) error
}

// ReputationScheduler manages periodic reputation-related tasks
type ReputationScheduler struct {
	reputationService ReputationServiceInterface
	userRepo          UserRepositoryInterface
	interval          time.Duration
	stopChan          chan struct{}
	stopOnce          sync.Once
}

// UserRepositoryInterface defines the interface for getting users
type UserRepositoryInterface interface {
	GetAllActiveUserIDs(ctx context.Context) ([]uuid.UUID, error)
}

// NewReputationScheduler creates a new reputation scheduler
func NewReputationScheduler(
	reputationService ReputationServiceInterface,
	userRepo UserRepositoryInterface,
	intervalHours int,
) *ReputationScheduler {
	return &ReputationScheduler{
		reputationService: reputationService,
		userRepo:          userRepo,
		interval:          time.Duration(intervalHours) * time.Hour,
		stopChan:          make(chan struct{}),
	}
}

// Start begins the periodic reputation tasks
func (s *ReputationScheduler) Start(ctx context.Context) {
	log.Printf("Starting reputation scheduler (interval: %v)", s.interval)

	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	// Run initial tasks
	s.runTasks(ctx)

	for {
		select {
		case <-ticker.C:
			s.runTasks(ctx)
		case <-s.stopChan:
			log.Println("Reputation scheduler stopped")
			return
		case <-ctx.Done():
			log.Println("Reputation scheduler stopped due to context cancellation")
			return
		}
	}
}

// Stop stops the scheduler in a thread-safe manner
func (s *ReputationScheduler) Stop() {
	s.stopOnce.Do(func() {
		close(s.stopChan)
	})
}

// runTasks executes reputation maintenance tasks
func (s *ReputationScheduler) runTasks(ctx context.Context) {
	log.Println("Starting scheduled reputation tasks...")
	startTime := time.Now()

	// Get all active user IDs
	userIDs, err := s.userRepo.GetAllActiveUserIDs(ctx)
	if err != nil {
		log.Printf("Failed to get active users: %v", err)
		return
	}

	badgesAwarded := 0
	statsUpdated := 0
	errors := 0

	// Process each user
	for _, userID := range userIDs {
		// Check and award badges
		badges, err := s.reputationService.CheckAndAwardBadges(ctx, userID)
		if err != nil {
			log.Printf("Failed to check badges for user %v: %v", userID, err)
			errors++
		} else if len(badges) > 0 {
			badgesAwarded += len(badges)
			log.Printf("Awarded %d badges to user %v: %v", len(badges), userID, badges)
		}

		// Update user stats
		err = s.reputationService.UpdateUserStats(ctx, userID)
		if err != nil {
			log.Printf("Failed to update stats for user %v: %v", userID, err)
			errors++
		} else {
			statsUpdated++
		}

		// Add a small delay to avoid overwhelming the database
		time.Sleep(10 * time.Millisecond)
	}

	duration := time.Since(startTime)
	log.Printf("Reputation tasks completed: users=%d badges_awarded=%d stats_updated=%d errors=%d duration=%v",
		len(userIDs), badgesAwarded, statsUpdated, errors, duration)
}
