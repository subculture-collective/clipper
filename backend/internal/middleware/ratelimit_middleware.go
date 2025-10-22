package middleware

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	goredis "github.com/redis/go-redis/v9"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

// RateLimitMiddleware creates rate limiting middleware using sliding window algorithm
func RateLimitMiddleware(redis *redispkg.Client, requests int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get client IP and endpoint for granular rate limiting
		ip := c.ClientIP()
		endpoint := c.Request.URL.Path
		key := fmt.Sprintf("ratelimit:%s:%s", endpoint, ip)

		ctx := c.Request.Context()

		// Use sliding window algorithm for more accurate rate limiting
		// Key format: ratelimit:{endpoint}:{ip}:{timestamp_bucket}
		now := time.Now()
		currentWindow := now.Unix() / int64(window.Seconds())
		previousWindow := currentWindow - 1
		
		currentKey := fmt.Sprintf("%s:%d", key, currentWindow)
		previousKey := fmt.Sprintf("%s:%d", key, previousWindow)
		
		// Get counts from current and previous windows
		pipe := redis.Pipeline()
		currentCmd := pipe.Get(ctx, currentKey)
		previousCmd := pipe.Get(ctx, previousKey)
		if _, err := pipe.Exec(ctx); err != nil && !errors.Is(err, goredis.Nil) {
			// If Redis pipeline fails, allow the request (fail open)
			c.Next()
			return
		}
		
		currentCount := int64(0)
		if val, err := currentCmd.Result(); err == nil {
			if n, err := fmt.Sscanf(val, "%d", &currentCount); err != nil || n != 1 {
				fmt.Printf("Warning: failed to parse currentCount from Redis value '%s': n=%d, err=%v\n", val, n, err)
			}
		}
		
		previousCount := int64(0)
		if val, err := previousCmd.Result(); err == nil {
			if n, err := fmt.Sscanf(val, "%d", &previousCount); err != nil || n != 1 {
				fmt.Printf("Warning: failed to parse previousCount from Redis value '%s': n=%d, err=%v\n", val, n, err)
			}
		}
		
		// Calculate weighted count for sliding window
		elapsed := float64(now.Unix() % int64(window.Seconds()))
		windowSeconds := float64(window.Seconds())
		weight := (windowSeconds - elapsed) / windowSeconds
		
		weightedCount := int64(float64(previousCount)*weight) + currentCount
		
		// Check if rate limit exceeded
		if weightedCount >= int64(requests) {
			retryAfter := int(windowSeconds - elapsed)
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", requests))
			c.Header("X-RateLimit-Remaining", "0")
			c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", now.Unix()+int64(retryAfter)))
			c.Header("Retry-After", fmt.Sprintf("%d", retryAfter))
			
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error":       "Rate limit exceeded. Please try again later.",
				"retry_after": retryAfter,
			})
			c.Abort()
			return
		}
		
		// Increment current window counter
		count, err := redis.Increment(ctx, currentKey)
		if err != nil {
			// If Redis fails, allow the request (fail open)
			c.Next()
			return
		}
		
		// Set expiration on first request (2x window to keep previous window)
		if count == 1 {
			_ = redis.Expire(ctx, currentKey, window*2)
		}
		
		// Add rate limit headers
		remaining := int64(requests) - (weightedCount + 1)
		if remaining < 0 {
			remaining = 0
		}
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", requests))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		c.Header("X-RateLimit-Reset", fmt.Sprintf("%d", (currentWindow+1)*int64(window.Seconds())))
		
		c.Next()
	}
}

// RateLimitByUserMiddleware creates rate limiting middleware based on authenticated user
func RateLimitByUserMiddleware(redis *redispkg.Client, requests int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get user ID from context (set by auth middleware)
		userID, exists := c.Get("user_id")
		if !exists {
			// Fall back to IP-based rate limiting
			RateLimitMiddleware(redis, requests, window)(c)
			return
		}
		
		endpoint := c.Request.URL.Path
		key := fmt.Sprintf("ratelimit:%s:user:%v", endpoint, userID)
		
		ctx := c.Request.Context()
		
		// Simple counter approach for authenticated users
		count, err := redis.Increment(ctx, key)
		if err != nil {
			// If Redis fails, allow the request (fail open)
			c.Next()
			return
		}
		
		// Set expiration on first request
		if count == 1 {
			_ = redis.Expire(ctx, key, window)
		}
		
		// Check if rate limit exceeded
		if count > int64(requests) {
			c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", requests))
			c.Header("X-RateLimit-Remaining", "0")
			
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}
		
		// Add rate limit headers
		remaining := int64(requests) - count
		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", requests))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		
		c.Next()
	}
}
