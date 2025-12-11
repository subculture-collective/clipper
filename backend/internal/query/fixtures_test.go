package query

import (
	"testing"
)

// TestQueryFixtures tests the query translator against predefined fixtures
func TestQueryFixtures(t *testing.T) {
	t.Run("equality queries", func(t *testing.T) {
		tests := []struct {
			name        string
			input       string
			expectedSQL string
			expectedArg interface{}
		}{
			{"simple string equality", "status = 'active'", "status = $1", "active"},
			{"numeric equality", "vote_score = 100", "vote_score = $1", int64(100)},
			{"not equals", "status != 'deleted'", "status != $1", "deleted"},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				node, err := ParseQuery(tt.input)
				if err != nil {
					t.Fatalf("failed to parse query: %v", err)
				}

				translator := NewSQLTranslator(DefaultQueryOptions())
				result, err := translator.Translate(node)
				if err != nil {
					t.Fatalf("failed to translate query: %v", err)
				}

				if result.SQL != tt.expectedSQL {
					t.Errorf("SQL mismatch: expected %q, got %q", tt.expectedSQL, result.SQL)
				}

				if len(result.Args) != 1 || result.Args[0] != tt.expectedArg {
					t.Errorf("args mismatch: expected [%v], got %v", tt.expectedArg, result.Args)
				}
			})
		}
	})

	t.Run("comparison queries", func(t *testing.T) {
		tests := []struct {
			name        string
			input       string
			expectedSQL string
		}{
			{"greater than", "vote_score > 50", "vote_score > $1"},
			{"greater than or equal", "vote_score >= 50", "vote_score >= $1"},
			{"less than", "vote_score < 50", "vote_score < $1"},
			{"less than or equal", "vote_score <= 50", "vote_score <= $1"},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				node, err := ParseQuery(tt.input)
				if err != nil {
					t.Fatalf("failed to parse query: %v", err)
				}

				translator := NewSQLTranslator(DefaultQueryOptions())
				result, err := translator.Translate(node)
				if err != nil {
					t.Fatalf("failed to translate query: %v", err)
				}

				if result.SQL != tt.expectedSQL {
					t.Errorf("SQL mismatch: expected %q, got %q", tt.expectedSQL, result.SQL)
				}
			})
		}
	})

	t.Run("range queries", func(t *testing.T) {
		tests := []struct {
			name        string
			input       string
			expectedMin interface{}
			expectedMax interface{}
		}{
			{"numeric range", "vote_score BETWEEN 10 AND 100", int64(10), int64(100)},
			{"date range", "created_at BETWEEN '2024-01-01' AND '2024-12-31'", "2024-01-01", "2024-12-31"},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				node, err := ParseQuery(tt.input)
				if err != nil {
					t.Fatalf("failed to parse query: %v", err)
				}

				translator := NewSQLTranslator(DefaultQueryOptions())
				result, err := translator.Translate(node)
				if err != nil {
					t.Fatalf("failed to translate query: %v", err)
				}

				if len(result.Args) != 2 {
					t.Fatalf("expected 2 args, got %d", len(result.Args))
				}

				if result.Args[0] != tt.expectedMin || result.Args[1] != tt.expectedMax {
					t.Errorf("args mismatch: expected [%v, %v], got %v", tt.expectedMin, tt.expectedMax, result.Args)
				}
			})
		}
	})

	t.Run("IN queries", func(t *testing.T) {
		tests := []struct {
			name         string
			input        string
			expectedArgs []interface{}
		}{
			{"IN with strings", "status IN ('active', 'pending')", []interface{}{"active", "pending"}},
			{"NOT IN", "status NOT IN ('deleted', 'removed')", []interface{}{"deleted", "removed"}},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				node, err := ParseQuery(tt.input)
				if err != nil {
					t.Fatalf("failed to parse query: %v", err)
				}

				translator := NewSQLTranslator(DefaultQueryOptions())
				result, err := translator.Translate(node)
				if err != nil {
					t.Fatalf("failed to translate query: %v", err)
				}

				if len(result.Args) != len(tt.expectedArgs) {
					t.Fatalf("expected %d args, got %d", len(tt.expectedArgs), len(result.Args))
				}

				for i, expected := range tt.expectedArgs {
					if result.Args[i] != expected {
						t.Errorf("arg[%d] mismatch: expected %v, got %v", i, expected, result.Args[i])
					}
				}
			})
		}
	})

	t.Run("logical operators", func(t *testing.T) {
		tests := []struct {
			name  string
			input string
		}{
			{"simple AND", "status = 'active' AND score > 50"},
			{"simple OR", "status = 'active' OR status = 'featured'"},
			{"NOT expression", "NOT status = 'deleted'"},
			{"complex nested", "(status = 'active' OR status = 'featured') AND score > 50"},
		}

		for _, tt := range tests {
			t.Run(tt.name, func(t *testing.T) {
				node, err := ParseQuery(tt.input)
				if err != nil {
					t.Fatalf("failed to parse query: %v", err)
				}

				// SQL translation
				sqlTranslator := NewSQLTranslator(DefaultQueryOptions())
				_, err = sqlTranslator.Translate(node)
				if err != nil {
					t.Errorf("SQL translation failed: %v", err)
				}

				// ES translation
				esTranslator := NewESTranslator(DefaultQueryOptions())
				_, err = esTranslator.Translate(node)
				if err != nil {
					t.Errorf("ES translation failed: %v", err)
				}
			})
		}
	})
}

