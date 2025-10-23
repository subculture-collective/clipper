package services

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// ClipService handles business logic for clips
type ClipService struct {
	clipRepo     *repository.ClipRepository
	voteRepo     *repository.VoteRepository
	favoriteRepo *repository.FavoriteRepository
	userRepo     *repository.UserRepository
	redisClient  *redispkg.Client
}

// NewClipService creates a new ClipService
func NewClipService(
	clipRepo *repository.ClipRepository,
	voteRepo *repository.VoteRepository,
	favoriteRepo *repository.FavoriteRepository,
	userRepo *repository.UserRepository,
	redisClient *redispkg.Client,
) *ClipService {
	return &ClipService{
		clipRepo:     clipRepo,
		voteRepo:     voteRepo,
		favoriteRepo: favoriteRepo,
		userRepo:     userRepo,
		redisClient:  redisClient,
	}
}

// ClipWithUserData represents a clip with user-specific data
type ClipWithUserData struct {
	models.Clip
	UserVote       *int16 `json:"user_vote,omitempty"`
	IsFavorited    bool   `json:"is_favorited"`
	UpvoteCount    int    `json:"upvote_count"`
	DownvoteCount  int    `json:"downvote_count"`
}

// GetClip retrieves a single clip with user data
func (s *ClipService) GetClip(ctx context.Context, clipID uuid.UUID, userID *uuid.UUID) (*ClipWithUserData, error) {
	clip, err := s.clipRepo.GetByID(ctx, clipID)
	if err != nil {
		return nil, err
	}

	clipWithData := &ClipWithUserData{
		Clip: *clip,
	}

	// Get vote counts
	upvotes, downvotes, err := s.voteRepo.GetVoteCounts(ctx, clipID)
	if err == nil {
		clipWithData.UpvoteCount = upvotes
		clipWithData.DownvoteCount = downvotes
	}

	// Get user-specific data if authenticated
	if userID != nil {
		vote, err := s.voteRepo.GetVote(ctx, *userID, clipID)
		if err == nil && vote != nil {
			clipWithData.UserVote = &vote.VoteType
		}

		isFavorited, err := s.favoriteRepo.IsFavorited(ctx, *userID, clipID)
		if err == nil {
			clipWithData.IsFavorited = isFavorited
		}
	}

	// Increment view count (async, don't block on errors)
	go func() {
		_ = s.clipRepo.IncrementViewCount(context.Background(), clipID)
	}()

	return clipWithData, nil
}

// ListClips retrieves clips with filters and pagination
func (s *ClipService) ListClips(ctx context.Context, filters repository.ClipFilters, page, limit int, userID *uuid.UUID) ([]ClipWithUserData, int, error) {
	// Check cache for non-user-specific queries
	cacheKey := s.buildCacheKey(filters, page, limit)
	var cachedClips []models.Clip
	var cachedTotal int

	if userID == nil {
		cached, err := s.redisClient.Get(ctx, cacheKey)
		if err == nil && cached != "" {
			var cacheData struct {
				Clips []models.Clip `json:"clips"`
				Total int           `json:"total"`
			}
			if json.Unmarshal([]byte(cached), &cacheData) == nil {
				cachedClips = cacheData.Clips
				cachedTotal = cacheData.Total
			}
		}
	}

	var clips []models.Clip
	var total int
	var err error

	if cachedClips != nil {
		clips = cachedClips
		total = cachedTotal
	} else {
		offset := (page - 1) * limit
		clips, total, err = s.clipRepo.ListWithFilters(ctx, filters, limit, offset)
		if err != nil {
			return nil, 0, err
		}

		// Cache non-user-specific results
		if userID == nil {
			cacheData := struct {
				Clips []models.Clip `json:"clips"`
				Total int           `json:"total"`
			}{
				Clips: clips,
				Total: total,
			}
			if data, err := json.Marshal(cacheData); err == nil {
				ttl := s.getCacheTTL(filters.Sort)
				_ = s.redisClient.Set(ctx, cacheKey, string(data), ttl)
			}
		}
	}

	// Enrich with user data
	clipsWithData := make([]ClipWithUserData, len(clips))
	for i, clip := range clips {
		clipsWithData[i] = ClipWithUserData{
			Clip: clip,
		}

		// Get vote counts
		upvotes, downvotes, err := s.voteRepo.GetVoteCounts(ctx, clip.ID)
		if err == nil {
			clipsWithData[i].UpvoteCount = upvotes
			clipsWithData[i].DownvoteCount = downvotes
		}

		// Get user-specific data if authenticated
		if userID != nil {
			vote, err := s.voteRepo.GetVote(ctx, *userID, clip.ID)
			if err == nil && vote != nil {
				clipsWithData[i].UserVote = &vote.VoteType
			}

			isFavorited, err := s.favoriteRepo.IsFavorited(ctx, *userID, clip.ID)
			if err == nil {
				clipsWithData[i].IsFavorited = isFavorited
			}
		}
	}

	return clipsWithData, total, nil
}

