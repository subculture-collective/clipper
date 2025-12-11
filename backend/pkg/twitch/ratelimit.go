package twitch

import (
	"context"
	"log"
	"sync"
	"time"
)

// RateLimiter implements token bucket rate limiting for Twitch API
type RateLimiter struct {
	tokens    int
	maxTokens int
	refillAt  time.Time
	mu        sync.Mutex
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxTokens int) *RateLimiter {
	return &RateLimiter{
		tokens:    maxTokens,
		maxTokens: maxTokens,
		refillAt:  time.Now().Add(time.Minute),
	}
}

// Wait blocks until a token is available or context is cancelled
func (rl *RateLimiter) Wait(ctx context.Context) error {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Refill tokens if minute has passed
	if time.Now().After(rl.refillAt) {
		rl.tokens = rl.maxTokens
		rl.refillAt = time.Now().Add(time.Minute)
	}

	// Wait if no tokens available
	if rl.tokens <= 0 {
		waitTime := time.Until(rl.refillAt)
		if waitTime > 0 {
			log.Printf("Rate limit reached, waiting %v", waitTime)

			// Unlock while waiting
			rl.mu.Unlock()
			timer := time.NewTimer(waitTime)
			defer timer.Stop()

			select {
			case <-timer.C:
				rl.mu.Lock()
				rl.tokens = rl.maxTokens
				rl.refillAt = time.Now().Add(time.Minute)
			case <-ctx.Done():
				timer.Stop()
				return ctx.Err()
			}
		}
	}

	rl.tokens--
	return nil
}

// Available returns the number of tokens currently available
func (rl *RateLimiter) Available() int {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	// Refill if needed
	if time.Now().After(rl.refillAt) {
		rl.tokens = rl.maxTokens
		rl.refillAt = time.Now().Add(time.Minute)
	}

	return rl.tokens
}
