package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// RepositoryHelper provides common functionality for repositories with query limits
type RepositoryHelper struct {
	pool     *pgxpool.Pool
	analyzer *QueryCostAnalyzer
}

// NewRepositoryHelper creates a new repository helper with default limits
func NewRepositoryHelper(pool *pgxpool.Pool) *RepositoryHelper {
	return &RepositoryHelper{
		pool:     pool,
		analyzer: NewQueryCostAnalyzer(DefaultQueryLimits()),
	}
}

// NewRepositoryHelperWithLimits creates a new repository helper with custom limits
func NewRepositoryHelperWithLimits(pool *pgxpool.Pool, limits QueryLimits) *RepositoryHelper {
	return &RepositoryHelper{
		pool:     pool,
		analyzer: NewQueryCostAnalyzer(limits),
	}
}

// ValidatePagination validates pagination parameters against limits
func (h *RepositoryHelper) ValidatePagination(limit, offset int) error {
	return h.analyzer.ValidatePagination(limit, offset)
}

// EnforcePaginationLimits enforces pagination limits, capping values at max allowed
func (h *RepositoryHelper) EnforcePaginationLimits(limit, offset *int) {
	if *limit > h.analyzer.limits.MaxResultSize {
		*limit = h.analyzer.limits.MaxResultSize
	}
	if *limit <= 0 {
		*limit = 10 // Default limit
	}
	
	if *offset > h.analyzer.limits.MaxOffset {
		*offset = h.analyzer.limits.MaxOffset
	}
	if *offset < 0 {
		*offset = 0
	}
}

// GetQueryTimeout returns the configured query timeout
func (h *RepositoryHelper) GetQueryTimeout() time.Duration {
	return h.analyzer.limits.MaxQueryTime
}

// ValidateQuery validates a SQL query against complexity limits
func (h *RepositoryHelper) ValidateQuery(query string) error {
	return h.analyzer.ValidateQuery(query)
}

// ExecuteWithTimeout executes a query with timeout context
func (h *RepositoryHelper) ExecuteWithTimeout(ctx context.Context, query string, args ...interface{}) error {
	// Validate query complexity first
	if err := h.ValidateQuery(query); err != nil {
		return fmt.Errorf("query validation failed: %w", err)
	}
	
	// Create timeout context
	timeout := h.GetQueryTimeout()
	ctxWithTimeout, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	
	// Execute query
	_, err := h.pool.Exec(ctxWithTimeout, query, args...)
	return err
}

// GetLimits returns the configured query limits
func (h *RepositoryHelper) GetLimits() QueryLimits {
	return h.analyzer.limits
}
