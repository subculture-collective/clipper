package repository

import (
	"testing"
	"time"
)

func TestQueryCostAnalyzer_AnalyzeQuery(t *testing.T) {
	analyzer := NewQueryCostAnalyzer(DefaultQueryLimits())

	tests := []struct {
		name          string
		query         string
		expectedJoins int
		expectedLimit int
		hasOffset     bool
	}{
		{
			name:          "Simple SELECT without joins",
			query:         "SELECT * FROM clips WHERE id = $1",
			expectedJoins: 0,
			expectedLimit: 0,
			hasOffset:     false,
		},
		{
			name:          "SELECT with LIMIT",
			query:         "SELECT * FROM clips LIMIT 100",
			expectedJoins: 0,
			expectedLimit: 100,
			hasOffset:     false,
		},
		{
			name:          "SELECT with LIMIT and OFFSET",
			query:         "SELECT * FROM clips LIMIT 50 OFFSET 100",
			expectedJoins: 0,
			expectedLimit: 50,
			hasOffset:     true,
		},
		{
			name: "SELECT with one JOIN",
			query: `SELECT c.*, u.username 
					FROM clips c 
					JOIN users u ON c.submitted_by_user_id = u.id 
					LIMIT 10`,
			expectedJoins: 1,
			expectedLimit: 10,
			hasOffset:     false,
		},
		{
			name: "SELECT with multiple JOINs",
			query: `SELECT c.*, u.username, g.name 
					FROM clips c 
					JOIN users u ON c.submitted_by_user_id = u.id 
					JOIN games g ON c.game_id = g.id 
					LIMIT 20`,
			expectedJoins: 2,
			expectedLimit: 20,
			hasOffset:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cost, err := analyzer.AnalyzeQuery(tt.query)
			if err != nil {
				t.Fatalf("AnalyzeQuery() error = %v", err)
			}

			if cost.JoinCount != tt.expectedJoins {
				t.Errorf("JoinCount = %d, want %d", cost.JoinCount, tt.expectedJoins)
			}

			if cost.LimitValue != tt.expectedLimit {
				t.Errorf("LimitValue = %d, want %d", cost.LimitValue, tt.expectedLimit)
			}

			if cost.HasOffset != tt.hasOffset {
				t.Errorf("HasOffset = %v, want %v", cost.HasOffset, tt.hasOffset)
			}

			if cost.Complexity < 0 {
				t.Errorf("Complexity should be non-negative, got %f", cost.Complexity)
			}
		})
	}
}

