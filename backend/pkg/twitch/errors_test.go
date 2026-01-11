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

func TestModerationError(t *testing.T) {
	tests := []struct {
		name      string
		err       *ModerationError
		expected  string
	}{
		{
			name: "error with request ID",
			err: &ModerationError{
				Code:      ModerationErrorCodeAlreadyBanned,
				Message:   "User already banned",
				RequestID: "req-123",
			},
			expected: "moderation error [already_banned] (request_id: req-123): User already banned",
		},
		{
			name: "error without request ID",
			err: &ModerationError{
				Code:    ModerationErrorCodeRateLimited,
				Message: "Rate limit exceeded",
			},
			expected: "moderation error [rate_limited]: Rate limit exceeded",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.err.Error(); got != tt.expected {
				t.Errorf("expected %q, got %q", tt.expected, got)
			}
		})
	}
}

func TestParseModerationError(t *testing.T) {
	tests := []struct {
		name         string
		statusCode   int
		body         string
		requestID    string
		expectedCode ModerationErrorCode
	}{
		{
			name:         "401 unauthorized",
			statusCode:   401,
			body:         "insufficient scope",
			requestID:    "req-1",
			expectedCode: ModerationErrorCodeInsufficientScope,
		},
		{
			name:         "403 forbidden with scope message",
			statusCode:   403,
			body:         "missing required scope: moderator:manage:banned_users",
			requestID:    "req-2",
			expectedCode: ModerationErrorCodeInsufficientScope,
		},
		{
			name:         "404 not found",
			statusCode:   404,
			body:         "user not found",
			requestID:    "req-3",
			expectedCode: ModerationErrorCodeTargetNotFound,
		},
		{
			name:         "400 already banned",
			statusCode:   400,
			body:         "The user is already banned",
			requestID:    "req-4",
			expectedCode: ModerationErrorCodeAlreadyBanned,
		},
		{
			name:         "400 not banned",
			statusCode:   400,
			body:         "user is not banned",
			requestID:    "req-5",
			expectedCode: ModerationErrorCodeNotBanned,
		},
		{
			name:         "400 invalid request",
			statusCode:   400,
			body:         "invalid parameter",
			requestID:    "req-6",
			expectedCode: ModerationErrorCodeInvalidRequest,
		},
		{
			name:         "429 rate limited",
			statusCode:   429,
			body:         "rate limit exceeded",
			requestID:    "req-7",
			expectedCode: ModerationErrorCodeRateLimited,
		},
		{
			name:         "500 server error",
			statusCode:   500,
			body:         "internal server error",
			requestID:    "req-8",
			expectedCode: ModerationErrorCodeServerError,
		},
		{
			name:         "502 bad gateway",
			statusCode:   502,
			body:         "bad gateway",
			requestID:    "req-9",
			expectedCode: ModerationErrorCodeServerError,
		},
		{
			name:         "503 service unavailable",
			statusCode:   503,
			body:         "service unavailable",
			requestID:    "req-10",
			expectedCode: ModerationErrorCodeServerError,
		},
		{
			name:         "999 unknown error",
			statusCode:   999,
			body:         "unknown error",
			requestID:    "req-11",
			expectedCode: ModerationErrorCodeUnknown,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ParseModerationError(tt.statusCode, tt.body, tt.requestID)
			
			if err.Code != tt.expectedCode {
				t.Errorf("expected error code %s, got %s", tt.expectedCode, err.Code)
			}
			
			if err.StatusCode != tt.statusCode {
				t.Errorf("expected status code %d, got %d", tt.statusCode, err.StatusCode)
			}
			
			if err.RequestID != tt.requestID {
				t.Errorf("expected request ID %s, got %s", tt.requestID, err.RequestID)
			}
		})
	}
}

func TestContainsAny(t *testing.T) {
	tests := []struct {
		name       string
		s          string
		substrings []string
		expected   bool
	}{
		{
			name:       "single match",
			s:          "This is a test message",
			substrings: []string{"test"},
			expected:   true,
		},
		{
			name:       "case insensitive match",
			s:          "This is a TEST message",
			substrings: []string{"test"},
			expected:   true,
		},
		{
			name:       "multiple substrings, one matches",
			s:          "insufficient scope",
			substrings: []string{"missing", "insufficient", "denied"},
			expected:   true,
		},
		{
			name:       "no match",
			s:          "everything is fine",
			substrings: []string{"error", "fail", "bad"},
			expected:   false,
		},
		{
			name:       "empty substrings",
			s:          "some text",
			substrings: []string{},
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsAny(tt.s, tt.substrings...)
			if result != tt.expected {
				t.Errorf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}
