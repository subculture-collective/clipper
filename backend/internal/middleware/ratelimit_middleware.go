package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

// RateLimitMiddleware creates rate limiting middleware
func RateLimitMiddleware(redis *redispkg.Client, requests int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get client IP
		ip := c.ClientIP()
		key := fmt.Sprintf("ratelimit:%s", ip)

		ctx := c.Request.Context()

		// Increment counter
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
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded. Please try again later.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
