package services

import (
	"context"
	"database/sql"
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
	broadcasterRepo     *repository.BroadcasterRepository
	twitchClient        *twitch.Client
	notificationService *NotificationService
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

// SetNotificationService sets the notification service (for dependency injection after initialization)
func (s *LiveStatusService) SetNotificationService(notificationService *NotificationService) {
	s.notificationService = notificationService
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
			// Log error to sync log
			for _, broadcasterID := range batch {
				errMsg := err.Error()
				s.logSyncEvent(ctx, broadcasterID, nil, &errMsg)
			}
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
			// Get previous sync status to detect changes
			oldSyncStatus, err := s.broadcasterRepo.GetSyncStatus(ctx, broadcasterID)
			if err != nil && err != sql.ErrNoRows {
				log.Printf("Failed to get previous sync status for broadcaster %s: %v", broadcasterID, err)
			}

			// Prepare new status
			status := &models.BroadcasterLiveStatus{
				BroadcasterID: broadcasterID,
				IsLive:        false,
				ViewerCount:   0,
				LastChecked:   now,
			}

			syncStatus := &models.BroadcasterSyncStatus{
				BroadcasterID: broadcasterID,
				IsLive:        false,
				LastSynced:    now,
				ViewerCount:   0,
			}

			var statusChange *string
			if stream, isLive := liveMap[broadcasterID]; isLive && stream.Type == "live" {
				status.IsLive = true
				status.UserLogin = &stream.UserLogin
				status.UserName = &stream.UserName
				status.StreamTitle = &stream.Title
				status.GameName = &stream.GameName
				status.ViewerCount = stream.ViewerCount
				status.StartedAt = &stream.StartedAt

				syncStatus.IsLive = true
				syncStatus.StreamStartedAt = &stream.StartedAt
				syncStatus.GameName = &stream.GameName
				syncStatus.ViewerCount = stream.ViewerCount
				syncStatus.StreamTitle = &stream.Title

				// Detect status change: offline -> live
				if oldSyncStatus == nil || !oldSyncStatus.IsLive {
					changeMsg := "went_live"
					statusChange = &changeMsg
					// Notify followers
					s.notifyFollowers(ctx, broadcasterID, stream)
				}
			} else {
				// Broadcaster is offline
				if oldSyncStatus != nil && oldSyncStatus.IsLive {
					changeMsg := "went_offline"
					statusChange = &changeMsg
				}
			}

			// Update live status
			if err := s.broadcasterRepo.UpsertLiveStatus(ctx, status); err != nil {
				log.Printf("Failed to update live status for broadcaster %s: %v", broadcasterID, err)
			}

			// Update sync status
			if err := s.broadcasterRepo.UpsertSyncStatus(ctx, syncStatus); err != nil {
				log.Printf("Failed to update sync status for broadcaster %s: %v", broadcasterID, err)
			}

			// Log sync event if there was a status change
			if statusChange != nil {
				s.logSyncEvent(ctx, broadcasterID, statusChange, nil)
			}
		}
	}

	return nil
}

// notifyFollowers sends notifications to all followers when a broadcaster goes live
func (s *LiveStatusService) notifyFollowers(ctx context.Context, broadcasterID string, stream *twitch.Stream) {
	if s.notificationService == nil {
		log.Printf("Notification service not available, skipping notifications for broadcaster %s", broadcasterID)
		return
	}

	// Get all followers of this broadcaster
	followerIDs, err := s.broadcasterRepo.GetFollowerUserIDs(ctx, broadcasterID)
	if err != nil {
		log.Printf("Failed to get followers for broadcaster %s: %v", broadcasterID, err)
		return
	}

	if len(followerIDs) == 0 {
		return
	}

	// Prepare notification content
	broadcasterName := stream.UserName
	if broadcasterName == "" {
		broadcasterName = stream.UserLogin
	}

	title := fmt.Sprintf("%s is now live!", broadcasterName)
	message := stream.Title
	if message == "" {
		message = "Streaming now on Twitch"
	}

	// Add game info if available
	if stream.GameName != "" {
		message = fmt.Sprintf("%s - Playing %s", message, stream.GameName)
	}

	// Create link to Twitch channel
	link := fmt.Sprintf("https://twitch.tv/%s", stream.UserLogin)

	// Send notification to each follower
	for _, followerID := range followerIDs {
		_, err := s.notificationService.CreateNotification(
			ctx,
			followerID,
			models.NotificationTypeBroadcasterLive,
			title,
			message,
			&link,
			nil, // no source user
			nil, // no source content
			nil, // no source content type
		)
		if err != nil {
			log.Printf("Failed to send notification to user %s for broadcaster %s: %v", followerID, broadcasterID, err)
		}
	}

	log.Printf("Sent live notifications for broadcaster %s (%s) to %d followers", broadcasterID, broadcasterName, len(followerIDs))
}

// logSyncEvent logs a sync event to the database
func (s *LiveStatusService) logSyncEvent(ctx context.Context, broadcasterID string, statusChange, errorMsg *string) {
	syncLog := &models.BroadcasterSyncLog{
		ID:            uuid.New(),
		BroadcasterID: broadcasterID,
		SyncTime:      time.Now(),
		StatusChange:  statusChange,
		Error:         errorMsg,
		CreatedAt:     time.Now(),
	}

	if err := s.broadcasterRepo.CreateSyncLog(ctx, syncLog); err != nil {
		log.Printf("Failed to create sync log for broadcaster %s: %v", broadcasterID, err)
	}
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
