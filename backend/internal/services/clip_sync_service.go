package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/utils"
	"github.com/subculture-collective/clipper/pkg/twitch"
)

// ClipSyncService handles fetching and syncing clips from Twitch
type ClipSyncService struct {
	twitchClient *twitch.Client
	clipRepo     *repository.ClipRepository
}

// NewClipSyncService creates a new ClipSyncService
func NewClipSyncService(twitchClient *twitch.Client, clipRepo *repository.ClipRepository) *ClipSyncService {
	return &ClipSyncService{
		twitchClient: twitchClient,
		clipRepo:     clipRepo,
	}
}

// SyncStats contains statistics about a sync operation
type SyncStats struct {
	ClipsFetched int
	ClipsCreated int
	ClipsUpdated int
	ClipsSkipped int
	Errors       []string
	StartTime    time.Time
	EndTime      time.Time
}

// SyncClipsByGame fetches and syncs clips for a specific game
func (s *ClipSyncService) SyncClipsByGame(ctx context.Context, gameID string, hours int, limit int) (*SyncStats, error) {
	stats := &SyncStats{
		StartTime: time.Now(),
	}

	// Calculate time range
	endTime := time.Now()
	startTime := endTime.Add(-time.Duration(hours) * time.Hour)

	params := &twitch.ClipParams{
		GameID:    gameID,
		StartedAt: startTime,
		EndedAt:   endTime,
		First:     utils.Min(limit, 100), // Twitch API max is 100
	}

	log.Printf("Syncing clips for game %s from %v to %v", gameID, startTime, endTime)

	// Fetch clips with pagination
	totalFetched := 0
	for totalFetched < limit {
		clipsResp, err := s.twitchClient.GetClips(ctx, params)
		if err != nil {
			// Check if it's a 404 error (invalid/removed game category)
			if strings.Contains(err.Error(), "404") {
				stats.Errors = append(stats.Errors, fmt.Sprintf("Game category %s not found (404) - may have been removed or merged", gameID))
				log.Printf("[Warning] Game category %s returned 404 - skipping", gameID)
			} else {
				stats.Errors = append(stats.Errors, fmt.Sprintf("Failed to fetch clips: %v", err))
			}
			break
		}

		if len(clipsResp.Data) == 0 {
			break
		}

		// Process each clip
		for _, twitchClip := range clipsResp.Data {
			if err := s.processClip(ctx, &twitchClip, stats); err != nil {
				stats.Errors = append(stats.Errors, fmt.Sprintf("Failed to process clip %s: %v", twitchClip.ID, err))
			}
			totalFetched++
			if totalFetched >= limit {
				break
			}
		}

		// Check if there are more pages
		if clipsResp.Pagination.Cursor == "" || totalFetched >= limit {
			break
		}

		params.After = clipsResp.Pagination.Cursor
	}

	stats.ClipsFetched = totalFetched
	stats.EndTime = time.Now()

	log.Printf("Sync completed: fetched=%d created=%d updated=%d skipped=%d errors=%d duration=%v",
		stats.ClipsFetched, stats.ClipsCreated, stats.ClipsUpdated, stats.ClipsSkipped,
		len(stats.Errors), stats.EndTime.Sub(stats.StartTime))

	return stats, nil
}

