package services

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/subculture-collective/clipper/internal/models"
)

func TestAdService_filterByTargeting(t *testing.T) {
	s := &AdService{}

	tests := []struct {
		name     string
		ads      []models.Ad
		req      models.AdSelectionRequest
		expected int
	}{
		{
			name: "No targeting criteria - all ads pass",
			ads: []models.Ad{
				{ID: uuid.New(), Name: "Ad 1", TargetingCriteria: nil},
				{ID: uuid.New(), Name: "Ad 2", TargetingCriteria: nil},
			},
			req:      models.AdSelectionRequest{Platform: "web"},
			expected: 2,
		},
		{
			name: "Game targeting - matches",
			ads: []models.Ad{
				{
					ID:   uuid.New(),
					Name: "Ad 1",
					TargetingCriteria: map[string]interface{}{
						"game_ids": []interface{}{"game123", "game456"},
					},
				},
			},
			req: models.AdSelectionRequest{
				Platform: "web",
				GameID:   strPtr("game123"),
			},
			expected: 1,
		},
		{
			name: "Game targeting - no match",
			ads: []models.Ad{
				{
					ID:   uuid.New(),
					Name: "Ad 1",
					TargetingCriteria: map[string]interface{}{
						"game_ids": []interface{}{"game123", "game456"},
					},
				},
			},
			req: models.AdSelectionRequest{
				Platform: "web",
				GameID:   strPtr("game789"),
			},
			expected: 0,
		},
		{
			name: "Language targeting - matches",
			ads: []models.Ad{
				{
					ID:   uuid.New(),
					Name: "Ad 1",
					TargetingCriteria: map[string]interface{}{
						"languages": []interface{}{"en", "es"},
					},
				},
			},
			req: models.AdSelectionRequest{
				Platform: "web",
				Language: strPtr("en"),
			},
			expected: 1,
		},
		{
			name: "Platform targeting - matches",
			ads: []models.Ad{
				{
					ID:   uuid.New(),
					Name: "Ad 1",
					TargetingCriteria: map[string]interface{}{
						"platforms": []interface{}{"web", "ios"},
					},
				},
			},
			req: models.AdSelectionRequest{
				Platform: "web",
			},
			expected: 1,
		},
		{
			name: "Platform targeting - no match",
			ads: []models.Ad{
				{
					ID:   uuid.New(),
					Name: "Ad 1",
					TargetingCriteria: map[string]interface{}{
						"platforms": []interface{}{"ios", "android"},
					},
				},
			},
			req: models.AdSelectionRequest{
				Platform: "web",
			},
			expected: 0,
		},
		{
			name: "Mixed targeting - all conditions met",
			ads: []models.Ad{
				{
					ID:   uuid.New(),
					Name: "Ad 1",
					TargetingCriteria: map[string]interface{}{
						"game_ids":  []interface{}{"game123"},
						"languages": []interface{}{"en"},
						"platforms": []interface{}{"web"},
					},
				},
			},
			req: models.AdSelectionRequest{
				Platform: "web",
				GameID:   strPtr("game123"),
				Language: strPtr("en"),
			},
			expected: 1,
		},
		{
			name: "Game targeting - request has no game ID",
			ads: []models.Ad{
				{
					ID:   uuid.New(),
					Name: "Ad 1",
					TargetingCriteria: map[string]interface{}{
						"game_ids": []interface{}{"game123"},
					},
				},
			},
			req: models.AdSelectionRequest{
				Platform: "web",
				// GameID is nil
			},
			expected: 0, // Should not match because ad targets specific games
		},
		{
			name: "Language targeting - request has no language",
			ads: []models.Ad{
				{
					ID:   uuid.New(),
					Name: "Ad 1",
					TargetingCriteria: map[string]interface{}{
						"languages": []interface{}{"en"},
					},
				},
			},
			req: models.AdSelectionRequest{
				Platform: "web",
				// Language is nil
			},
			expected: 0, // Should not match because ad targets specific languages
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := s.filterByTargeting(tt.ads, tt.req)
			assert.Equal(t, tt.expected, len(result))
		})
	}
}

func TestAdService_weightedRandomSelect(t *testing.T) {
	s := &AdService{}

	t.Run("Single ad returns that ad", func(t *testing.T) {
		ad := models.Ad{ID: uuid.New(), Name: "Single Ad", Priority: 1, Weight: 50}
		result := s.weightedRandomSelect([]models.Ad{ad})
		assert.Equal(t, ad.ID, result.ID)
	})

	t.Run("Highest priority ad is selected from different priorities", func(t *testing.T) {
		ads := []models.Ad{
			{ID: uuid.New(), Name: "Low Priority", Priority: 1, Weight: 100},
			{ID: uuid.New(), Name: "High Priority", Priority: 10, Weight: 1},
		}
		// High priority should always be selected
		result := s.weightedRandomSelect(ads)
		assert.Equal(t, "High Priority", result.Name)
	})

	t.Run("Same priority uses weighted random", func(t *testing.T) {
		ads := []models.Ad{
			{ID: uuid.New(), Name: "Ad 1", Priority: 5, Weight: 50},
			{ID: uuid.New(), Name: "Ad 2", Priority: 5, Weight: 50},
		}
		// Run multiple times to verify both can be selected
		selections := make(map[string]int)
		for i := 0; i < 100; i++ {
			result := s.weightedRandomSelect(ads)
			selections[result.Name]++
		}
		// Both should be selected at least once (probabilistically)
		assert.True(t, selections["Ad 1"] > 0 && selections["Ad 2"] > 0)
	})
}

func TestAdService_calculateWindowStart(t *testing.T) {
	s := &AdService{}

	t.Run("Hourly window truncates to hour", func(t *testing.T) {
		start := s.calculateWindowStart(models.FrequencyWindowHourly)
		assert.Equal(t, 0, start.Minute())
		assert.Equal(t, 0, start.Second())
	})

	t.Run("Daily window starts at midnight", func(t *testing.T) {
		start := s.calculateWindowStart(models.FrequencyWindowDaily)
		assert.Equal(t, 0, start.Hour())
		assert.Equal(t, 0, start.Minute())
	})

	t.Run("Weekly window starts on Sunday", func(t *testing.T) {
		start := s.calculateWindowStart(models.FrequencyWindowWeekly)
		assert.Equal(t, time.Sunday, start.Weekday())
	})

	t.Run("Lifetime window returns zero time", func(t *testing.T) {
		start := s.calculateWindowStart(models.FrequencyWindowLifetime)
		assert.True(t, start.IsZero())
	})
}

func TestViewabilityThreshold(t *testing.T) {
	t.Run("Threshold is set correctly", func(t *testing.T) {
		assert.Equal(t, 1000, models.ViewabilityThresholdMs)
	})
}
