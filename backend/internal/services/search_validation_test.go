package services

import (
	"testing"
)

// TestValidateQueryStructure_DangerousPatterns tests detection of dangerous patterns
func TestValidateQueryStructure_DangerousPatterns(t *testing.T) {
	validator := NewSearchQueryValidator(DefaultSearchLimits())

	tests := []struct {
		name        string
		query       map[string]interface{}
		shouldError bool
		description string
	}{
		{
			name: "Script injection in query",
			query: map[string]interface{}{
				"script": map[string]interface{}{
					"source": "malicious_code_here",
				},
			},
			shouldError: true,
			description: "Should block script field",
		},
		{
			name: "Script in nested query",
			query: map[string]interface{}{
				"bool": map[string]interface{}{
					"must": []interface{}{
						map[string]interface{}{
							"script": map[string]interface{}{
								"inline": "doc['field'].value * 2",
							},
						},
					},
				},
			},
			shouldError: true,
			description: "Should block nested script",
		},
		{
			name: "Painless script language",
			query: map[string]interface{}{
				"query": map[string]interface{}{
					"match": map[string]interface{}{
						"title": "test painless code",
					},
				},
			},
			shouldError: true,
			description: "Should block painless keyword",
		},
		{
			name: "Path traversal attempt",
			query: map[string]interface{}{
				"query": map[string]interface{}{
					"match": map[string]interface{}{
						"../../../etc/passwd": "test",
					},
				},
			},
			shouldError: true,
			description: "Should block path traversal",
		},
		{
			name: "Eval injection attempt",
			query: map[string]interface{}{
				"query": map[string]interface{}{
					"match": map[string]interface{}{
						"title": "test eval(malicious)",
					},
				},
			},
			shouldError: true,
			description: "Should block eval keyword",
		},
		{
			name: "Clean query with no dangerous patterns",
			query: map[string]interface{}{
				"bool": map[string]interface{}{
					"must": []interface{}{
						map[string]interface{}{
							"match": map[string]interface{}{
								"title": "normal search query",
							},
						},
					},
				},
			},
			shouldError: false,
			description: "Should allow clean query",
		},
		{
			name: "Runtime mapping injection",
			query: map[string]interface{}{
				"runtime_mappings": map[string]interface{}{
					"field": map[string]interface{}{
						"type":   "keyword",
						"script": "emit(doc['field'].value)",
					},
				},
			},
			shouldError: true,
			description: "Should block runtime script",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateQueryStructure(tt.query)
			if tt.shouldError && err == nil {
				t.Errorf("%s: Expected error but got none", tt.description)
			}
			if !tt.shouldError && err != nil {
				t.Errorf("%s: Unexpected error: %v", tt.description, err)
			}
		})
	}
}

// TestValidateQueryStructure_FieldWhitelist tests field access control
func TestValidateQueryStructure_FieldWhitelist(t *testing.T) {
	validator := NewSearchQueryValidator(DefaultSearchLimits())

	tests := []struct {
		name        string
		query       map[string]interface{}
		shouldError bool
		description string
	}{
		{
			name: "Allowed field - title",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"title": "test query",
				},
			},
			shouldError: false,
			description: "Should allow whitelisted title field",
		},
		{
			name: "Allowed field - creator_name",
			query: map[string]interface{}{
				"term": map[string]interface{}{
					"creator_name": "testuser",
				},
			},
			shouldError: false,
			description: "Should allow whitelisted creator_name field",
		},
		{
			name: "Unauthorized field access",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"password": "sensitive",
				},
			},
			shouldError: true,
			description: "Should block unauthorized field",
		},
		{
			name: "Internal field access attempt",
			query: map[string]interface{}{
				"term": map[string]interface{}{
					"_internal_secret": "value",
				},
			},
			shouldError: true,
			description: "Should block internal fields",
		},
		{
			name: "Multiple fields with boost notation",
			query: map[string]interface{}{
				"multi_match": map[string]interface{}{
					"query": "search term",
					"fields": []interface{}{
						"title^3",
						"creator_name^2",
						"game_name",
					},
				},
			},
			shouldError: false,
			description: "Should allow multiple whitelisted fields with boost",
		},
		{
			name: "Mixed authorized and unauthorized fields",
			query: map[string]interface{}{
				"multi_match": map[string]interface{}{
					"query": "search",
					"fields": []interface{}{
						"title",
						"unauthorized_field",
					},
				},
			},
			shouldError: true,
			description: "Should block if any field is unauthorized",
		},
		{
			name: "Nested field notation",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"title.en": "english title",
				},
			},
			shouldError: false,
			description: "Should allow whitelisted nested fields",
		},
		{
			name: "Wildcard field attempt",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"title.*": "wildcard",
				},
			},
			shouldError: false,
			description: "Should allow whitelisted field with wildcard",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateQueryStructure(tt.query)
			if tt.shouldError && err == nil {
				t.Errorf("%s: Expected error but got none", tt.description)
			}
			if !tt.shouldError && err != nil {
				t.Errorf("%s: Unexpected error: %v", tt.description, err)
			}
		})
	}
}