func TestQueryCostAnalyzer_ValidateQuery(t *testing.T) {
	limits := QueryLimits{
		MaxResultSize: 100,
		MaxOffset:     1000,
		MaxJoinDepth:  3,
		MaxQueryTime:  10 * time.Second,
	}
	analyzer := NewQueryCostAnalyzer(limits)

	tests := []struct {
		name        string
		query       string
		shouldError bool
		errorType   error
	}{
		{
			name:        "Valid simple query",
			query:       "SELECT * FROM clips LIMIT 50",
			shouldError: false,
		},
		{
			name:        "Valid query with joins",
			query:       "SELECT * FROM clips JOIN users ON clips.user_id = users.id LIMIT 10",
			shouldError: false,
		},
		{
			name:        "Query with too many joins",
			query:       "SELECT * FROM clips JOIN users ON 1=1 JOIN games ON 1=1 JOIN tags ON 1=1 JOIN comments ON 1=1",
			shouldError: true,
			errorType:   ErrTooManyJoins,
		},
		{
			name:        "Query with offset too large",
			query:       "SELECT * FROM clips LIMIT 10 OFFSET 2000",
			shouldError: true,
			errorType:   ErrOffsetTooLarge,
		},
		{
			name:        "Query with limit too large",
			query:       "SELECT * FROM clips LIMIT 5000",
			shouldError: true,
			errorType:   ErrLimitTooLarge,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := analyzer.ValidateQuery(tt.query)
			if tt.shouldError {
				if err == nil {
					t.Errorf("ValidateQuery() expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("ValidateQuery() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestQueryCostAnalyzer_ValidatePagination(t *testing.T) {
	limits := QueryLimits{
		MaxResultSize: 1000,
		MaxOffset:     1000,
	}
	analyzer := NewQueryCostAnalyzer(limits)

	tests := []struct {
		name        string
		limit       int
		offset      int
		shouldError bool
		errorType   error
	}{
		{
			name:        "Valid pagination",
			limit:       100,
			offset:      0,
			shouldError: false,
		},
		{
			name:        "Valid pagination with offset",
			limit:       50,
			offset:      500,
			shouldError: false,
		},
		{
			name:        "Limit too large",
			limit:       2000,
			offset:      0,
			shouldError: true,
			errorType:   ErrLimitTooLarge,
		},
		{
			name:        "Offset too large",
			limit:       100,
			offset:      2000,
			shouldError: true,
			errorType:   ErrOffsetTooLarge,
		},
		{
			name:        "Both limit and offset at max",
			limit:       1000,
			offset:      1000,
			shouldError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := analyzer.ValidatePagination(tt.limit, tt.offset)
			if tt.shouldError {
				if err == nil {
					t.Errorf("ValidatePagination() expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("ValidatePagination() unexpected error = %v", err)
				}
			}
		})
	}
}

func TestCalculateComplexity(t *testing.T) {
	tests := []struct {
		name     string
		cost     *QueryCost
		minScore float64
		maxScore float64
	}{
		{
			name: "Simple query",
			cost: &QueryCost{
				JoinCount:  0,
				ScanSize:   100,
				LimitValue: 10,
			},
			minScore: 0,
			maxScore: 5,
		},
		{
			name: "Query with joins",
			cost: &QueryCost{
				JoinCount:  2,
				ScanSize:   1000,
				LimitValue: 50,
			},
			minScore: 20,
			maxScore: 40,
		},
		{
			name: "Expensive query with large offset",
			cost: &QueryCost{
				JoinCount:   3,
				ScanSize:    10000,
				HasOffset:   true,
				OffsetValue: 5000,
				LimitValue:  1000,
			},
			minScore: 150,
			maxScore: 300,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			complexity := calculateComplexity(tt.cost)
			if complexity < tt.minScore || complexity > tt.maxScore {
				t.Errorf("Complexity = %f, expected range [%f, %f]", complexity, tt.minScore, tt.maxScore)
			}
		})
	}
}

func TestExtractLimit(t *testing.T) {
	tests := []struct {
		name     string
		query    string
		expected int
	}{
		{"No LIMIT", "SELECT * FROM clips", 0},
		{"LIMIT 10", "SELECT * FROM clips LIMIT 10", 10},
		{"LIMIT 100", "SELECT * FROM clips LIMIT 100", 100},
		{"LIMIT with OFFSET", "SELECT * FROM clips LIMIT 50 OFFSET 100", 50},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractLimit(tt.query)
			if result != tt.expected {
				t.Errorf("extractLimit() = %d, want %d", result, tt.expected)
			}
		})
	}
}

func TestExtractOffset(t *testing.T) {
	tests := []struct {
		name     string
		query    string
		expected int
	}{
		{"No OFFSET", "SELECT * FROM clips LIMIT 10", 0},
		{"OFFSET 100", "SELECT * FROM clips LIMIT 10 OFFSET 100", 100},
		{"OFFSET 500", "SELECT * FROM clips LIMIT 50 OFFSET 500", 500},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractOffset(tt.query)
			if result != tt.expected {
				t.Errorf("extractOffset() = %d, want %d", result, tt.expected)
			}
		})
	}
}

func TestCountJoins(t *testing.T) {
	tests := []struct {
		name     string
		query    string
		expected int
	}{
		{"No joins", "SELECT * FROM clips", 0},
		{"One JOIN", "SELECT * FROM clips JOIN users ON clips.user_id = users.id", 1},
		{"Two JOINs", "SELECT * FROM clips JOIN users ON 1=1 JOIN games ON 1=1", 2},
		{"LEFT JOIN", "SELECT * FROM clips LEFT JOIN users ON 1=1", 1},
		{"Multiple JOIN types", "SELECT * FROM clips INNER JOIN users ON 1=1 LEFT JOIN games ON 1=1", 2},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := countJoins(tt.query)
			if result != tt.expected {
				t.Errorf("countJoins() = %d, want %d", result, tt.expected)
			}
		})
	}
}
