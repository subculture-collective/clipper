//go:build integration

package services

import (
	"context"
	"testing"
)

// TestGetClipMetadata_Integration tests the GetClipMetadata function with real dependencies
// These tests require a test environment with database and Redis running
// Run with: go test -tags=integration ./internal/services -run TestGetClipMetadata_Integration
func TestGetClipMetadata_Integration(t *testing.T) {
	// Skip if not running integration tests
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	// Note: This test requires a real Twitch API client
	// For integration testing, you would need to:
	// 1. Set up a test environment with TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET
	// 2. Have Redis running for caching tests
	// 3. Use real clip IDs from Twitch

	t.Run("Valid clip URL returns metadata", func(t *testing.T) {
		// This test requires real Twitch credentials
		t.Skip("Requires Twitch API credentials")
	})

	t.Run("Missing URL parameter returns 400", func(t *testing.T) {
		service := &SubmissionService{}
		_, err := service.GetClipMetadata(context.Background(), "")
		if err == nil {
			t.Error("Expected error for empty URL")
		}
		valErr, ok := err.(*ValidationError)
		if !ok {
			t.Errorf("Expected ValidationError, got %T", err)
		}
		if valErr.Field != "url" {
			t.Errorf("Expected field 'url', got '%s'", valErr.Field)
		}
	})

	t.Run("Invalid URL format returns validation error", func(t *testing.T) {
		service := &SubmissionService{}
		_, err := service.GetClipMetadata(context.Background(), "   ")
		if err == nil {
			t.Error("Expected error for whitespace-only URL")
		}
	})

	t.Run("Direct clip ID input works", func(t *testing.T) {
		service := &SubmissionService{}
		clipID, normalizedURL := service.normalizeClipURL("TestClipID123")
		if clipID != "TestClipID123" {
			t.Errorf("Expected clipID 'TestClipID123', got '%s'", clipID)
		}
		if normalizedURL != "https://clips.twitch.tv/TestClipID123" {
			t.Errorf("Expected normalized URL, got '%s'", normalizedURL)
		}
	})

	t.Run("Alternative twitch.tv URL format works", func(t *testing.T) {
		service := &SubmissionService{}
		clipID, normalizedURL := service.normalizeClipURL("https://www.twitch.tv/username/clip/TestClipID123")
		if clipID != "TestClipID123" {
			t.Errorf("Expected clipID 'TestClipID123', got '%s'", clipID)
		}
		if normalizedURL != "https://clips.twitch.tv/TestClipID123" {
			t.Errorf("Expected normalized URL, got '%s'", normalizedURL)
		}
	})

	t.Run("URL normalization to canonical format", func(t *testing.T) {
		service := &SubmissionService{}

		testCases := []struct {
			input    string
			expected string
		}{
			{"https://clips.twitch.tv/TestClip", "https://clips.twitch.tv/TestClip"},
			{"https://www.twitch.tv/user/clip/TestClip", "https://clips.twitch.tv/TestClip"},
			{"https://m.twitch.tv/user/clip/TestClip", "https://clips.twitch.tv/TestClip"},
			{"TestClip", "https://clips.twitch.tv/TestClip"},
		}

		for _, tc := range testCases {
			_, url := service.normalizeClipURL(tc.input)
			if url != tc.expected {
				t.Errorf("normalizeClipURL(%s) = %s, want %s", tc.input, url, tc.expected)
			}
		}
	})
}

// TestCachingBehavior_Integration tests Redis caching (requires Redis)
func TestCachingBehavior_Integration(t *testing.T) {
	// Skip if not running integration tests
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	t.Run("Second request uses cache", func(t *testing.T) {
		// This test requires:
		// 1. Redis running
		// 2. Twitch API credentials
		// The test would verify that:
		// - First request takes longer (API call)
		// - Second request is faster (cache hit)
		t.Skip("Requires Redis and Twitch API credentials")
	})
}
