package middleware

import (
	"sync"
	"time"
)

// InMemoryRateLimiter provides a fallback rate limiter when Redis is unavailable
// Uses a sliding window algorithm with memory cleanup
type InMemoryRateLimiter struct {
	requests sync.Map // map[string]*requestWindow
	window   time.Duration
	limit    int
	mu       sync.Mutex
}

// requestWindow tracks requests in a sliding window
type requestWindow struct {
	timestamps []time.Time
	mu         sync.Mutex
}

// NewInMemoryRateLimiter creates a new in-memory rate limiter
func NewInMemoryRateLimiter(limit int, window time.Duration) *InMemoryRateLimiter {
	limiter := &InMemoryRateLimiter{
		window: window,
		limit:  limit,
	}
	// Start cleanup goroutine to prevent memory leaks
	go limiter.cleanup()
	return limiter
}

// Allow checks if a request should be allowed based on the rate limit
// Returns (allowed bool, remaining int)
func (r *InMemoryRateLimiter) Allow(key string) (bool, int) {
	now := time.Now()

	// Get or create request window for this key
	val, _ := r.requests.LoadOrStore(key, &requestWindow{
		timestamps: make([]time.Time, 0),
	})
	window := val.(*requestWindow)

	window.mu.Lock()
	defer window.mu.Unlock()

	// Remove timestamps outside the current window
	cutoff := now.Add(-r.window)
	validTimestamps := make([]time.Time, 0, len(window.timestamps))
	for _, ts := range window.timestamps {
		if ts.After(cutoff) {
			validTimestamps = append(validTimestamps, ts)
		}
	}
	window.timestamps = validTimestamps

	// Check if limit is exceeded
	if len(window.timestamps) >= r.limit {
		return false, 0
	}

	// Add current timestamp
	window.timestamps = append(window.timestamps, now)
	remaining := r.limit - len(window.timestamps)

	return true, remaining
}

// cleanup periodically removes old entries to prevent memory leaks
func (r *InMemoryRateLimiter) cleanup() {
	ticker := time.NewTicker(r.window * 2)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now()
		cutoff := now.Add(-r.window * 3) // Keep entries for 3x window duration

		r.requests.Range(func(key, val interface{}) bool {
			window := val.(*requestWindow)
			window.mu.Lock()

			// Check if all timestamps are old
			allOld := true
			for _, ts := range window.timestamps {
				if ts.After(cutoff) {
					allOld = false
					break
				}
			}

			// Remove entry if all timestamps are old
			if allOld {
				window.mu.Unlock()
				r.requests.Delete(key)
			} else {
				window.mu.Unlock()
			}

			return true
		})
	}
}
