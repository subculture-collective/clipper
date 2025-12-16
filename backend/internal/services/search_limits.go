package services

import (
	"errors"
	"fmt"
	"time"
)

var (
	// ErrSearchResultSizeTooLarge is returned when search result size exceeds limit
	ErrSearchResultSizeTooLarge = errors.New("search result size exceeds maximum allowed")
	// ErrAggregationSizeTooLarge is returned when aggregation size exceeds limit
	ErrAggregationSizeTooLarge = errors.New("aggregation size exceeds maximum allowed")
	// ErrAggregationDepthTooDeep is returned when aggregation nesting is too deep
	ErrAggregationDepthTooDeep = errors.New("aggregation nesting exceeds maximum depth")
	// ErrTooManyQueryClauses is returned when there are too many query clauses
	ErrTooManyQueryClauses = errors.New("number of query clauses exceeds maximum allowed")
)

// SearchLimits defines limits for OpenSearch queries
type SearchLimits struct {
	MaxResultSize      int           // Maximum number of results per query
	MaxAggregationSize int           // Maximum aggregation bucket size
	MaxAggregationNest int           // Maximum nested aggregation depth
	MaxQueryClauses    int           // Maximum number of bool query clauses
	MaxSearchTime      time.Duration // Maximum search timeout
	MaxShardSize       int           // Maximum number of shards to query
	MaxOffset          int           // Maximum pagination offset
}

// DefaultSearchLimits returns sensible defaults for search limits
func DefaultSearchLimits() SearchLimits {
	return SearchLimits{
		MaxResultSize:      100,
		MaxAggregationSize: 100,
		MaxAggregationNest: 2,
		MaxQueryClauses:    20,
		MaxSearchTime:      5 * time.Second,
		MaxShardSize:       5,
		MaxOffset:          1000,
	}
}

// SearchQueryValidator validates OpenSearch queries against limits
type SearchQueryValidator struct {
	limits SearchLimits
}

// NewSearchQueryValidator creates a new search query validator
func NewSearchQueryValidator(limits SearchLimits) *SearchQueryValidator {
	return &SearchQueryValidator{
		limits: limits,
	}
}

// GetLimits returns the configured search limits
func (v *SearchQueryValidator) GetLimits() SearchLimits {
	return v.limits
}

// ValidateSearchSize validates the search result size
func (v *SearchQueryValidator) ValidateSearchSize(size int) error {
	if size > v.limits.MaxResultSize {
		return fmt.Errorf("%w: requested %d (max: %d)", ErrSearchResultSizeTooLarge, size, v.limits.MaxResultSize)
	}
	return nil
}

// ValidateAggregations validates aggregation structure
func (v *SearchQueryValidator) ValidateAggregations(aggs map[string]interface{}) error {
	if len(aggs) == 0 {
		return nil
	}
	
	// Check aggregation depth
	maxDepth := v.getMaxAggregationDepth(aggs, 0)
	if maxDepth > v.limits.MaxAggregationNest {
		return fmt.Errorf("%w: depth %d (max: %d)", ErrAggregationDepthTooDeep, maxDepth, v.limits.MaxAggregationNest)
	}
	
	// Check aggregation sizes
	if err := v.validateAggregationSizes(aggs); err != nil {
		return err
	}
	
	return nil
}

// getMaxAggregationDepth recursively calculates the maximum nesting depth of aggregations
func (v *SearchQueryValidator) getMaxAggregationDepth(aggs map[string]interface{}, currentDepth int) int {
	maxDepth := currentDepth
	
	for _, aggValue := range aggs {
		if aggMap, ok := aggValue.(map[string]interface{}); ok {
			// Check if there are nested aggregations
			if nestedAggs, hasNested := aggMap["aggs"].(map[string]interface{}); hasNested {
				depth := v.getMaxAggregationDepth(nestedAggs, currentDepth+1)
				if depth > maxDepth {
					maxDepth = depth
				}
			}
			// Also check "aggregations" key (alternative naming)
			if nestedAggs, hasNested := aggMap["aggregations"].(map[string]interface{}); hasNested {
				depth := v.getMaxAggregationDepth(nestedAggs, currentDepth+1)
				if depth > maxDepth {
					maxDepth = depth
				}
			}
		}
	}
	
	return maxDepth
}

