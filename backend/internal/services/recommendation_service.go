package services

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

// RecommendationService handles recommendation logic
type RecommendationService struct {
	repo                *repository.RecommendationRepository
	redisClient         *redis.Client
	contentWeight       float64
	collaborativeWeight float64
	trendingWeight      float64
}

// NewRecommendationService creates a new recommendation service
func NewRecommendationService(
	repo *repository.RecommendationRepository,
	redisClient *redis.Client,
) *RecommendationService {
	return &RecommendationService{
		repo:                repo,
		redisClient:         redisClient,
		contentWeight:       0.5,
		collaborativeWeight: 0.3,
		trendingWeight:      0.2,
	}
}

// GetRecommendations returns personalized clip recommendations
func (s *RecommendationService) GetRecommendations(
	ctx context.Context,
	userID uuid.UUID,
	algorithm string,
	limit int,
) (*models.RecommendationResponse, error) {
	startTime := time.Now()

	// Set default limit
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	// Set default algorithm
	if algorithm == "" {
		algorithm = models.AlgorithmHybrid
	}

	// Check cache first
	cacheKey := fmt.Sprintf("recommendations:%s:%s:%d", userID.String(), algorithm, limit)
	cachedData, err := s.redisClient.Get(ctx, cacheKey).Result()
	if err == nil && cachedData != "" {
		var response models.RecommendationResponse
		if err := json.Unmarshal([]byte(cachedData), &response); err == nil {
			response.Metadata.CacheHit = true
			response.Metadata.ProcessingTimeMs = time.Since(startTime).Milliseconds()
			return &response, nil
		}
	}

	// Check if user has interaction history
	hasInteractions, err := s.repo.HasUserInteractions(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to check user interactions: %w", err)
	}

	var recommendations []models.ClipRecommendation
	isColdStart := !hasInteractions
	diversityApplied := false

	if isColdStart {
		// Cold start: return trending clips
		recommendations, err = s.getColdStartRecommendations(ctx, limit)
		if err != nil {
			return nil, err
		}
	} else {
		// Generate recommendations based on algorithm
		switch algorithm {
		case models.AlgorithmContent:
			recommendations, err = s.getContentBasedRecommendations(ctx, userID, limit)
		case models.AlgorithmCollaborative:
			recommendations, err = s.getCollaborativeRecommendations(ctx, userID, limit)
		case models.AlgorithmTrending:
			recommendations, err = s.getColdStartRecommendations(ctx, limit)
		case models.AlgorithmHybrid:
			recommendations, err = s.getHybridRecommendations(ctx, userID, limit)
			diversityApplied = true
		default:
			recommendations, err = s.getHybridRecommendations(ctx, userID, limit)
			diversityApplied = true
		}

		if err != nil {
			return nil, err
		}

		// Apply diversity if not already applied
		if !diversityApplied && len(recommendations) > 0 {
			recommendations = s.enforceGameDiversity(recommendations, limit)
			diversityApplied = true
		}
	}

	response := &models.RecommendationResponse{
		Recommendations: recommendations,
		Metadata: models.RecommendationMetadata{
			AlgorithmUsed:    algorithm,
			DiversityApplied: diversityApplied,
			ColdStart:        isColdStart,
			CacheHit:         false,
			ProcessingTimeMs: time.Since(startTime).Milliseconds(),
		},
	}

	// Cache the response for 24 hours
	responseJSON, err := json.Marshal(response)
	if err == nil {
		s.redisClient.Set(ctx, cacheKey, responseJSON, 24*time.Hour)
	}

	return response, nil
}

// getContentBasedRecommendations generates content-based recommendations
func (s *RecommendationService) getContentBasedRecommendations(
	ctx context.Context,
	userID uuid.UUID,
	limit int,
) ([]models.ClipRecommendation, error) {
	// Get user preferences
	preferences, err := s.repo.GetUserPreferences(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user preferences: %w", err)
	}

	// If no preferences, try to build from interactions
	if len(preferences.FavoriteGames) == 0 && len(preferences.FollowedStreamers) == 0 {
		if err := s.repo.UpdateUserPreferencesFromInteractions(ctx, userID); err == nil {
			preferences, _ = s.repo.GetUserPreferences(ctx, userID)
		}
	}

	// Get content-based recommendations
	scores, err := s.repo.GetContentBasedRecommendations(ctx, userID, preferences, nil, limit*2)
	if err != nil {
		return nil, fmt.Errorf("failed to get content-based recommendations: %w", err)
	}

	return s.buildRecommendations(ctx, scores, "content", limit)
}

// getCollaborativeRecommendations generates collaborative filtering recommendations
func (s *RecommendationService) getCollaborativeRecommendations(
	ctx context.Context,
	userID uuid.UUID,
	limit int,
) ([]models.ClipRecommendation, error) {
	scores, err := s.repo.GetCollaborativeRecommendations(ctx, userID, nil, limit*2)
	if err != nil {
		return nil, fmt.Errorf("failed to get collaborative recommendations: %w", err)
	}

	return s.buildRecommendations(ctx, scores, "collaborative", limit)
}

