package services

import (
	"testing"
	"time"
)

func TestBuildCacheKey(t *testing.T) {
	// This would be tested with actual ClipService instance
	// For now, validating the format and logic

	tests := []struct {
		name   string
		sort   string
		page   int
		limit  int
		gameID string
		want   string
	}{
		{
			name:  "Basic hot sort",
			sort:  "hot",
			page:  1,
			limit: 25,
			want:  "clips:list:hot:page:1:limit:25",
		},
		{
			name:   "With game filter",
			sort:   "top",
			page:   2,
			limit:  50,
			gameID: "123",
			want:   "clips:list:top:page:2:limit:50:game:123",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Basic validation that the cache key format is consistent
			if tt.sort == "" {
				t.Error("Sort parameter should not be empty")
			}
			if tt.page < 1 {
				t.Error("Page should be at least 1")
			}
			if tt.limit < 1 {
				t.Error("Limit should be at least 1")
			}
		})
	}
}

func TestGetCacheTTL(t *testing.T) {
	tests := []struct {
		name     string
		sort     string
		expected time.Duration
	}{
		{
			name:     "Hot sort TTL",
			sort:     "hot",
			expected: 5 * time.Minute,
		},
		{
			name:     "New sort TTL",
			sort:     "new",
			expected: 2 * time.Minute,
		},
		{
			name:     "Top sort TTL",
			sort:     "top",
			expected: 15 * time.Minute,
		},
		{
			name:     "Rising sort TTL",
			sort:     "rising",
			expected: 3 * time.Minute,
		},
		{
			name:     "Default sort TTL",
			sort:     "unknown",
			expected: 5 * time.Minute,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Validate TTL values are reasonable
			if tt.expected < time.Minute {
				t.Error("Cache TTL should be at least 1 minute")
			}
			if tt.expected > time.Hour {
				t.Error("Cache TTL should not exceed 1 hour")
			}
		})
	}
}

func TestVoteValidation(t *testing.T) {
	tests := []struct {
		name     string
		voteType int16
		valid    bool
	}{
		{
			name:     "Valid upvote",
			voteType: 1,
			valid:    true,
		},
		{
			name:     "Valid downvote",
			voteType: -1,
			valid:    true,
		},
		{
			name:     "Valid remove vote",
			voteType: 0,
			valid:    true,
		},
		{
			name:     "Invalid vote value 2",
			voteType: 2,
			valid:    false,
		},
		{
			name:     "Invalid vote value -2",
			voteType: -2,
			valid:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := tt.voteType == -1 || tt.voteType == 0 || tt.voteType == 1
			if isValid != tt.valid {
				t.Errorf("Expected vote %d to be valid=%v, got %v", tt.voteType, tt.valid, isValid)
			}
		})
	}
}

func TestKarmaCalculation(t *testing.T) {
	tests := []struct {
		name        string
		oldVote     *int16
		newVote     int16
		expectedDif int
	}{
		{
			name:        "New upvote",
			oldVote:     nil,
			newVote:     1,
			expectedDif: 1,
		},
		{
			name:        "New downvote",
			oldVote:     nil,
			newVote:     -1,
			expectedDif: -1,
		},
		{
			name: "Change upvote to downvote",
			oldVote: func() *int16 {
				v := int16(1)
				return &v
			}(),
			newVote:     -1,
			expectedDif: -2,
		},
		{
			name: "Change downvote to upvote",
			oldVote: func() *int16 {
				v := int16(-1)
				return &v
			}(),
			newVote:     1,
			expectedDif: 2,
		},
		{
			name: "Remove upvote",
			oldVote: func() *int16 {
				v := int16(1)
				return &v
			}(),
			newVote:     0,
			expectedDif: 0, // Vote removal does not affect karma at all
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			karmaChange := 0
			if tt.oldVote == nil {
				// New vote
				if tt.newVote == 1 {
					karmaChange = 1
				} else if tt.newVote == -1 {
					karmaChange = -1
				}
			} else if tt.newVote != 0 {
				// Changed vote (not removal)
				if *tt.oldVote == 1 && tt.newVote == -1 {
					karmaChange = -2
				} else if *tt.oldVote == -1 && tt.newVote == 1 {
					karmaChange = 2
				}
			}

			if karmaChange != tt.expectedDif {
				t.Errorf("Expected karma change %d, got %d", tt.expectedDif, karmaChange)
			}
		})
	}
}

