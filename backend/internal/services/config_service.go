package services

import (
	"context"
	"fmt"
	"strconv"
	"sync"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/repository"
)

// EngagementConfig represents engagement scoring configuration
type EngagementConfig struct {
	VoteWeight     float64 `json:"vote_weight"`
	CommentWeight  float64 `json:"comment_weight"`
	FavoriteWeight float64 `json:"favorite_weight"`
	ViewWeight     float64 `json:"view_weight"`
}

// ConfigService handles dynamic application configuration
type ConfigService struct {
	repo              *repository.AppSettingsRepository
	mu                sync.RWMutex
	engagementConfig  *EngagementConfig
	engagementLoaded  bool
}

// NewConfigService creates a new ConfigService
func NewConfigService(repo *repository.AppSettingsRepository) *ConfigService {
	return &ConfigService{
		repo: repo,
	}
}

// GetEngagementConfig retrieves the current engagement scoring configuration
// Loads from database on first call, then caches the result
func (s *ConfigService) GetEngagementConfig(ctx context.Context) (*EngagementConfig, error) {
	s.mu.RLock()
	if s.engagementLoaded && s.engagementConfig != nil {
		config := *s.engagementConfig
		s.mu.RUnlock()
		return &config, nil
	}
	s.mu.RUnlock()

	// Need to load from database
	s.mu.Lock()
	defer s.mu.Unlock()

	// Double-check after acquiring write lock
	if s.engagementLoaded && s.engagementConfig != nil {
		config := *s.engagementConfig
		return &config, nil
	}

	settings, err := s.repo.GetByPrefix(ctx, "engagement_scoring.")
	if err != nil {
		return nil, fmt.Errorf("failed to load engagement config: %w", err)
	}

	config := &EngagementConfig{
		VoteWeight:     3.0,
		CommentWeight:  2.0,
		FavoriteWeight: 1.5,
		ViewWeight:     0.1,
	}

	for _, setting := range settings {
		var value float64
		if setting.ValueType == "number" {
			value, err = strconv.ParseFloat(setting.Value, 64)
			if err != nil {
				return nil, fmt.Errorf("invalid number value for %s: %w", setting.Key, err)
			}
		}

		switch setting.Key {
		case "engagement_scoring.vote_weight":
			config.VoteWeight = value
		case "engagement_scoring.comment_weight":
			config.CommentWeight = value
		case "engagement_scoring.favorite_weight":
			config.FavoriteWeight = value
		case "engagement_scoring.view_weight":
			config.ViewWeight = value
		}
	}

	s.engagementConfig = config
	s.engagementLoaded = true
	return config, nil
}

// UpdateEngagementConfig updates engagement scoring weights and invalidates cache
func (s *ConfigService) UpdateEngagementConfig(ctx context.Context, config *EngagementConfig, updatedBy uuid.UUID) error {
	// Validate weights
	if config.VoteWeight < 0 || config.CommentWeight < 0 || config.FavoriteWeight < 0 || config.ViewWeight < 0 {
		return fmt.Errorf("weights must be non-negative")
	}

	// Update each weight in database
	updates := map[string]float64{
		"engagement_scoring.vote_weight":     config.VoteWeight,
		"engagement_scoring.comment_weight":  config.CommentWeight,
		"engagement_scoring.favorite_weight": config.FavoriteWeight,
		"engagement_scoring.view_weight":     config.ViewWeight,
	}

	for key, value := range updates {
		valueStr := strconv.FormatFloat(value, 'f', -1, 64)
		if err := s.repo.Set(ctx, key, valueStr, "number", &updatedBy); err != nil {
			return fmt.Errorf("failed to update %s: %w", key, err)
		}
	}

	// Invalidate cache and reload
	s.mu.Lock()
	s.engagementConfig = config
	s.engagementLoaded = true
	s.mu.Unlock()

	return nil
}
