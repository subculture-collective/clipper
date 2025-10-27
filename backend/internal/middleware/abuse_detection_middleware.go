package middleware

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

const (
	// Abuse detection thresholds
	abuseDetectionWindow     = 1 * time.Hour
	abuseThreshold          = 100 // requests per hour
	abuseBanDuration        = 24 * time.Hour
	
	// Progressive rate limit penalties
	warningThreshold        = 0.8 // 80% of rate limit
	criticalThreshold       = 0.95 // 95% of rate limit
)

// AbuseDetectionMiddleware monitors and blocks abusive IPs
func AbuseDetectionMiddleware(redis *redispkg.Client) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip if Redis client is nil (for testing)
		if redis == nil {
			c.Next()
			return
		}

		ip := c.ClientIP()
		ctx := c.Request.Context()
		
		// Check if IP is banned
		banKey := fmt.Sprintf("abuse:ban:%s", ip)
		banned, err := redis.Exists(ctx, banKey)
		if err != nil {
			// Log error but don't block request
			log.Printf("Error checking ban status: %v", err)
		} else if banned {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Access denied due to abusive behavior",
			})
			c.Abort()
			return
		}
		
		// Track request for abuse detection
		abuseKey := fmt.Sprintf("abuse:track:%s", ip)
		count, err := redis.Increment(ctx, abuseKey)
		if err != nil {
			log.Printf("Error tracking abuse: %v", err)
		} else {
			// Set expiration on first request
			if count == 1 {
				_ = redis.Expire(ctx, abuseKey, abuseDetectionWindow)
			}
			
			// Check if threshold exceeded
			if count > int64(abuseThreshold) {
				// Ban the IP
				if err := redis.Set(ctx, banKey, "1", abuseBanDuration); err != nil {
					log.Printf("Error setting ban: %v", err)
				} else {
					log.Printf("IP %s banned for abuse (exceeded %d requests in %v)", 
						ip, abuseThreshold, abuseDetectionWindow)
					
					c.JSON(http.StatusForbidden, gin.H{
						"error": "Access denied due to abusive behavior",
					})
					c.Abort()
					return
				}
			}
		}
		
		c.Next()
	}
}

// EnhancedRateLimitMiddleware extends standard rate limiting with warnings
func EnhancedRateLimitMiddleware(redis *redispkg.Client, requests int, window time.Duration) gin.HandlerFunc {
	baseLimiter := RateLimitMiddleware(redis, requests, window)
	
	return func(c *gin.Context) {
		// Skip if Redis client is nil (for testing)
		if redis == nil {
			c.Next()
			return
		}

		// Get current rate limit stats before applying limiter
		ip := c.ClientIP()
		endpoint := c.Request.URL.Path
		key := fmt.Sprintf("ratelimit:%s:%s", endpoint, ip)
		
		ctx := c.Request.Context()
		now := time.Now()
		currentWindow := now.Unix() / int64(window.Seconds())
		currentKey := fmt.Sprintf("%s:%d", key, currentWindow)
		
		// Get current count
		currentCount := int64(0)
		if val, err := redis.Get(ctx, currentKey); err == nil {
			fmt.Sscanf(val, "%d", &currentCount)
		}
		
		// Calculate utilization percentage
		utilization := float64(currentCount) / float64(requests)
		
		// Add warning headers if approaching limit
		if utilization >= warningThreshold && utilization < criticalThreshold {
			c.Header("X-RateLimit-Warning", "approaching-limit")
		} else if utilization >= criticalThreshold {
			c.Header("X-RateLimit-Warning", "critical")
		}
		
		// Apply base rate limiter
		baseLimiter(c)
	}
}

// UnbanIP removes a ban for a specific IP (admin function)
func UnbanIP(ctx context.Context, redis *redispkg.Client, ip string) error {
	banKey := fmt.Sprintf("abuse:ban:%s", ip)
	return redis.Delete(ctx, banKey)
}

// GetBannedIPs returns a list of currently banned IPs (admin function)
func GetBannedIPs(ctx context.Context, redis *redispkg.Client) ([]string, error) {
	pattern := "abuse:ban:*"
	keys, err := redis.Keys(ctx, pattern)
	if err != nil {
		return nil, err
	}
	
	// Extract IPs from keys
	ips := make([]string, 0, len(keys))
	for _, key := range keys {
		// Remove "abuse:ban:" prefix
		if len(key) > 11 {
			ips = append(ips, key[11:])
		}
	}
	
	return ips, nil
}

// GetAbuseStats returns abuse statistics for an IP (admin function)
func GetAbuseStats(ctx context.Context, redis *redispkg.Client, ip string) (int64, error) {
	abuseKey := fmt.Sprintf("abuse:track:%s", ip)
	val, err := redis.Get(ctx, abuseKey)
	if err != nil {
		return 0, err
	}
	
	var count int64
	fmt.Sscanf(val, "%d", &count)
	return count, nil
}
