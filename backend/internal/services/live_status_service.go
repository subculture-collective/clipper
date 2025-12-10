package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/twitch"
)

// LiveStatusService handles live status updates and queries
type LiveStatusService struct {
	broadcasterRepo *repository.BroadcasterRepository
	twitchClient    *twitch.Client
}

// NewLiveStatusService creates a new live status service
func NewLiveStatusService(
	broadcasterRepo *repository.BroadcasterRepository,
	twitchClient *twitch.Client,
) *LiveStatusService {
	return &LiveStatusService{
		broadcasterRepo: broadcasterRepo,
		twitchClient:    twitchClient,
	}
}

// UpdateLiveStatusForUser checks and updates live status for all broadcasters a user follows
func (s *LiveStatusService) UpdateLiveStatusForUser(ctx context.Context, userID uuid.UUID) error {
	// Get followed broadcaster IDs
	broadcasterIDs, err := s.broadcasterRepo.GetFollowedBroadcasterIDs(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to get followed broadcasters: %w", err)
	}

	if len(broadcasterIDs) == 0 {
		return nil
	}

	return s.UpdateLiveStatusForBroadcasters(ctx, broadcasterIDs)
}

// UpdateLiveStatusForBroadcasters updates live status for a list of broadcaster IDs
func (s *LiveStatusService) UpdateLiveStatusForBroadcasters(ctx context.Context, broadcasterIDs []string) error {
	if len(broadcasterIDs) == 0 {
		return nil
	}

	// Fetch stream data from Twitch (max 100 at a time)
	batchSize := 100
	totalBatches := (len(broadcasterIDs) + batchSize - 1) / batchSize
	for i := 0; i < len(broadcasterIDs); i += batchSize {
		end := i + batchSize
		if end > len(broadcasterIDs) {
			end = len(broadcasterIDs)
		}
		batch := broadcasterIDs[i:end]
		batchNum := (i / batchSize) + 1

		streams, err := s.twitchClient.GetStreams(ctx, batch)
		if err != nil {
			log.Printf("Failed to fetch streams for batch %d/%d: %v", batchNum, totalBatches, err)
			continue
		}

		// Create map of live streams
		liveMap := make(map[string]*twitch.Stream)
		for i := range streams.Data {
			stream := &streams.Data[i]
			liveMap[stream.UserID] = stream
		}

		// Update status for each broadcaster in batch
		now := time.Now()
		for _, broadcasterID := range batch {
			status := &models.BroadcasterLiveStatus{
				BroadcasterID: broadcasterID,
				IsLive:        false,
				ViewerCount:   0,
				LastChecked:   now,
			}

			if stream, isLive := liveMap[broadcasterID]; isLive && stream.Type == "live" {
				status.IsLive = true
				status.UserLogin = &stream.UserLogin
				status.UserName = &stream.UserName
				status.StreamTitle = &stream.Title
				status.GameName = &stream.GameName
				status.ViewerCount = stream.ViewerCount
				status.StartedAt = &stream.StartedAt
			}

			if err := s.broadcasterRepo.UpsertLiveStatus(ctx, status); err != nil {
				log.Printf("Failed to update live status for broadcaster %s: %v", broadcasterID, err)
			}
		}
	}

	return nil
}

// GetLiveStatus retrieves live status for a broadcaster
func (s *LiveStatusService) GetLiveStatus(ctx context.Context, broadcasterID string) (*models.BroadcasterLiveStatus, error) {
	return s.broadcasterRepo.GetLiveStatus(ctx, broadcasterID)
}

// ListLiveBroadcasters retrieves all currently live broadcasters
func (s *LiveStatusService) ListLiveBroadcasters(ctx context.Context, limit, offset int) ([]models.BroadcasterLiveStatus, int, error) {
	return s.broadcasterRepo.ListLiveBroadcasters(ctx, limit, offset)
}

// GetFollowedLiveBroadcasters retrieves live broadcasters that a user follows
func (s *LiveStatusService) GetFollowedLiveBroadcasters(ctx context.Context, userID uuid.UUID) ([]models.BroadcasterLiveStatus, error) {
	return s.broadcasterRepo.GetFollowedLiveBroadcasters(ctx, userID)
}