// SyncClipsByBroadcaster fetches and syncs clips for a specific broadcaster
func (s *ClipSyncService) SyncClipsByBroadcaster(ctx context.Context, broadcasterID string, hours int, limit int) (*SyncStats, error) {
	stats := &SyncStats{
		StartTime: time.Now(),
	}

	// Calculate time range
	endTime := time.Now()
	startTime := endTime.Add(-time.Duration(hours) * time.Hour)

	params := &twitch.ClipParams{
		BroadcasterID: broadcasterID,
		StartedAt:     startTime,
		EndedAt:       endTime,
		First:         utils.Min(limit, 100),
	}

	log.Printf("Syncing clips for broadcaster %s from %v to %v", broadcasterID, startTime, endTime)

	// Fetch clips with pagination
	totalFetched := 0
	for totalFetched < limit {
		clipsResp, err := s.twitchClient.GetClips(ctx, params)
		if err != nil {
			stats.Errors = append(stats.Errors, fmt.Sprintf("Failed to fetch clips: %v", err))
			break
		}

		if len(clipsResp.Data) == 0 {
			break
		}

		// Process each clip
		for _, twitchClip := range clipsResp.Data {
			if err := s.processClip(ctx, &twitchClip, stats); err != nil {
				stats.Errors = append(stats.Errors, fmt.Sprintf("Failed to process clip %s: %v", twitchClip.ID, err))
			}
			totalFetched++
			if totalFetched >= limit {
				break
			}
		}

		// Check if there are more pages
		if clipsResp.Pagination.Cursor == "" || totalFetched >= limit {
			break
		}

		params.After = clipsResp.Pagination.Cursor
	}

	stats.ClipsFetched = totalFetched
	stats.EndTime = time.Now()

	log.Printf("Sync completed: fetched=%d created=%d updated=%d skipped=%d errors=%d duration=%v",
		stats.ClipsFetched, stats.ClipsCreated, stats.ClipsUpdated, stats.ClipsSkipped,
		len(stats.Errors), stats.EndTime.Sub(stats.StartTime))

	return stats, nil
}

// SyncTrendingClips fetches trending clips from multiple top games
func (s *ClipSyncService) SyncTrendingClips(ctx context.Context, hours int, clipsPerGame int) (*SyncStats, error) {
	stats := &SyncStats{
		StartTime: time.Now(),
	}

	// List of popular game IDs (top games on Twitch as of 2024)
	// In a real implementation, this could be fetched dynamically from Twitch's Get Top Games endpoint
	popularGameIDs := []string{
		"32982",  // Grand Theft Auto V
		"33214",  // Fortnite
		"516575", // Valorant
		"21779",  // League of Legends
		"27471",  // Minecraft
		"512710", // Call of Duty: Warzone
		"511224", // Apex Legends
		"29595",  // Dota 2
		"488552", // Overwatch 2 (Note: This ID may return 404 if category was removed/merged)
		"518203", // Sports
	}

	log.Printf("Syncing trending clips from %d games, %d clips per game", len(popularGameIDs), clipsPerGame)

	for _, gameID := range popularGameIDs {
		gameStats, err := s.SyncClipsByGame(ctx, gameID, hours, clipsPerGame)
		if err != nil {
			// Log warning but continue with other games
			log.Printf("[Warning] Failed to sync game %s: %v", gameID, err)
			stats.Errors = append(stats.Errors, fmt.Sprintf("Failed to sync game %s: %v", gameID, err))
			continue
		}

		// Aggregate stats
		stats.ClipsFetched += gameStats.ClipsFetched
		stats.ClipsCreated += gameStats.ClipsCreated
		stats.ClipsUpdated += gameStats.ClipsUpdated
		stats.ClipsSkipped += gameStats.ClipsSkipped
		stats.Errors = append(stats.Errors, gameStats.Errors...)
	}

	stats.EndTime = time.Now()

	log.Printf("Trending sync completed: fetched=%d created=%d updated=%d skipped=%d errors=%d duration=%v",
		stats.ClipsFetched, stats.ClipsCreated, stats.ClipsUpdated, stats.ClipsSkipped,
		len(stats.Errors), stats.EndTime.Sub(stats.StartTime))

	return stats, nil
}

