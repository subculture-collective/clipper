package repository

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var (
	// ErrQueryTooComplex is returned when a query exceeds complexity limits
	ErrQueryTooComplex = errors.New("query complexity exceeds maximum allowed")
	// ErrOffsetTooLarge is returned when pagination offset is too large
	ErrOffsetTooLarge = errors.New("pagination offset exceeds maximum allowed")
	// ErrLimitTooLarge is returned when result limit is too large
	ErrLimitTooLarge = errors.New("result limit exceeds maximum allowed")
	// ErrTooManyJoins is returned when query has too many joins
	ErrTooManyJoins = errors.New("query has too many joins")
)

// QueryLimits defines limits for database queries
type QueryLimits struct {
	MaxResultSize   int           // Maximum number of rows that can be returned
	MaxOffset       int           // Maximum offset for pagination
	MaxJoinDepth    int           // Maximum number of joins allowed
	MaxQueryTime    time.Duration // Maximum query execution time
	MaxLockWaitTime time.Duration // Maximum time to wait for locks
}

// DefaultQueryLimits returns sensible defaults for query limits
func DefaultQueryLimits() QueryLimits {
	return QueryLimits{
		MaxResultSize:   1000,
		MaxOffset:       1000,
		MaxJoinDepth:    3,
		MaxQueryTime:    10 * time.Second,
		MaxLockWaitTime: 2 * time.Second,
	}
}

// QueryCost represents the estimated cost of a database query
type QueryCost struct {
	JoinCount   int           // Number of joins in the query
	ScanSize    int64         // Estimated number of rows to scan
	Complexity  float64       // Overall complexity score (0-100)
	Estimated   time.Duration // Estimated execution time
	HasOffset   bool          // Whether query uses offset-based pagination
	OffsetValue int           // The offset value if present
	LimitValue  int           // The limit value if present
}

// QueryCostAnalyzer analyzes database queries for complexity and resource usage
type QueryCostAnalyzer struct {
	limits QueryLimits
}

// NewQueryCostAnalyzer creates a new query cost analyzer
func NewQueryCostAnalyzer(limits QueryLimits) *QueryCostAnalyzer {
	return &QueryCostAnalyzer{
		limits: limits,
	}
}

// GetLimits returns the configured limits
func (a *QueryCostAnalyzer) GetLimits() QueryLimits {
	return a.limits
}

// AnalyzeQuery analyzes a SQL query and returns cost information
func (a *QueryCostAnalyzer) AnalyzeQuery(query string) (*QueryCost, error) {
	query = strings.ToUpper(strings.TrimSpace(query))
	
	cost := &QueryCost{
		JoinCount:   countJoins(query),
		ScanSize:    estimateScanSize(query),
		HasOffset:   strings.Contains(query, "OFFSET"),
		OffsetValue: extractOffset(query),
		LimitValue:  extractLimit(query),
	}
	
	// Calculate complexity score based on various factors
	cost.Complexity = calculateComplexity(cost)
	
	// Estimate execution time (rough approximation)
	cost.Estimated = estimateExecutionTime(cost)
	
	return cost, nil
}

// ValidateQuery validates a query against configured limits
func (a *QueryCostAnalyzer) ValidateQuery(query string) error {
	cost, err := a.AnalyzeQuery(query)
	if err != nil {
		return err
	}
	
	// Check join count
	if cost.JoinCount > a.limits.MaxJoinDepth {
		return fmt.Errorf("%w: %d joins (max: %d)", ErrTooManyJoins, cost.JoinCount, a.limits.MaxJoinDepth)
	}
	
	// Check offset
	if cost.HasOffset && cost.OffsetValue > a.limits.MaxOffset {
		return fmt.Errorf("%w: offset %d (max: %d)", ErrOffsetTooLarge, cost.OffsetValue, a.limits.MaxOffset)
	}
	
	// Check limit
	if cost.LimitValue > a.limits.MaxResultSize {
		return fmt.Errorf("%w: limit %d (max: %d)", ErrLimitTooLarge, cost.LimitValue, a.limits.MaxResultSize)
	}
	
	// Check overall complexity
	if cost.Complexity > 100 {
		return fmt.Errorf("%w: complexity score %.2f", ErrQueryTooComplex, cost.Complexity)
	}
	
	return nil
}

