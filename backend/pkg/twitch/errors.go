package twitch

import "fmt"

// Error types for Twitch API interactions
type (
	// AuthError represents authentication-related errors
	AuthError struct {
		Message string
		Err     error
	}

	// RateLimitError represents rate limit errors
	RateLimitError struct {
		Message    string
		RetryAfter int
		Err        error
	}

	// APIError represents general API errors
	APIError struct {
		StatusCode int
		Message    string
		Err        error
	}

	// CircuitBreakerError represents circuit breaker open state
	CircuitBreakerError struct {
		Message string
	}
)

func (e *AuthError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("auth error: %s: %v", e.Message, e.Err)
	}
	return fmt.Sprintf("auth error: %s", e.Message)
}

func (e *AuthError) Unwrap() error {
	return e.Err
}

func (e *RateLimitError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("rate limit error: %s (retry after %d seconds): %v", e.Message, e.RetryAfter, e.Err)
	}
	return fmt.Sprintf("rate limit error: %s (retry after %d seconds)", e.Message, e.RetryAfter)
}

func (e *RateLimitError) Unwrap() error {
	return e.Err
}

func (e *APIError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("API error (status %d): %s: %v", e.StatusCode, e.Message, e.Err)
	}
	return fmt.Sprintf("API error (status %d): %s", e.StatusCode, e.Message)
}

func (e *APIError) Unwrap() error {
	return e.Err
}

func (e *CircuitBreakerError) Error() string {
	return fmt.Sprintf("circuit breaker open: %s", e.Message)
}