// TestValidateQueryStructure_OperatorWhitelist tests operator validation
func TestValidateQueryStructure_OperatorWhitelist(t *testing.T) {
	validator := NewSearchQueryValidator(DefaultSearchLimits())

	tests := []struct {
		name        string
		query       map[string]interface{}
		shouldError bool
		description string
	}{
		{
			name: "Allowed operator - match",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"title": "test",
				},
			},
			shouldError: false,
			description: "Should allow match operator",
		},
		{
			name: "Allowed operator - bool with must",
			query: map[string]interface{}{
				"bool": map[string]interface{}{
					"must": []interface{}{
						map[string]interface{}{
							"term": map[string]interface{}{
								"game_id": "123",
							},
						},
					},
				},
			},
			shouldError: false,
			description: "Should allow bool query with must",
		},
		{
			name: "Allowed operator - range",
			query: map[string]interface{}{
				"range": map[string]interface{}{
					"created_at": map[string]interface{}{
						"gte": "2024-01-01",
					},
				},
			},
			shouldError: false,
			description: "Should allow range operator",
		},
		{
			name: "Invalid custom operator",
			query: map[string]interface{}{
				"custom_malicious_op": map[string]interface{}{
					"field": "value",
				},
			},
			shouldError: true,
			description: "Should block unknown operators",
		},
		{
			name: "Complex allowed query",
			query: map[string]interface{}{
				"bool": map[string]interface{}{
					"must": []interface{}{
						map[string]interface{}{
							"multi_match": map[string]interface{}{
								"query":  "test",
								"fields": []interface{}{"title", "creator_name"},
							},
						},
					},
					"filter": []interface{}{
						map[string]interface{}{
							"term": map[string]interface{}{
								"is_removed": false,
							},
						},
						map[string]interface{}{
							"range": map[string]interface{}{
								"created_at": map[string]interface{}{
									"gte": "2024-01-01",
								},
							},
						},
					},
				},
			},
			shouldError: false,
			description: "Should allow complex query with allowed operators",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateQueryStructure(tt.query)
			if tt.shouldError && err == nil {
				t.Errorf("%s: Expected error but got none", tt.description)
			}
			if !tt.shouldError && err != nil {
				t.Errorf("%s: Unexpected error: %v", tt.description, err)
			}
		})
	}
}

// TestValidateQueryStructure_InjectionPatterns tests common injection patterns
func TestValidateQueryStructure_InjectionPatterns(t *testing.T) {
	validator := NewSearchQueryValidator(DefaultSearchLimits())

	tests := []struct {
		name        string
		query       map[string]interface{}
		shouldError bool
		description string
	}{
		{
			name: "SQL-like injection attempt",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"title": "'; DROP TABLE clips; --",
				},
			},
			shouldError: false,
			description: "SQL injection should not affect NoSQL (but be sanitized at input level)",
		},
		{
			name: "JavaScript injection in string",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"title": "<script>alert('xss')</script>",
				},
			},
			shouldError: true,
			description: "Should block script tags in queries",
		},
		{
			name: "Command injection attempt",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"title": "; cat /etc/passwd",
				},
			},
			shouldError: false,
			description: "Command injection in text should be allowed (no actual risk in OpenSearch text match)",
		},
		{
			name: "Groovy script injection",
			query: map[string]interface{}{
				"query": map[string]interface{}{
					"function_score": map[string]interface{}{
						"query": map[string]interface{}{
							"match_all": map[string]interface{}{},
						},
						"script_score": map[string]interface{}{
							"script": map[string]interface{}{
								"source": "malicious groovy code",
							},
						},
					},
				},
			},
			shouldError: true,
			description: "Should block groovy script injection",
		},
		{
			name: "Aggregation with script injection",
			query: map[string]interface{}{
				"aggs": map[string]interface{}{
					"leak": map[string]interface{}{
						"terms": map[string]interface{}{
							"script": "doc['private_field'].value",
							"size":   10000,
						},
					},
				},
			},
			shouldError: true,
			description: "Should block script in aggregations",
		},
		{
			name: "Source filtering abuse attempt",
			query: map[string]interface{}{
				"_source": []interface{}{
					"password",
					"api_key",
					"secret_token",
				},
			},
			shouldError: true,
			description: "Should block _source field access",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateQueryStructure(tt.query)
			if tt.shouldError && err == nil {
				t.Errorf("%s: Expected error but got none", tt.description)
			}
			if !tt.shouldError && err != nil {
				t.Errorf("%s: Unexpected error: %v", tt.description, err)
			}
		})
	}
}

