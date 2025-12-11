package twitch

import (
	"testing"
	"time"
)

func TestNewCircuitBreaker(t *testing.T) {
	cb := NewCircuitBreaker(5, 30*time.Second)

	if cb == nil {
		t.Fatal("NewCircuitBreaker returned nil")
	}

	if cb.state != "closed" {
		t.Errorf("expected initial state to be 'closed', got %s", cb.state)
	}

	if cb.failureLimit != 5 {
		t.Errorf("expected failureLimit=5, got %d", cb.failureLimit)
	}

	if cb.timeout != 30*time.Second {
		t.Errorf("expected timeout=30s, got %v", cb.timeout)
	}
}

func TestCircuitBreaker_Allow(t *testing.T) {
	cb := NewCircuitBreaker(3, 5*time.Second)

	// Should allow when closed
	err := cb.Allow()
	if err != nil {
		t.Errorf("expected no error when circuit is closed, got %v", err)
	}

	// Trigger circuit breaker
	for i := 0; i < 3; i++ {
		cb.RecordFailure()
	}

	// Should not allow when open
	err = cb.Allow()
	if err == nil {
		t.Error("expected error when circuit is open")
	}
}

func TestCircuitBreaker_RecordSuccess(t *testing.T) {
	cb := NewCircuitBreaker(2, 100*time.Millisecond)

	// Trigger enough failures to open the circuit
	cb.RecordFailure()
	cb.RecordFailure()

	// Wait for the timeout to elapse so the circuit transitions to half-open
	time.Sleep(120 * time.Millisecond)

	// The next Allow should transition the circuit to half-open
	err := cb.Allow()
	if err != nil {
		t.Fatalf("expected Allow to succeed in half-open state, got %v", err)
	}

	// Now, record a success, which should transition the circuit to closed
	cb.RecordSuccess()

	cb.mu.RLock()
	state := cb.state
	failureCount := cb.failureCount
	cb.mu.RUnlock()

	if state != "closed" {
		t.Errorf("expected state 'closed' after success in half-open, got %s", state)
	}

	if failureCount != 0 {
		t.Errorf("expected failureCount=0 after success, got %d", failureCount)
	}
}

func TestCircuitBreaker_RecordFailure(t *testing.T) {
	cb := NewCircuitBreaker(2, 5*time.Second)

	cb.RecordFailure()
	cb.mu.RLock()
	count := cb.failureCount
	cb.mu.RUnlock()

	if count != 1 {
		t.Errorf("expected failureCount=1, got %d", count)
	}

	// Second failure should open the circuit
	cb.RecordFailure()

	cb.mu.RLock()
	state := cb.state
	cb.mu.RUnlock()

	if state != "open" {
		t.Errorf("expected state 'open' after reaching failure limit, got %s", state)
	}
}