// TestSafetyLimitsEnforcement tests that safety limits are properly enforced
func TestSafetyLimitsEnforcement(t *testing.T) {
	t.Run("default limit applied", func(t *testing.T) {
		opts := DefaultQueryOptions()
		opts.Limit = 0 // Not set

		opts.ApplySafeLimit()

		if opts.Limit != opts.DefaultLimit {
			t.Errorf("expected default limit %d, got %d", opts.DefaultLimit, opts.Limit)
		}
	})

	t.Run("max limit enforced", func(t *testing.T) {
		opts := DefaultQueryOptions()
		opts.Limit = 1000 // Exceeds max

		opts.ApplySafeLimit()

		if opts.Limit != opts.MaxLimit {
			t.Errorf("expected max limit %d, got %d", opts.MaxLimit, opts.Limit)
		}
	})

	t.Run("pagination offset calculated", func(t *testing.T) {
		tests := []struct {
			page           int
			limit          int
			expectedOffset int
		}{
			{1, 20, 0},
			{2, 20, 20},
			{10, 20, 180},
			{3, 50, 100},
		}

		for _, tt := range tests {
			opts := DefaultQueryOptions()
			opts.Page = tt.page
			opts.Limit = tt.limit

			opts.CalculateOffset()

			if opts.Offset != tt.expectedOffset {
				t.Errorf("page=%d, limit=%d: expected offset %d, got %d",
					tt.page, tt.limit, tt.expectedOffset, opts.Offset)
			}
		}
	})

	t.Run("no unbounded queries", func(t *testing.T) {
		// Verify that translated queries always have limits
		node, _ := ParseQuery("status = 'active'")

		sqlTranslator := NewSQLTranslator(DefaultQueryOptions())
		result, _ := sqlTranslator.Translate(node)

		if result.Limit == 0 {
			t.Error("SQL query should have a limit set")
		}

		esTranslator := NewESTranslator(DefaultQueryOptions())
		esResult, _ := esTranslator.Translate(node)

		if esResult.Limit == 0 {
			t.Error("ES query should have a limit set")
		}
	})
}

// TestComplexRealWorldQueries tests complex query patterns seen in production
func TestComplexRealWorldQueries(t *testing.T) {
	tests := []struct {
		name  string
		input string
	}{
		{
			name:  "clip search with multiple filters",
			input: "is_removed = 0 AND game_id = 'valorant' AND vote_score >= 10",
		},
		{
			name:  "featured or popular content",
			input: "(is_featured = 1 OR vote_score >= 100) AND is_nsfw = 0",
		},
		{
			name:  "creator specific search",
			input: "creator_id = 'shroud' AND game_id IN ('csgo', 'valorant')",
		},
		{
			name:  "time bounded trending search",
			input: "vote_score > 50 AND created_at BETWEEN '2024-01-01' AND '2024-03-31'",
		},
		{
			name:  "complex nested conditions",
			input: "(game_id = 'valorant' OR game_id = 'csgo') AND (vote_score > 100 OR is_featured = 1) AND is_removed = 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Parse
			node, err := ParseQuery(tt.input)
			if err != nil {
				t.Fatalf("failed to parse: %v", err)
			}

			// Validate
			validator := NewValidator(DefaultValidatorConfig())
			errors := validator.Validate(node)
			if len(errors) > 0 {
				t.Fatalf("validation failed: %v", errors)
			}

			// SQL translation
			sqlTranslator := NewSQLTranslator(DefaultQueryOptions())
			sqlResult, err := sqlTranslator.Translate(node)
			if err != nil {
				t.Errorf("SQL translation failed: %v", err)
			}
			if sqlResult.SQL == "" {
				t.Error("SQL result should not be empty")
			}

			// ES translation
			esTranslator := NewESTranslator(DefaultQueryOptions())
			esResult, err := esTranslator.Translate(node)
			if err != nil {
				t.Errorf("ES translation failed: %v", err)
			}
			if esResult.ESQuery == nil {
				t.Error("ES query should not be nil")
			}
		})
	}
}

// TestEndToEndQueryPipeline tests the complete query processing pipeline
func TestEndToEndQueryPipeline(t *testing.T) {
	input := "status = 'active' AND vote_score > 50"

	// Step 1: Parse
	node, err := ParseQuery(input)
	if err != nil {
		t.Fatalf("parse failed: %v", err)
	}

	// Step 2: Validate
	validator := NewValidator(DefaultValidatorConfig())
	if !validator.IsValid(node) {
		t.Fatalf("validation failed")
	}

	// Step 3: Apply safe limits
	limits := DefaultSafeQueryLimits()
	opts := DefaultQueryOptions()
	opts.Limit = 500 // Intentionally high
	opts.Page = 1
	limits.ApplyLimits(opts)

	if opts.Limit != 100 {
		t.Errorf("limit should be capped to 100, got %d", opts.Limit)
	}

	// Step 4a: Translate to SQL
	sqlTranslator := NewSQLTranslator(opts)
	sqlResult, err := sqlTranslator.Translate(node)
	if err != nil {
		t.Fatalf("SQL translation failed: %v", err)
	}

	if sqlResult.SQL == "" {
		t.Error("SQL should not be empty")
	}
	if len(sqlResult.Args) == 0 {
		t.Error("SQL args should not be empty")
	}
	if sqlResult.Limit != 100 {
		t.Errorf("SQL result limit should be 100, got %d", sqlResult.Limit)
	}

	// Step 4b: Translate to ES
	esTranslator := NewESTranslator(opts)
	esResult, err := esTranslator.BuildSearchQuery(node, "created_at", "DESC")
	if err != nil {
		t.Fatalf("ES translation failed: %v", err)
	}

	if esResult.ESQuery == nil {
		t.Error("ES query should not be nil")
	}
	if esResult.ESQuery["size"] != 100 {
		t.Errorf("ES size should be 100, got %v", esResult.ESQuery["size"])
	}
}
