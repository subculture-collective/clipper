package twitch

import (
	"fmt"
	"strings"
)

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

// ModerationErrorCode represents structured error codes for moderation operations
type ModerationErrorCode string

const (
	// ModerationErrorCodeInsufficientScope indicates the token lacks required scopes
	ModerationErrorCodeInsufficientScope ModerationErrorCode = "insufficient_scope"
	// ModerationErrorCodeTargetNotFound indicates the target user was not found
	ModerationErrorCodeTargetNotFound ModerationErrorCode = "target_not_found"
	// ModerationErrorCodeAlreadyBanned indicates the user is already banned
	ModerationErrorCodeAlreadyBanned ModerationErrorCode = "already_banned"
	// ModerationErrorCodeNotBanned indicates the user is not currently banned
	ModerationErrorCodeNotBanned ModerationErrorCode = "not_banned"
	// ModerationErrorCodeRateLimited indicates rate limit was exceeded
	ModerationErrorCodeRateLimited ModerationErrorCode = "rate_limited"
	// ModerationErrorCodeUnknown indicates an unknown error occurred
	ModerationErrorCodeUnknown ModerationErrorCode = "unknown"
	// ModerationErrorCodeInvalidRequest indicates a malformed request
	ModerationErrorCodeInvalidRequest ModerationErrorCode = "invalid_request"
	// ModerationErrorCodeServerError indicates a Twitch server error
	ModerationErrorCodeServerError ModerationErrorCode = "server_error"
)

// ModerationError represents a structured error from moderation operations
type ModerationError struct {
	Code       ModerationErrorCode
	Message    string
	StatusCode int
	RequestID  string
	Err        error
}

func (e *ModerationError) Error() string {
	if e.RequestID != "" {
		return fmt.Sprintf("moderation error [%s] (request_id: %s): %s", e.Code, e.RequestID, e.Message)
	}
	return fmt.Sprintf("moderation error [%s]: %s", e.Code, e.Message)
}

func (e *ModerationError) Unwrap() error {
	return e.Err
}

// ParseModerationError parses a Twitch API error response into a ModerationError
func ParseModerationError(statusCode int, body string, requestID string) *ModerationError {
	err := &ModerationError{
		StatusCode: statusCode,
		Message:    body,
		RequestID:  requestID,
	}

	// Map status codes and response bodies to error codes
	switch statusCode {
	case 401, 403:
		// Check if it's a scope issue
		if containsAny(body, "insufficient", "scope", "permission") {
			err.Code = ModerationErrorCodeInsufficientScope
			err.Message = "Insufficient permissions or scopes to perform this action"
		} else {
			err.Code = ModerationErrorCodeInsufficientScope
			err.Message = "Authentication or authorization failed"
		}
	case 404:
		err.Code = ModerationErrorCodeTargetNotFound
		err.Message = "Target user or resource not found"
	case 400:
		if containsAny(body, "already banned", "user is banned") {
			err.Code = ModerationErrorCodeAlreadyBanned
			err.Message = "User is already banned in this channel"
		} else if containsAny(body, "not banned", "user is not banned") {
			err.Code = ModerationErrorCodeNotBanned
			err.Message = "User is not currently banned in this channel"
		} else {
			err.Code = ModerationErrorCodeInvalidRequest
			err.Message = fmt.Sprintf("Invalid request: %s", body)
		}
	case 429:
		err.Code = ModerationErrorCodeRateLimited
		err.Message = "Rate limit exceeded for this channel"
	case 500, 502, 503, 504:
		err.Code = ModerationErrorCodeServerError
		err.Message = "Twitch server error, please retry"
	default:
		err.Code = ModerationErrorCodeUnknown
		err.Message = fmt.Sprintf("Unknown error (status %d): %s", statusCode, body)
	}

	return err
}

// containsAny checks if a string contains any of the given substrings (case-insensitive)
func containsAny(s string, substrings ...string) bool {
	lowerS := strings.ToLower(s)
	for _, substr := range substrings {
		if strings.Contains(lowerS, strings.ToLower(substr)) {
			return true
		}
	}
	return false
}