// FetchClipByURL fetches a single clip by its Twitch URL or ID
func (s *ClipSyncService) FetchClipByURL(ctx context.Context, clipURLOrID string) (*models.Clip, error) {
	// Extract clip ID from URL if needed
	clipID := ExtractClipID(clipURLOrID)
	if clipID == "" {
		return nil, fmt.Errorf("invalid clip URL or ID: %s", clipURLOrID)
	}

	// Fetch from Twitch
	params := &twitch.ClipParams{
		ClipIDs: []string{clipID},
	}

	clipsResp, err := s.twitchClient.GetClips(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch clip from Twitch: %w", err)
	}

	if len(clipsResp.Data) == 0 {
		return nil, fmt.Errorf("clip not found: %s", clipID)
	}

	twitchClip := clipsResp.Data[0]

	// Check if already exists
	exists, err := s.clipRepo.ExistsByTwitchClipID(ctx, twitchClip.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to check clip existence: %w", err)
	}

	if exists {
		// Return existing clip
		return s.clipRepo.GetByTwitchClipID(ctx, twitchClip.ID)
	}

	// Transform and save
	clip := transformTwitchClip(&twitchClip)
	if err := s.clipRepo.Create(ctx, clip); err != nil {
		return nil, fmt.Errorf("failed to save clip: %w", err)
	}

	return clip, nil
}

// processClip processes a single clip from Twitch (create or update)
func (s *ClipSyncService) processClip(ctx context.Context, twitchClip *twitch.Clip, stats *SyncStats) error {
	// Check if clip already exists
	exists, err := s.clipRepo.ExistsByTwitchClipID(ctx, twitchClip.ID)
	if err != nil {
		return fmt.Errorf("failed to check clip existence: %w", err)
	}

	if exists {
		// Update view count for existing clip
		if err := s.clipRepo.UpdateViewCount(ctx, twitchClip.ID, twitchClip.ViewCount); err != nil {
			return fmt.Errorf("failed to update view count: %w", err)
		}
		stats.ClipsUpdated++
		return nil
	}

	// Transform Twitch clip to our model
	clip := transformTwitchClip(twitchClip)

	// Save to database
	if err := s.clipRepo.Create(ctx, clip); err != nil {
		return fmt.Errorf("failed to create clip: %w", err)
	}

	stats.ClipsCreated++
	return nil
}

// transformTwitchClip converts a Twitch API clip to our database model
func transformTwitchClip(twitchClip *twitch.Clip) *models.Clip {
	return &models.Clip{
		ID:              uuid.New(),
		TwitchClipID:    twitchClip.ID,
		TwitchClipURL:   twitchClip.URL,
		EmbedURL:        twitchClip.EmbedURL,
		Title:           twitchClip.Title,
		CreatorName:     twitchClip.CreatorName,
		CreatorID:       utils.StringPtr(twitchClip.CreatorID),
		BroadcasterName: twitchClip.BroadcasterName,
		BroadcasterID:   utils.StringPtr(twitchClip.BroadcasterID),
		GameID:          utils.StringPtr(twitchClip.GameID),
		GameName:        nil, // Will be enriched separately if needed
		Language:        utils.StringPtr(twitchClip.Language),
		ThumbnailURL:    utils.StringPtr(twitchClip.ThumbnailURL),
		Duration:        utils.Float64Ptr(twitchClip.Duration),
		ViewCount:       twitchClip.ViewCount,
		CreatedAt:       twitchClip.CreatedAt,
		ImportedAt:      time.Now(),
		VoteScore:       0,
		CommentCount:    0,
		FavoriteCount:   0,
		IsFeatured:      false,
		IsNSFW:          false,
		IsRemoved:       false,
		RemovedReason:   nil,
	}
}

// ExtractClipID extracts the clip ID from a Twitch clip URL or returns the ID if already provided
func ExtractClipID(clipURLOrID string) string {
	// If it's already just an ID (alphanumeric), return it
	if !strings.Contains(clipURLOrID, "/") && !strings.Contains(clipURLOrID, "twitch.tv") {
		return clipURLOrID
	}

	// Handle full URLs: https://www.twitch.tv/username/clip/ClipIDHere
	// or https://clips.twitch.tv/ClipIDHere
	parts := strings.Split(clipURLOrID, "/")
	if len(parts) > 0 {
		// Get the last non-empty part
		for i := len(parts) - 1; i >= 0; i-- {
			if parts[i] != "" && parts[i] != "clip" {
				// Remove query parameters if present
				clipID := strings.Split(parts[i], "?")[0]
				return clipID
			}
		}
	}

	return ""
}

// Helper functions
func float64Ptr(f float64) *float64 {
	if f == 0 {
		return nil
	}
	return &f
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
