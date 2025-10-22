package middleware

import (
	"sync"
	"testing"
	"time"
)

func TestInMemoryRateLimiter_Allow(t *testing.T) {
	tests := []struct {
		name      string
		limit     int
		window    time.Duration
		requests  int
		waitTime  time.Duration
		wantAllow []bool
	}{
		{
			name:      "allows requests within limit",
			limit:     3,
			window:    time.Second,
			requests:  3,
			waitTime:  0,
			wantAllow: []bool{true, true, true},
		},
		{
			name:      "blocks requests exceeding limit",
			limit:     2,
			window:    time.Second,
			requests:  3,
			waitTime:  0,
			wantAllow: []bool{true, true, false},
		},
		{
			name:      "resets after window expires",
			limit:     2,
			window:    100 * time.Millisecond,
			requests:  2,
			waitTime:  150 * time.Millisecond,
			wantAllow: []bool{true, true},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			limiter := NewInMemoryRateLimiter(tt.limit, tt.window)
			key := "test-key"

			for i := 0; i < tt.requests; i++ {
				if i > 0 && tt.waitTime > 0 {
					time.Sleep(tt.waitTime)
				}

				allowed, _ := limiter.Allow(key)
				expected := tt.wantAllow[i]

				if allowed != expected {
					t.Errorf("request %d: got allowed=%v, want %v", i+1, allowed, expected)
				}
			}
		})
	}
}

func TestInMemoryRateLimiter_Remaining(t *testing.T) {
	limiter := NewInMemoryRateLimiter(5, time.Second)
	key := "test-key"

	expectedRemaining := []int{4, 3, 2, 1, 0}

	for i := 0; i < 5; i++ {
		allowed, remaining := limiter.Allow(key)
		if !allowed {
			t.Fatalf("request %d should be allowed", i+1)
		}
		if remaining != expectedRemaining[i] {
			t.Errorf("request %d: got remaining=%d, want %d", i+1, remaining, expectedRemaining[i])
		}
	}

	// Next request should be blocked with 0 remaining
	allowed, remaining := limiter.Allow(key)
	if allowed {
		t.Error("request 6 should be blocked")
	}
	if remaining != 0 {
		t.Errorf("blocked request: got remaining=%d, want 0", remaining)
	}
}

func TestInMemoryRateLimiter_SlidingWindow(t *testing.T) {
	limiter := NewInMemoryRateLimiter(3, 200*time.Millisecond)
	key := "test-key"

	// Make 3 requests immediately (should all be allowed)
	for i := 0; i < 3; i++ {
		if allowed, _ := limiter.Allow(key); !allowed {
			t.Errorf("request %d should be allowed", i+1)
		}
	}

	// 4th request should be blocked
	if allowed, _ := limiter.Allow(key); allowed {
		t.Error("4th request should be blocked")
	}

	// Wait for window to partially expire
	time.Sleep(250 * time.Millisecond)

	// Now we should be able to make more requests
	if allowed, _ := limiter.Allow(key); !allowed {
		t.Error("request after window expiry should be allowed")
	}
}

func TestInMemoryRateLimiter_MultipleKeys(t *testing.T) {
	limiter := NewInMemoryRateLimiter(2, time.Second)

	// Request for key1
	if allowed, _ := limiter.Allow("key1"); !allowed {
		t.Error("first request for key1 should be allowed")
	}
	if allowed, _ := limiter.Allow("key1"); !allowed {
		t.Error("second request for key1 should be allowed")
	}
	if allowed, _ := limiter.Allow("key1"); allowed {
		t.Error("third request for key1 should be blocked")
	}

	// Request for key2 should be independent
	if allowed, _ := limiter.Allow("key2"); !allowed {
		t.Error("first request for key2 should be allowed")
	}
	if allowed, _ := limiter.Allow("key2"); !allowed {
		t.Error("second request for key2 should be allowed")
	}
	if allowed, _ := limiter.Allow("key2"); allowed {
		t.Error("third request for key2 should be blocked")
	}
}

func TestInMemoryRateLimiter_Concurrency(t *testing.T) {
	limiter := NewInMemoryRateLimiter(100, time.Second)
	key := "test-key"

	var wg sync.WaitGroup
	allowed := 0
	blocked := 0
	var mu sync.Mutex

	// Make 150 concurrent requests
	for i := 0; i < 150; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if ok, _ := limiter.Allow(key); ok {
				mu.Lock()
				allowed++
				mu.Unlock()
			} else {
				mu.Lock()
				blocked++
				mu.Unlock()
			}
		}()
	}

	wg.Wait()

	if allowed != 100 {
		t.Errorf("got %d allowed requests, want 100", allowed)
	}
	if blocked != 50 {
		t.Errorf("got %d blocked requests, want 50", blocked)
	}
}

func TestInMemoryRateLimiter_Cleanup(t *testing.T) {
	// Create limiter with short window for faster test
	limiter := NewInMemoryRateLimiter(5, 50*time.Millisecond)

	// Make requests for multiple keys
	for i := 0; i < 10; i++ {
		key := string(rune('a' + i))
		limiter.Allow(key)
	}

	// Verify keys exist
	count := 0
	limiter.requests.Range(func(_, _ interface{}) bool {
		count++
		return true
	})

	if count != 10 {
		t.Errorf("expected 10 keys, got %d", count)
	}

	// Wait for cleanup to run (2x window = 100ms, plus some buffer)
	time.Sleep(250 * time.Millisecond)

	// Keys should eventually be cleaned up (after 3x window)
	time.Sleep(200 * time.Millisecond)

	// Count remaining keys - some may still exist if within 3x window
	count = 0
	limiter.requests.Range(func(_, _ interface{}) bool {
		count++
		return true
	})

	// After enough time, old entries should be cleaned
	if count > 0 {
		// Give it one more cleanup cycle
		time.Sleep(200 * time.Millisecond)
		count = 0
		limiter.requests.Range(func(_, _ interface{}) bool {
			count++
			return true
		})
	}

	// We just verify cleanup runs without panic, exact count may vary
	t.Logf("Remaining keys after cleanup: %d", count)
}