// ValidatePagination validates pagination parameters
func (a *QueryCostAnalyzer) ValidatePagination(limit, offset int) error {
	if limit > a.limits.MaxResultSize {
		return fmt.Errorf("%w: limit %d (max: %d)", ErrLimitTooLarge, limit, a.limits.MaxResultSize)
	}
	
	if offset > a.limits.MaxOffset {
		return fmt.Errorf("%w: offset %d (max: %d)", ErrOffsetTooLarge, offset, a.limits.MaxOffset)
	}
	
	return nil
}

// countJoins counts the number of JOIN clauses in a query
func countJoins(query string) int {
	joinPattern := regexp.MustCompile(`\bJOIN\b`)
	matches := joinPattern.FindAllString(query, -1)
	return len(matches)
}

// estimateScanSize estimates the number of rows that will be scanned
// This is a very rough estimate based on query patterns
func estimateScanSize(query string) int64 {
	// Look for LIMIT clause
	limit := extractLimit(query)
	if limit > 0 {
		return int64(limit)
	}
	
	// If no LIMIT, assume full table scan potential
	// This is conservative - actual scan size depends on WHERE clauses
	return 10000 // Default estimate for queries without LIMIT
}

// extractLimit extracts the LIMIT value from a query
func extractLimit(query string) int {
	limitPattern := regexp.MustCompile(`LIMIT\s+(\d+)`)
	matches := limitPattern.FindStringSubmatch(query)
	if len(matches) > 1 {
		var limit int
		fmt.Sscanf(matches[1], "%d", &limit)
		return limit
	}
	return 0
}

// extractOffset extracts the OFFSET value from a query
func extractOffset(query string) int {
	offsetPattern := regexp.MustCompile(`OFFSET\s+(\d+)`)
	matches := offsetPattern.FindStringSubmatch(query)
	if len(matches) > 1 {
		var offset int
		fmt.Sscanf(matches[1], "%d", &offset)
		return offset
	}
	return 0
}

// calculateComplexity calculates a complexity score for the query
// Score ranges from 0-100+, with higher scores indicating more complex queries
func calculateComplexity(cost *QueryCost) float64 {
	complexity := 0.0
	
	// Base complexity for any query
	complexity += 1.0
	
	// Add complexity for joins (each join adds significant cost)
	complexity += float64(cost.JoinCount) * 10.0
	
	// Add complexity for large scans
	if cost.ScanSize > 1000 {
		complexity += float64(cost.ScanSize) / 100.0
	}
	
	// Add complexity for large offsets (offset-based pagination is expensive)
	if cost.HasOffset {
		complexity += float64(cost.OffsetValue) / 100.0
	}
	
	// Large result sets add complexity
	if cost.LimitValue > 100 {
		complexity += float64(cost.LimitValue) / 50.0
	}
	
	return complexity
}

// estimateExecutionTime provides a rough estimate of query execution time
func estimateExecutionTime(cost *QueryCost) time.Duration {
	// Base time
	duration := 10 * time.Millisecond
	
	// Add time for joins (each join is expensive)
	duration += time.Duration(cost.JoinCount) * 20 * time.Millisecond
	
	// Add time for large scans
	if cost.ScanSize > 1000 {
		duration += time.Duration(cost.ScanSize/1000) * 50 * time.Millisecond
	}
	
	// Add time for offset (offset-based pagination scans all rows up to offset)
	if cost.HasOffset {
		duration += time.Duration(cost.OffsetValue/100) * 10 * time.Millisecond
	}
	
	return duration
}