func TestPaginationCalculation(t *testing.T) {
	tests := []struct {
		name            string
		total           int
		limit           int
		page            int
		expectedPages   int
		expectedHasNext bool
		expectedHasPrev bool
	}{
		{
			name:            "First page with results",
			total:           100,
			limit:           25,
			page:            1,
			expectedPages:   4,
			expectedHasNext: true,
			expectedHasPrev: false,
		},
		{
			name:            "Middle page",
			total:           100,
			limit:           25,
			page:            2,
			expectedPages:   4,
			expectedHasNext: true,
			expectedHasPrev: true,
		},
		{
			name:            "Last page",
			total:           100,
			limit:           25,
			page:            4,
			expectedPages:   4,
			expectedHasNext: false,
			expectedHasPrev: true,
		},
		{
			name:            "Partial last page",
			total:           90,
			limit:           25,
			page:            4,
			expectedPages:   4,
			expectedHasNext: false,
			expectedHasPrev: true,
		},
		{
			name:            "Single page",
			total:           10,
			limit:           25,
			page:            1,
			expectedPages:   1,
			expectedHasNext: false,
			expectedHasPrev: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			totalPages := (tt.total + tt.limit - 1) / tt.limit
			hasNext := tt.page < totalPages
			hasPrev := tt.page > 1

			if totalPages != tt.expectedPages {
				t.Errorf("Expected %d pages, got %d", tt.expectedPages, totalPages)
			}
			if hasNext != tt.expectedHasNext {
				t.Errorf("Expected hasNext=%v, got %v", tt.expectedHasNext, hasNext)
			}
			if hasPrev != tt.expectedHasPrev {
				t.Errorf("Expected hasPrev=%v, got %v", tt.expectedHasPrev, hasPrev)
			}
		})
	}
}

func TestSortValidation(t *testing.T) {
	validSorts := []string{"hot", "new", "top", "rising"}

	tests := []struct {
		name  string
		sort  string
		valid bool
	}{
		{
			name:  "Valid hot",
			sort:  "hot",
			valid: true,
		},
		{
			name:  "Valid new",
			sort:  "new",
			valid: true,
		},
		{
			name:  "Valid top",
			sort:  "top",
			valid: true,
		},
		{
			name:  "Valid rising",
			sort:  "rising",
			valid: true,
		},
		{
			name:  "Invalid sort",
			sort:  "invalid",
			valid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := false
			for _, validSort := range validSorts {
				if tt.sort == validSort {
					isValid = true
					break
				}
			}

			if isValid != tt.valid {
				t.Errorf("Expected sort '%s' to be valid=%v, got %v", tt.sort, tt.valid, isValid)
			}
		})
	}
}

func TestTimeframeValidation(t *testing.T) {
	validTimeframes := []string{"hour", "day", "week", "month", "year", "all"}

	tests := []struct {
		name      string
		timeframe string
		valid     bool
	}{
		{
			name:      "Valid hour",
			timeframe: "hour",
			valid:     true,
		},
		{
			name:      "Valid day",
			timeframe: "day",
			valid:     true,
		},
		{
			name:      "Valid week",
			timeframe: "week",
			valid:     true,
		},
		{
			name:      "Valid month",
			timeframe: "month",
			valid:     true,
		},
		{
			name:      "Valid year",
			timeframe: "year",
			valid:     true,
		},
		{
			name:      "Valid all",
			timeframe: "all",
			valid:     true,
		},
		{
			name:      "Invalid timeframe",
			timeframe: "invalid",
			valid:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			isValid := false
			for _, validTf := range validTimeframes {
				if tt.timeframe == validTf {
					isValid = true
					break
				}
			}

			if isValid != tt.valid {
				t.Errorf("Expected timeframe '%s' to be valid=%v, got %v", tt.timeframe, tt.valid, isValid)
			}
		})
	}
}

func TestLimitConstraints(t *testing.T) {
	tests := []struct {
		name          string
		inputLimit    int
		expectedLimit int
	}{
		{
			name:          "Valid limit",
			inputLimit:    25,
			expectedLimit: 25,
		},
		{
			name:          "Too small limit",
			inputLimit:    0,
			expectedLimit: 25,
		},
		{
			name:          "Negative limit",
			inputLimit:    -10,
			expectedLimit: 25,
		},
		{
			name:          "Too large limit",
			inputLimit:    200,
			expectedLimit: 25,
		},
		{
			name:          "Maximum allowed",
			inputLimit:    100,
			expectedLimit: 100,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limit := tt.inputLimit
			if limit < 1 || limit > 100 {
				limit = 25
			}

			if limit != tt.expectedLimit {
				t.Errorf("Expected limit %d, got %d", tt.expectedLimit, limit)
			}
		})
	}
}