// getColdStartRecommendations generates recommendations for new users
func (s *RecommendationService) getColdStartRecommendations(
	ctx context.Context,
	limit int,
) ([]models.ClipRecommendation, error) {
	scores, err := s.repo.GetTrendingClips(ctx, nil, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get trending clips: %w", err)
	}

	return s.buildRecommendations(ctx, scores, "trending", limit)
}

// getHybridRecommendations generates hybrid recommendations combining multiple signals
func (s *RecommendationService) getHybridRecommendations(
	ctx context.Context,
	userID uuid.UUID,
	limit int,
) ([]models.ClipRecommendation, error) {
	// Get scores from different algorithms
	contentScores, _ := s.getScoresForHybrid(ctx, userID, models.AlgorithmContent, limit*2)
	collaborativeScores, _ := s.getScoresForHybrid(ctx, userID, models.AlgorithmCollaborative, limit*2)
	trendingScores, _ := s.getScoresForHybrid(ctx, userID, models.AlgorithmTrending, limit)

	// Merge and rank
	merged := s.mergeAndRank(contentScores, collaborativeScores, trendingScores)

	// Build recommendations
	recommendations, err := s.buildRecommendations(ctx, merged, "hybrid", limit*2)
	if err != nil {
		return nil, err
	}

	// Enforce game diversity
	recommendations = s.enforceGameDiversity(recommendations, limit)

	return recommendations, nil
}

// getScoresForHybrid helper to get scores for hybrid algorithm
func (s *RecommendationService) getScoresForHybrid(
	ctx context.Context,
	userID uuid.UUID,
	algorithm string,
	limit int,
) ([]models.ClipScore, error) {
	switch algorithm {
	case models.AlgorithmContent:
		preferences, err := s.repo.GetUserPreferences(ctx, userID)
		if err != nil {
			return nil, err
		}
		return s.repo.GetContentBasedRecommendations(ctx, userID, preferences, nil, limit)
	case models.AlgorithmCollaborative:
		return s.repo.GetCollaborativeRecommendations(ctx, userID, nil, limit)
	case models.AlgorithmTrending:
		return s.repo.GetTrendingClips(ctx, nil, limit)
	default:
		return nil, fmt.Errorf("unknown algorithm: %s", algorithm)
	}
}

// mergeAndRank merges scores from different algorithms
func (s *RecommendationService) mergeAndRank(
	contentScores []models.ClipScore,
	collaborativeScores []models.ClipScore,
	trendingScores []models.ClipScore,
) []models.ClipScore {
	scoreMap := make(map[uuid.UUID]float64)

	// Add weighted scores from each algorithm
	for _, score := range contentScores {
		scoreMap[score.ClipID] += score.SimilarityScore * s.contentWeight
	}
	for _, score := range collaborativeScores {
		scoreMap[score.ClipID] += score.SimilarityScore * s.collaborativeWeight
	}
	for _, score := range trendingScores {
		scoreMap[score.ClipID] += score.SimilarityScore * s.trendingWeight
	}

	// Convert map to slice
	var merged []models.ClipScore
	for clipID, score := range scoreMap {
		merged = append(merged, models.ClipScore{
			ClipID:          clipID,
			SimilarityScore: score,
		})
	}

	// Sort by score descending using standard library
	sort.Slice(merged, func(i, j int) bool {
		return merged[i].SimilarityScore > merged[j].SimilarityScore
	})

	// Assign ranks
	for i := range merged {
		merged[i].SimilarityRank = i + 1
	}

	return merged
}

// buildRecommendations converts ClipScores to ClipRecommendations
func (s *RecommendationService) buildRecommendations(
	ctx context.Context,
	scores []models.ClipScore,
	algorithm string,
	limit int,
) ([]models.ClipRecommendation, error) {
	if len(scores) == 0 {
		return []models.ClipRecommendation{}, nil
	}

	// Extract clip IDs
	clipIDs := make([]uuid.UUID, len(scores))
	for i, score := range scores {
		clipIDs[i] = score.ClipID
	}

	// Get clips
	clips, err := s.repo.GetClipsByIDs(ctx, clipIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to get clips: %w", err)
	}

	// Build recommendations map
	clipMap := make(map[uuid.UUID]models.Clip)
	for _, clip := range clips {
		clipMap[clip.ID] = clip
	}

	// Build recommendations maintaining order
	var recommendations []models.ClipRecommendation
	for _, score := range scores {
		if len(recommendations) >= limit {
			break
		}

		clip, exists := clipMap[score.ClipID]
		if !exists {
			continue
		}

		reason := s.generateReason(&clip, algorithm, score.SimilarityScore)

		recommendations = append(recommendations, models.ClipRecommendation{
			Clip:      clip,
			Score:     score.SimilarityScore,
			Reason:    reason,
			Algorithm: algorithm,
		})
	}

	return recommendations, nil
}

