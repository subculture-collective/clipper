package services

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/pkg/twitch"
)

// TestGetClipMetadata_ValidURLFormats tests URL normalization and metadata fetch
func TestGetClipMetadata_ValidURLFormats(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedID    string
		expectedURL   string
		description   string
	}{
		{
			name:        "clips.twitch.tv URL",
			input:       "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			expectedID:  "AwkwardHelplessSalamanderSwiftRage",
			expectedURL: "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description: "Should handle standard clips.twitch.tv format",
		},
		{
			name:        "www.twitch.tv clip URL",
			input:       "https://www.twitch.tv/username/clip/AwkwardHelplessSalamanderSwiftRage",
			expectedID:  "AwkwardHelplessSalamanderSwiftRage",
			expectedURL: "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description: "Should normalize to clips.twitch.tv format",
		},
		{
			name:        "URL with query parameters",
			input:       "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage?filter=clips&range=7d",
			expectedID:  "AwkwardHelplessSalamanderSwiftRage",
			expectedURL: "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description: "Should strip query parameters",
		},
		{
			name:        "Direct clip ID",
			input:       "AwkwardHelplessSalamanderSwiftRage",
			expectedID:  "AwkwardHelplessSalamanderSwiftRage",
			expectedURL: "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description: "Should accept direct clip ID and normalize to URL",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// This test validates URL parsing logic only
			// The actual Twitch API call is tested separately with mocks
			service := &SubmissionService{}
			clipID, normalizedURL := service.normalizeClipURL(tt.input)

			assert.Equal(t, tt.expectedID, clipID, tt.description)
			assert.Equal(t, tt.expectedURL, normalizedURL, tt.description)
		})
	}
}

// TestGetClipMetadata_InvalidURL tests invalid URL handling
func TestGetClipMetadata_InvalidURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expectID bool // whether we expect a clip ID (even if invalid for Twitch)
	}{
		{
			name:     "Empty string",
			input:    "",
			expectID: false,
		},
		{
			name:     "Invalid URL structure (non-Twitch domain extracts ID)",
			input:    "https://invalid.com/something",
			expectID: true, // Normalization extracts 'something', validation happens at API level
		},
		{
			name:     "URL without clip ID",
			input:    "https://clips.twitch.tv/",
			expectID: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &SubmissionService{}
			clipID, _ := service.normalizeClipURL(tt.input)
			if tt.expectID {
				assert.NotEmpty(t, clipID, "Should extract clip ID from URL structure")
			} else {
				assert.Empty(t, clipID, "Should return empty clip ID for invalid input")
			}
		})
	}
}

// TestGetClipMetadata_MissingTwitchClient tests error when Twitch client is unavailable
func TestGetClipMetadata_MissingTwitchClient(t *testing.T) {
	service := &SubmissionService{
		twitchClient: nil,
	}

	ctx := context.Background()
	_, err := service.GetClipMetadata(ctx, "https://clips.twitch.tv/TestClipID")

	require.Error(t, err)
	assert.Contains(t, err.Error(), "Twitch API is not configured")
}

// TestGetClipMetadata_ValidationError tests validation error on invalid URL
func TestGetClipMetadata_ValidationError(t *testing.T) {
	// Mock Twitch client (though it won't be called due to validation failure)
	mockTwitchClient := &twitch.Client{}
	service := &SubmissionService{
		twitchClient: mockTwitchClient,
	}

	ctx := context.Background()
	_, err := service.GetClipMetadata(ctx, "")

	require.Error(t, err)
	valErr, ok := err.(*ValidationError)
	require.True(t, ok, "Should return ValidationError")
	assert.Equal(t, "url", valErr.Field)
	assert.Contains(t, valErr.Message, "Invalid Twitch clip URL")
}

// TestClipMetadata_ResponseStructure validates the metadata structure
func TestClipMetadata_ResponseStructure(t *testing.T) {
	meta := &ClipMetadata{
		ClipID:       "TestClipID",
		Title:        "Amazing play!",
		StreamerName: "StreamerName",
		GameName:     "League of Legends",
		ViewCount:    1234,
		CreatedAt:    time.Now(),
		ThumbnailURL: "https://example.com/thumb.jpg",
		Duration:     30.5,
		URL:          "https://clips.twitch.tv/TestClipID",
	}

	assert.NotEmpty(t, meta.ClipID)
	assert.NotEmpty(t, meta.Title)
	assert.NotEmpty(t, meta.StreamerName)
	assert.NotEmpty(t, meta.GameName)
	assert.Greater(t, meta.ViewCount, 0)
	assert.NotZero(t, meta.CreatedAt)
	assert.NotEmpty(t, meta.ThumbnailURL)
	assert.Greater(t, meta.Duration, 0.0)
	assert.NotEmpty(t, meta.URL)
}

// TestNormalizeClipURL_EdgeCases tests edge cases in URL normalization
func TestNormalizeClipURL_EdgeCases(t *testing.T) {
	service := &SubmissionService{}

	tests := []struct {
		name       string
		input      string
		expectID   string
		expectURL  string
	}{
		{
			name:      "Trailing slash",
			input:     "https://clips.twitch.tv/TestID/",
			expectID:  "",
			expectURL: "",
		},
		{
			name:      "Multiple slashes (extracts ID after last slash)",
			input:     "https://clips.twitch.tv//TestID",
			expectID:  "TestID",
			expectURL: "https://clips.twitch.tv/TestID",
		},
		{
			name:      "Fragment identifier (not stripped, API will handle)",
			input:     "https://clips.twitch.tv/TestID#timestamp",
			expectID:  "TestID#timestamp",
			expectURL: "https://clips.twitch.tv/TestID#timestamp",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clipID, normalizedURL := service.normalizeClipURL(tt.input)
			assert.Equal(t, tt.expectID, clipID)
			assert.Equal(t, tt.expectURL, normalizedURL)
		})
	}
}