// VoteOnClip handles voting on a clip
func (s *ClipService) VoteOnClip(ctx context.Context, userID, clipID uuid.UUID, voteType int16) error {
	// Validate vote type
	if voteType != -1 && voteType != 0 && voteType != 1 {
		return fmt.Errorf("invalid vote type: must be -1, 0, or 1")
	}

	// Check if clip exists
	_, err := s.clipRepo.GetByID(ctx, clipID)
	if err != nil {
		return err
	}

	// Get old vote if exists
	oldVote, _ := s.voteRepo.GetVote(ctx, userID, clipID)

	if voteType == 0 {
		// Remove vote
		if oldVote != nil {
			return s.voteRepo.DeleteVote(ctx, userID, clipID)
		}
		return nil
	}

	// Upsert vote
	err = s.voteRepo.UpsertVote(ctx, userID, clipID, voteType)
	if err != nil {
		return err
	}

	// Update user karma (async)
	go func() {
		karmaChange := 0
		if oldVote == nil {
			// New vote
			if voteType == 1 {
				karmaChange = 1
			} else {
				karmaChange = -1
			}
		} else {
			// Changed vote
			if oldVote.VoteType == 1 && voteType == -1 {
				karmaChange = -2
			} else if oldVote.VoteType == -1 && voteType == 1 {
				karmaChange = 2
			}
		}
		
		if karmaChange != 0 {
			_ = s.userRepo.UpdateKarma(context.Background(), userID, karmaChange)
		}
	}()

	// Invalidate cache
	s.invalidateCache(ctx)

	return nil
}

// AddFavorite adds a clip to user's favorites
func (s *ClipService) AddFavorite(ctx context.Context, userID, clipID uuid.UUID) error {
	// Check if clip exists
	_, err := s.clipRepo.GetByID(ctx, clipID)
	if err != nil {
		return err
	}

	return s.favoriteRepo.Create(ctx, userID, clipID)
}

// RemoveFavorite removes a clip from user's favorites
func (s *ClipService) RemoveFavorite(ctx context.Context, userID, clipID uuid.UUID) error {
	return s.favoriteRepo.Delete(ctx, userID, clipID)
}

// GetRelatedClips retrieves related clips
func (s *ClipService) GetRelatedClips(ctx context.Context, clipID uuid.UUID, limit int) ([]models.Clip, error) {
	return s.clipRepo.GetRelated(ctx, clipID, limit)
}

// UpdateClip updates clip properties (admin only)
func (s *ClipService) UpdateClip(ctx context.Context, clipID uuid.UUID, updates map[string]interface{}) error {
	// Validate allowed fields
	allowedFields := map[string]bool{
		"is_featured":    true,
		"is_nsfw":        true,
		"is_removed":     true,
		"removed_reason": true,
	}

	for field := range updates {
		if !allowedFields[field] {
			return fmt.Errorf("field '%s' is not allowed to be updated", field)
		}
	}

	err := s.clipRepo.Update(ctx, clipID, updates)
	if err != nil {
		return err
	}

	// Invalidate cache
	s.invalidateCache(ctx)

	return nil
}

// DeleteClip soft deletes a clip (admin only)
func (s *ClipService) DeleteClip(ctx context.Context, clipID uuid.UUID, reason string) error {
	err := s.clipRepo.SoftDelete(ctx, clipID, reason)
	if err != nil {
		return err
	}

	// Invalidate cache
	s.invalidateCache(ctx)

	return nil
}

// Helper functions

func (s *ClipService) buildCacheKey(filters repository.ClipFilters, page, limit int) string {
	key := fmt.Sprintf("clips:list:%s:page:%d:limit:%d", filters.Sort, page, limit)

	if filters.GameID != nil {
		key += fmt.Sprintf(":game:%s", *filters.GameID)
	}
	if filters.BroadcasterID != nil {
		key += fmt.Sprintf(":broadcaster:%s", *filters.BroadcasterID)
	}
	if filters.Tag != nil {
		key += fmt.Sprintf(":tag:%s", *filters.Tag)
	}
	if filters.Search != nil {
		key += fmt.Sprintf(":search:%s", *filters.Search)
	}
	if filters.Timeframe != nil {
		key += fmt.Sprintf(":timeframe:%s", *filters.Timeframe)
	}

	return key
}

func (s *ClipService) getCacheTTL(sort string) time.Duration {
	switch sort {
	case "hot":
		return 5 * time.Minute
	case "new":
		return 2 * time.Minute
	case "top":
		return 15 * time.Minute
	case "rising":
		return 3 * time.Minute
	default:
		return 5 * time.Minute
	}
}

func (s *ClipService) invalidateCache(ctx context.Context) {
	// Invalidate all clip list caches
	pattern := "clips:list:*"
	_ = s.redisClient.DeletePattern(ctx, pattern)
}