// validateAggregationSizes checks that aggregation bucket sizes are within limits
func (v *SearchQueryValidator) validateAggregationSizes(aggs map[string]interface{}) error {
	for aggName, aggValue := range aggs {
		if aggMap, ok := aggValue.(map[string]interface{}); ok {
			// Check terms aggregation size
			if terms, hasTerms := aggMap["terms"].(map[string]interface{}); hasTerms {
				if size, hasSize := terms["size"].(float64); hasSize {
					if int(size) > v.limits.MaxAggregationSize {
						return fmt.Errorf("%w for '%s': requested %d (max: %d)", 
							ErrAggregationSizeTooLarge, aggName, int(size), v.limits.MaxAggregationSize)
					}
				}
				// Also check as int
				if size, hasSize := terms["size"].(int); hasSize {
					if size > v.limits.MaxAggregationSize {
						return fmt.Errorf("%w for '%s': requested %d (max: %d)", 
							ErrAggregationSizeTooLarge, aggName, size, v.limits.MaxAggregationSize)
					}
				}
			}
			
			// Recursively check nested aggregations
			if nestedAggs, hasNested := aggMap["aggs"].(map[string]interface{}); hasNested {
				if err := v.validateAggregationSizes(nestedAggs); err != nil {
					return err
				}
			}
			if nestedAggs, hasNested := aggMap["aggregations"].(map[string]interface{}); hasNested {
				if err := v.validateAggregationSizes(nestedAggs); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

// ValidateQueryClauses validates the number of query clauses
func (v *SearchQueryValidator) ValidateQueryClauses(query map[string]interface{}) error {
	clauseCount := v.countQueryClauses(query)
	if clauseCount > v.limits.MaxQueryClauses {
		return fmt.Errorf("%w: found %d (max: %d)", ErrTooManyQueryClauses, clauseCount, v.limits.MaxQueryClauses)
	}
	return nil
}

// countQueryClauses recursively counts the number of clauses in a query
func (v *SearchQueryValidator) countQueryClauses(query map[string]interface{}) int {
	count := 0
	
	for key, value := range query {
		switch key {
		case "must", "should", "must_not", "filter":
			// These are arrays of clauses in bool queries
			if clauseArray, ok := value.([]interface{}); ok {
				// Count each clause in the array
				for _, clause := range clauseArray {
					count++ // Count this clause
					// Recursively count nested clauses within this clause
					if clauseMap, ok := clause.(map[string]interface{}); ok {
						count += v.countQueryClauses(clauseMap)
					}
				}
			}
		case "bool":
			// Recursively process bool queries
			if boolMap, ok := value.(map[string]interface{}); ok {
				count += v.countQueryClauses(boolMap)
			}
		}
	}
	
	return count
}

// EnforceSearchLimits enforces search limits on a search request
func (v *SearchQueryValidator) EnforceSearchLimits(size *int, from *int) {
	// Enforce maximum result size
	if size != nil && *size > v.limits.MaxResultSize {
		*size = v.limits.MaxResultSize
	}
	
	// Ensure size is at least 1 if specified
	if size != nil && *size < 1 {
		defaultSize := 10
		*size = defaultSize
	}
	
	// Enforce maximum and minimum offset for 'from'
	if from != nil {
		if *from > v.limits.MaxOffset {
			*from = v.limits.MaxOffset
		}
		if *from < 0 {
			*from = 0
		}
	}
}

// GetTimeout returns the maximum search timeout
func (v *SearchQueryValidator) GetTimeout() time.Duration {
	return v.limits.MaxSearchTime
}
