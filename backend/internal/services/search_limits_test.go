package services

import (
	"testing"
	"time"
)

func TestSearchQueryValidator_ValidateSearchSize(t *testing.T) {
	limits := SearchLimits{
		MaxResultSize: 100,
	}
	validator := NewSearchQueryValidator(limits)

	tests := []struct {
		name        string
		size        int
		shouldError bool
	}{
		{"Valid size", 50, false},
		{"Max size", 100, false},
		{"Size too large", 200, true},
		{"Zero size", 0, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateSearchSize(tt.size)
			if tt.shouldError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.shouldError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestSearchQueryValidator_ValidateAggregations(t *testing.T) {
	limits := SearchLimits{
		MaxAggregationSize: 100,
		MaxAggregationNest: 2,
	}
	validator := NewSearchQueryValidator(limits)

	tests := []struct {
		name        string
		aggs        map[string]interface{}
		shouldError bool
		errorType   error
	}{
		{
			name:        "Empty aggregations",
			aggs:        map[string]interface{}{},
			shouldError: false,
		},
		{
			name: "Valid simple aggregation",
			aggs: map[string]interface{}{
				"games": map[string]interface{}{
					"terms": map[string]interface{}{
						"field": "game_id",
						"size":  10,
					},
				},
			},
			shouldError: false,
		},
		{
			name: "Valid nested aggregation",
			aggs: map[string]interface{}{
				"games": map[string]interface{}{
					"terms": map[string]interface{}{
						"field": "game_id",
						"size":  50,
					},
					"aggs": map[string]interface{}{
						"broadcasters": map[string]interface{}{
							"terms": map[string]interface{}{
								"field": "broadcaster_id",
								"size":  20,
							},
						},
					},
				},
			},
			shouldError: false,
		},
		{
			name: "Aggregation size too large",
			aggs: map[string]interface{}{
				"games": map[string]interface{}{
					"terms": map[string]interface{}{
						"field": "game_id",
						"size":  200,
					},
				},
			},
			shouldError: true,
			errorType:   ErrAggregationSizeTooLarge,
		},
		{
			name: "Aggregation depth too deep",
			aggs: map[string]interface{}{
				"level1": map[string]interface{}{
					"terms": map[string]interface{}{
						"field": "field1",
						"size":  10,
					},
					"aggs": map[string]interface{}{
						"level2": map[string]interface{}{
							"terms": map[string]interface{}{
								"field": "field2",
								"size":  10,
							},
							"aggs": map[string]interface{}{
								"level3": map[string]interface{}{
									"terms": map[string]interface{}{
										"field": "field3",
										"size":  10,
									},
									"aggs": map[string]interface{}{
										"level4": map[string]interface{}{
											"terms": map[string]interface{}{
												"field": "field4",
												"size":  10,
											},
										},
									},
								},
							},
						},
					},
				},
			},
			shouldError: true,
			errorType:   ErrAggregationDepthTooDeep,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateAggregations(tt.aggs)
			if tt.shouldError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.shouldError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestSearchQueryValidator_ValidateQueryClauses(t *testing.T) {
	limits := SearchLimits{
		MaxQueryClauses: 20,
	}
	validator := NewSearchQueryValidator(limits)

	tests := []struct {
		name        string
		query       map[string]interface{}
		shouldError bool
	}{
		{
			name:        "Empty query",
			query:       map[string]interface{}{},
			shouldError: false,
		},
		{
			name: "Simple bool query with few clauses",
			query: map[string]interface{}{
				"bool": map[string]interface{}{
					"must": []interface{}{
						map[string]interface{}{"term": map[string]interface{}{"field1": "value1"}},
						map[string]interface{}{"term": map[string]interface{}{"field2": "value2"}},
					},
					"filter": []interface{}{
						map[string]interface{}{"range": map[string]interface{}{"date": map[string]interface{}{"gte": "2024-01-01"}}},
					},
				},
			},
			shouldError: false,
		},
		{
			name: "Query with too many clauses",
			query: map[string]interface{}{
				"bool": map[string]interface{}{
					"must": []interface{}{
						map[string]interface{}{"term": map[string]interface{}{"field1": "value1"}},
						map[string]interface{}{"term": map[string]interface{}{"field2": "value2"}},
						map[string]interface{}{"term": map[string]interface{}{"field3": "value3"}},
						map[string]interface{}{"term": map[string]interface{}{"field4": "value4"}},
						map[string]interface{}{"term": map[string]interface{}{"field5": "value5"}},
						map[string]interface{}{"term": map[string]interface{}{"field6": "value6"}},
						map[string]interface{}{"term": map[string]interface{}{"field7": "value7"}},
						map[string]interface{}{"term": map[string]interface{}{"field8": "value8"}},
						map[string]interface{}{"term": map[string]interface{}{"field9": "value9"}},
						map[string]interface{}{"term": map[string]interface{}{"field10": "value10"}},
					},
					"should": []interface{}{
						map[string]interface{}{"term": map[string]interface{}{"field11": "value11"}},
						map[string]interface{}{"term": map[string]interface{}{"field12": "value12"}},
						map[string]interface{}{"term": map[string]interface{}{"field13": "value13"}},
						map[string]interface{}{"term": map[string]interface{}{"field14": "value14"}},
						map[string]interface{}{"term": map[string]interface{}{"field15": "value15"}},
						map[string]interface{}{"term": map[string]interface{}{"field16": "value16"}},
						map[string]interface{}{"term": map[string]interface{}{"field17": "value17"}},
						map[string]interface{}{"term": map[string]interface{}{"field18": "value18"}},
						map[string]interface{}{"term": map[string]interface{}{"field19": "value19"}},
						map[string]interface{}{"term": map[string]interface{}{"field20": "value20"}},
						map[string]interface{}{"term": map[string]interface{}{"field21": "value21"}},
					},
				},
			},
			shouldError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateQueryClauses(tt.query)
			if tt.shouldError && err == nil {
				t.Error("Expected error but got none")
			}
			if !tt.shouldError && err != nil {
				t.Errorf("Unexpected error: %v", err)
			}
		})
	}
}

func TestSearchQueryValidator_EnforceSearchLimits(t *testing.T) {
	limits := SearchLimits{
		MaxResultSize: 100,
	}
	validator := NewSearchQueryValidator(limits)

	tests := []struct {
		name         string
		inputSize    int
		inputFrom    int
		expectedSize int
	}{
		{
			name:         "Valid size",
			inputSize:    50,
			inputFrom:    0,
			expectedSize: 50,
		},
		{
			name:         "Size exceeds max",
			inputSize:    200,
			inputFrom:    0,
			expectedSize: 100,
		},
		{
			name:         "Zero size",
			inputSize:    0,
			inputFrom:    0,
			expectedSize: 10,
		},
		{
			name:         "Negative size",
			inputSize:    -5,
			inputFrom:    0,
			expectedSize: 10,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			size := tt.inputSize
			from := tt.inputFrom
			validator.EnforceSearchLimits(&size, &from)
			if size != tt.expectedSize {
				t.Errorf("EnforceSearchLimits() size = %d, want %d", size, tt.expectedSize)
			}
		})
	}
}

func TestSearchQueryValidator_GetTimeout(t *testing.T) {
	limits := SearchLimits{
		MaxSearchTime: 5 * time.Second,
	}
	validator := NewSearchQueryValidator(limits)

	timeout := validator.GetTimeout()
	if timeout != 5*time.Second {
		t.Errorf("GetTimeout() = %v, want %v", timeout, 5*time.Second)
	}
}

func TestGetMaxAggregationDepth(t *testing.T) {
	validator := NewSearchQueryValidator(DefaultSearchLimits())

	tests := []struct {
		name          string
		aggs          map[string]interface{}
		expectedDepth int
	}{
		{
			name:          "No aggregations",
			aggs:          map[string]interface{}{},
			expectedDepth: 0,
		},
		{
			name: "Single level aggregation",
			aggs: map[string]interface{}{
				"games": map[string]interface{}{
					"terms": map[string]interface{}{
						"field": "game_id",
					},
				},
			},
			expectedDepth: 0,
		},
		{
			name: "Two level aggregation",
			aggs: map[string]interface{}{
				"games": map[string]interface{}{
					"terms": map[string]interface{}{
						"field": "game_id",
					},
					"aggs": map[string]interface{}{
						"broadcasters": map[string]interface{}{
							"terms": map[string]interface{}{
								"field": "broadcaster_id",
							},
						},
					},
				},
			},
			expectedDepth: 1,
		},
		{
			name: "Three level aggregation",
			aggs: map[string]interface{}{
				"level1": map[string]interface{}{
					"terms": map[string]interface{}{
						"field": "field1",
					},
					"aggs": map[string]interface{}{
						"level2": map[string]interface{}{
							"terms": map[string]interface{}{
								"field": "field2",
							},
							"aggs": map[string]interface{}{
								"level3": map[string]interface{}{
									"terms": map[string]interface{}{
										"field": "field3",
									},
								},
							},
						},
					},
				},
			},
			expectedDepth: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			depth := validator.getMaxAggregationDepth(tt.aggs, 0)
			if depth != tt.expectedDepth {
				t.Errorf("getMaxAggregationDepth() = %d, want %d", depth, tt.expectedDepth)
			}
		})
	}
}

func TestDefaultSearchLimits(t *testing.T) {
	limits := DefaultSearchLimits()

	if limits.MaxResultSize != 100 {
		t.Errorf("MaxResultSize = %d, want 100", limits.MaxResultSize)
	}
	if limits.MaxAggregationSize != 100 {
		t.Errorf("MaxAggregationSize = %d, want 100", limits.MaxAggregationSize)
	}
	if limits.MaxAggregationNest != 2 {
		t.Errorf("MaxAggregationNest = %d, want 2", limits.MaxAggregationNest)
	}
	if limits.MaxQueryClauses != 20 {
		t.Errorf("MaxQueryClauses = %d, want 20", limits.MaxQueryClauses)
	}
	if limits.MaxSearchTime != 5*time.Second {
		t.Errorf("MaxSearchTime = %v, want %v", limits.MaxSearchTime, 5*time.Second)
	}
}