// TestValidateQueryStructure_EdgeCases tests edge cases and boundary conditions
func TestValidateQueryStructure_EdgeCases(t *testing.T) {
	validator := NewSearchQueryValidator(DefaultSearchLimits())

	tests := []struct {
		name        string
		query       map[string]interface{}
		shouldError bool
		description string
	}{
		{
			name:        "Empty query",
			query:       map[string]interface{}{},
			shouldError: false,
			description: "Empty query should be allowed",
		},
		{
			name: "Null values in query",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"title": nil,
				},
			},
			shouldError: false,
			description: "Null values should be handled gracefully",
		},
		{
			name: "Deeply nested structure",
			query: map[string]interface{}{
				"bool": map[string]interface{}{
					"must": []interface{}{
						map[string]interface{}{
							"bool": map[string]interface{}{
								"should": []interface{}{
									map[string]interface{}{
										"match": map[string]interface{}{
											"title": "test",
										},
									},
								},
							},
						},
					},
				},
			},
			shouldError: false,
			description: "Deeply nested valid queries should work",
		},
		{
			name: "Unicode in query values",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"title": "测试 テスト тест",
				},
			},
			shouldError: false,
			description: "Unicode characters should be allowed in values",
		},
		{
			name: "Case sensitivity test - SCRIPT",
			query: map[string]interface{}{
				"SCRIPT": map[string]interface{}{
					"source": "code",
				},
			},
			shouldError: true,
			description: "Should catch dangerous patterns case-insensitively",
		},
		{
			name: "Mixed case dangerous pattern",
			query: map[string]interface{}{
				"match": map[string]interface{}{
					"title": "test ScRiPt injection",
				},
			},
			shouldError: true,
			description: "Should detect dangerous patterns with mixed case",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateQueryStructure(tt.query)
			if tt.shouldError && err == nil {
				t.Errorf("%s: Expected error but got none", tt.description)
			}
			if !tt.shouldError && err != nil {
				t.Errorf("%s: Unexpected error: %v", tt.description, err)
			}
		})
	}
}

// TestGetAllowedSearchFields tests field whitelist initialization
func TestGetAllowedSearchFields(t *testing.T) {
	fields := getAllowedSearchFields()

	// Test required fields are present
	requiredFields := []string{
		"title",
		"creator_name",
		"game_name",
		"language",
		"created_at",
		"vote_score",
	}

	for _, field := range requiredFields {
		if !fields[field] {
			t.Errorf("Required field '%s' not in whitelist", field)
		}
	}

	// Test dangerous fields are NOT present
	dangerousFields := []string{
		"password",
		"api_key",
		"secret",
		"token",
		"private_key",
	}

	for _, field := range dangerousFields {
		if fields[field] {
			t.Errorf("Dangerous field '%s' should not be in whitelist", field)
		}
	}
}

// TestGetAllowedQueryOperators tests operator whitelist initialization
func TestGetAllowedQueryOperators(t *testing.T) {
	operators := getAllowedQueryOperators()

	// Test required operators are present
	requiredOperators := []string{
		"match",
		"term",
		"range",
		"bool",
		"must",
		"filter",
	}

	for _, op := range requiredOperators {
		if !operators[op] {
			t.Errorf("Required operator '%s' not in whitelist", op)
		}
	}

	// Test dangerous operators are NOT present
	dangerousOperators := []string{
		"script",
		"script_score",
		"painless",
		"groovy",
	}

	for _, op := range dangerousOperators {
		if operators[op] {
			t.Errorf("Dangerous operator '%s' should not be in whitelist", op)
		}
	}
}

// TestGetDangerousPatterns tests dangerous pattern list
func TestGetDangerousPatterns(t *testing.T) {
	patterns := getDangerousPatterns()

	// Ensure critical patterns are included
	criticalPatterns := []string{
		"script",
		"eval(",
		"exec(",
		"../",
	}

	for _, critical := range criticalPatterns {
		found := false
		for _, pattern := range patterns {
			if pattern == critical {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Critical pattern '%s' not in dangerous patterns list", critical)
		}
	}

	// Ensure list is not empty
	if len(patterns) == 0 {
		t.Error("Dangerous patterns list should not be empty")
	}
}
