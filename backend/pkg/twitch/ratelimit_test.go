package twitch

import (
	"context"
	"testing"
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
	rl := NewRateLimiter(5)

	// Check initial tokens
	if rl.Available() != 5 {
		t.Errorf("expected 5 initial tokens, got %d", rl.Available())
	}

	// Consume one token
	ctx := context.Background()
	if err := rl.Wait(ctx); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should have 4 tokens left
	if rl.Available() != 4 {
		t.Errorf("expected 4 tokens after consuming one, got %d", rl.Available())
	}
}
