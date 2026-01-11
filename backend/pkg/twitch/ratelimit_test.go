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

func TestNewChannelRateLimiter(t *testing.T) {
	maxTokens := 100
	crl := NewChannelRateLimiter(maxTokens)

	if crl == nil {
		t.Fatal("NewChannelRateLimiter returned nil")
	}

	if crl.maxTokens != maxTokens {
		t.Errorf("expected maxTokens=%d, got=%d", maxTokens, crl.maxTokens)
	}

	if crl.limiters == nil {
		t.Error("expected limiters map to be initialized")
	}
}

func TestChannelRateLimiter_PerChannel(t *testing.T) {
	crl := NewChannelRateLimiter(10)
	ctx := context.Background()

	// Channel 1 should have independent tokens
	channel1 := "12345"
	channel2 := "67890"

	// Use 3 tokens from channel1
	for i := 0; i < 3; i++ {
		if err := crl.Wait(ctx, channel1); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}

	// Channel1 should have 7 tokens left
	if available := crl.Available(channel1); available != 7 {
		t.Errorf("expected 7 tokens for channel1, got %d", available)
	}

	// Channel2 should still have all 10 tokens
	if available := crl.Available(channel2); available != 10 {
		t.Errorf("expected 10 tokens for channel2, got %d", available)
	}

	// Use 5 tokens from channel2
	for i := 0; i < 5; i++ {
		if err := crl.Wait(ctx, channel2); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
	}

	// Channel1 should still have 7 tokens
	if available := crl.Available(channel1); available != 7 {
		t.Errorf("expected 7 tokens for channel1, got %d", available)
	}

	// Channel2 should have 5 tokens left
	if available := crl.Available(channel2); available != 5 {
		t.Errorf("expected 5 tokens for channel2, got %d", available)
	}
}

func TestChannelRateLimiter_ConcurrentAccess(t *testing.T) {
	crl := NewChannelRateLimiter(100)
	ctx := context.Background()
	channelID := "test-channel"

	// Create multiple goroutines accessing the same channel
	done := make(chan bool, 10)
	for i := 0; i < 10; i++ {
		go func() {
			for j := 0; j < 5; j++ {
				if err := crl.Wait(ctx, channelID); err != nil {
					t.Errorf("unexpected error: %v", err)
				}
			}
			done <- true
		}()
	}

	// Wait for all goroutines to complete
	for i := 0; i < 10; i++ {
		<-done
	}

	// Should have consumed 50 tokens total (10 goroutines * 5 tokens each)
	expected := 100 - 50
	if available := crl.Available(channelID); available != expected {
		t.Errorf("expected %d tokens remaining, got %d", expected, available)
	}
}
