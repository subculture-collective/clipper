package twitch

import (
	"testing"
	"time"
)

func TestNewRateLimiter(t *testing.T) {
	maxTokens := 100
	rl := NewRateLimiter(maxTokens)

	if rl == nil {
		t.Fatal("NewRateLimiter returned nil")
	}

	if rl.maxTokens != maxTokens {
		t.Errorf("expected maxTokens=%d, got=%d", maxTokens, rl.maxTokens)
	}

	if rl.tokens != maxTokens {
		t.Errorf("expected initial tokens=%d, got=%d", maxTokens, rl.tokens)
	}
}

func TestRateLimiter_Available(t *testing.T) {
	rl := NewRateLimiter(10)

	available := rl.Available()
	if available != 10 {
		t.Errorf("expected 10 tokens available, got %d", available)
	}
}

func TestRateLimiter_TokenRefill(t *testing.T) {
	rl := NewRateLimiter(10)

	// Use a token
	rl.mu.Lock()
	rl.tokens--
	rl.mu.Unlock()

	if rl.Available() != 9 {
		t.Errorf("expected 9 tokens after using one, got %d", rl.Available())
	}

	// Force refill by setting refillAt to past
	rl.mu.Lock()
	rl.refillAt = time.Now().Add(-time.Second)
	rl.mu.Unlock()

	// Check tokens are refilled
	if rl.Available() != 10 {
		t.Errorf("expected 10 tokens after refill, got %d", rl.Available())
	}
}
