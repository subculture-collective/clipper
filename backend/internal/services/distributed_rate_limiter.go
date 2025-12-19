package services

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

// DistributedRateLimiter provides a Redis-backed distributed rate limiter
// using a sliding window algorithm. This ensures rate limits are enforced
// across multiple server instances.
type DistributedRateLimiter struct {
	redisClient *redispkg.Client
	limit       int
	window      time.Duration
}

// Rate limiter configuration constants
const (
	// rateLimitExpireBuffer is the additional time to keep rate limit keys in Redis
	// beyond the window duration to ensure proper cleanup
	rateLimitExpireBuffer = time.Minute
)

// NewDistributedRateLimiter creates a new distributed rate limiter
// limit: maximum number of requests allowed in the window
// window: time window for rate limiting
func NewDistributedRateLimiter(redisClient *redispkg.Client, limit int, window time.Duration) *DistributedRateLimiter {
	return &DistributedRateLimiter{
		redisClient: redisClient,
		limit:       limit,
		window:      window,
	}
}

// Allow checks if a request should be allowed for the given key.
// Uses Redis sorted sets with sliding window algorithm for accurate rate limiting.
// Returns true if the request is allowed, false if rate limit is exceeded.
func (r *DistributedRateLimiter) Allow(ctx context.Context, key string) (bool, error) {
	now := time.Now()
	windowStart := now.Add(-r.window)
	
	// Use a Redis key prefix to namespace rate limit keys
	redisKey := fmt.Sprintf("ratelimit:%s", key)
	
	// Get the underlying Redis client for direct operations
	client := r.redisClient.GetClient()
	
	// Use Redis pipeline for atomic operations
	pipe := client.Pipeline()
	
	// Remove old entries outside the window
	pipe.ZRemRangeByScore(ctx, redisKey, "0", fmt.Sprintf("%d", windowStart.UnixMilli()))
	
	// Count current entries in the window
	countCmd := pipe.ZCard(ctx, redisKey)
	
	// Execute pipeline
	_, err := pipe.Exec(ctx)
	if err != nil && err != redis.Nil {
		return false, fmt.Errorf("failed to check rate limit: %w", err)
	}
	
	count := countCmd.Val()
	
	// Check if limit exceeded
	if count >= int64(r.limit) {
		return false, nil
	}
	
	// Add current request with timestamp as score and unique member
	member := fmt.Sprintf("%d", now.UnixNano())
	score := float64(now.UnixMilli())
	
	// Add the new request and set expiration
	pipe2 := client.Pipeline()
	pipe2.ZAdd(ctx, redisKey, redis.Z{
		Score:  score,
		Member: member,
	})
	// Set expiration to window + buffer to allow cleanup
	pipe2.Expire(ctx, redisKey, r.window+rateLimitExpireBuffer)
	
	_, err = pipe2.Exec(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to record request: %w", err)
	}
	
	return true, nil
}

// RateLimiter interface for abstraction
type RateLimiter interface {
	Allow(ctx context.Context, key string) (bool, error)
}

// InMemoryRateLimiterAdapter adapts SimpleRateLimiter to the RateLimiter interface
// This is used as a fallback when Redis is not available
type InMemoryRateLimiterAdapter struct {
	limiter *SimpleRateLimiter
}

// NewInMemoryRateLimiterAdapter creates an adapter for SimpleRateLimiter
func NewInMemoryRateLimiterAdapter(limit int, window time.Duration) *InMemoryRateLimiterAdapter {
	return &InMemoryRateLimiterAdapter{
		limiter: NewSimpleRateLimiter(limit, window),
	}
}

// Allow implements the RateLimiter interface for in-memory rate limiting
func (a *InMemoryRateLimiterAdapter) Allow(ctx context.Context, key string) (bool, error) {
	return a.limiter.Allow(key), nil
}
