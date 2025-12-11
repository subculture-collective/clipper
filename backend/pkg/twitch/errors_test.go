package twitch

import (
	"testing"
)

func TestAuthError(t *testing.T) {
	err := &AuthError{Message: "test error"}
	if err.Error() != "auth error: test error" {
		t.Errorf("unexpected error message: %s", err.Error())
	}
}

func TestRateLimitError(t *testing.T) {
	err := &RateLimitError{Message: "test error", RetryAfter: 5}
	expected := "rate limit error: test error (retry after 5 seconds)"
	if err.Error() != expected {
		t.Errorf("expected %q, got %q", expected, err.Error())
	}
}

func TestAPIError(t *testing.T) {
	err := &APIError{StatusCode: 404, Message: "not found"}
	expected := "API error (status 404): not found"
	if err.Error() != expected {
		t.Errorf("expected %q, got %q", expected, err.Error())
	}
}

func TestCircuitBreakerError(t *testing.T) {
	err := &CircuitBreakerError{Message: "open"}
	expected := "circuit breaker open: open"
	if err.Error() != expected {
		t.Errorf("expected %q, got %q", expected, err.Error())
	}
}