// enforceGameDiversity ensures game diversity in recommendations
func (s *RecommendationService) enforceGameDiversity(
	recommendations []models.ClipRecommendation,
	limit int,
) []models.ClipRecommendation {
	if len(recommendations) <= limit {
		return recommendations
	}

	gameCount := make(map[string]int)
	maxSameGame := 3 // Max 3 clips from same game in a row
	var diversified []models.ClipRecommendation

	for _, rec := range recommendations {
		if len(diversified) >= limit {
			break
		}

		gameID := ""
		if rec.Clip.GameID != nil {
			gameID = *rec.Clip.GameID
		}

		// Check if we've hit the limit for this game in recent recommendations
		recentCount := 0
		startIdx := len(diversified) - maxSameGame
		if startIdx < 0 {
			startIdx = 0
		}
		for i := startIdx; i < len(diversified); i++ {
			if diversified[i].Clip.GameID != nil && *diversified[i].Clip.GameID == gameID {
				recentCount++
			}
		}

		// Skip if we've already shown too many from this game recently
		if recentCount >= maxSameGame && gameCount[gameID] > 0 {
			continue
		}

		diversified = append(diversified, rec)
		gameCount[gameID]++
	}

	// If we don't have enough, add remaining without diversity check
	if len(diversified) < limit {
		for _, rec := range recommendations {
			if len(diversified) >= limit {
				break
			}

			// Check if already added
			found := false
			for _, d := range diversified {
				if d.Clip.ID == rec.Clip.ID {
					found = true
					break
				}
			}

			if !found {
				diversified = append(diversified, rec)
			}
		}
	}

	return diversified
}

// generateReason generates a human-readable reason for the recommendation
func (s *RecommendationService) generateReason(clip *models.Clip, algorithm string, score float64) string {
	reasons := []string{}

	if clip.GameName != nil && *clip.GameName != "" {
		reasons = append(reasons, fmt.Sprintf("Because you liked clips in %s", *clip.GameName))
	}

	if clip.BroadcasterName != "" {
		reasons = append(reasons, fmt.Sprintf("Because you watched %s", clip.BroadcasterName))
	}

	if len(reasons) == 0 {
		switch algorithm {
		case models.AlgorithmContent:
			reasons = append(reasons, "Based on your viewing history")
		case models.AlgorithmCollaborative:
			reasons = append(reasons, "Popular with users like you")
		case models.AlgorithmTrending:
			reasons = append(reasons, "Trending now")
		case models.AlgorithmHybrid:
			reasons = append(reasons, "Recommended for you")
		default:
			reasons = append(reasons, "You might like this")
		}
	}

	if len(reasons) > 0 {
		// Use hash of clip ID for deterministic selection
		h := 0
		for _, b := range clip.ID.String() {
			h = h*31 + int(b)
		}
		if h < 0 {
			h = -h
		}
		return reasons[h%len(reasons)]
	}

	return "Recommended for you"
}

// RecordInteraction records a user interaction with a clip
func (s *RecommendationService) RecordInteraction(
	ctx context.Context,
	interaction *models.UserClipInteraction,
) error {
	if err := s.repo.RecordInteraction(ctx, interaction); err != nil {
		return fmt.Errorf("failed to record interaction: %w", err)
	}

	// Invalidate cache for this user
	pattern := fmt.Sprintf("recommendations:%s:*", interaction.UserID.String())
	iter := s.redisClient.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		s.redisClient.Del(ctx, iter.Val())
	}
	if err := iter.Err(); err != nil {
		return fmt.Errorf("failed to scan cache keys: %w", err)
	}

	return nil
}

// GetUserPreferences retrieves user preferences
func (s *RecommendationService) GetUserPreferences(ctx context.Context, userID uuid.UUID) (*models.UserPreference, error) {
	return s.repo.GetUserPreferences(ctx, userID)
}

// UpdateUserPreferences updates user preferences
func (s *RecommendationService) UpdateUserPreferences(ctx context.Context, pref *models.UserPreference) error {
	if err := s.repo.UpdateUserPreferences(ctx, pref); err != nil {
		return fmt.Errorf("failed to update user preferences: %w", err)
	}

	// Invalidate cache for this user
	pattern := fmt.Sprintf("recommendations:%s:*", pref.UserID.String())
	iter := s.redisClient.Scan(ctx, 0, pattern, 100).Iterator()
	for iter.Next(ctx) {
		s.redisClient.Del(ctx, iter.Val())
	}
	if err := iter.Err(); err != nil {
		return fmt.Errorf("failed to scan cache keys: %w", err)
	}

	return nil
}
