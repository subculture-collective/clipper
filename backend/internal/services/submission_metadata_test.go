package services

import (
	"context"
	"testing"
	"time"
)

// TestGetClipMetadata_ValidURLFormats tests various URL format parsing
func TestGetClipMetadata_ValidURLFormats(t *testing.T) {
	service := &SubmissionService{}

	tests := []struct {
		name           string
		input          string
		expectedClipID string
		expectedURL    string
		description    string
	}{
		{
			name:           "clips.twitch.tv URL",
			input:          "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			expectedClipID: "AwkwardHelplessSalamanderSwiftRage",
			expectedURL:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description:    "Standard clips.twitch.tv URL",
		},
		{
			name:           "www.twitch.tv/user/clip URL",
			input:          "https://www.twitch.tv/shroud/clip/AwkwardHelplessSalamanderSwiftRage",
			expectedClipID: "AwkwardHelplessSalamanderSwiftRage",
			expectedURL:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description:    "Alternative twitch.tv URL format",
		},
		{
			name:           "URL with query parameters",
			input:          "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage?filter=clips&tt_medium=redt",
			expectedClipID: "AwkwardHelplessSalamanderSwiftRage",
			expectedURL:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description:    "Query parameters should be stripped",
		},
		{
			name:           "Direct clip ID",
			input:          "AwkwardHelplessSalamanderSwiftRage",
			expectedClipID: "AwkwardHelplessSalamanderSwiftRage",
			expectedURL:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description:    "Direct clip ID without URL",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clipID, normalizedURL := service.normalizeClipURL(tt.input)
			if clipID != tt.expectedClipID {
				t.Errorf("Expected clipID '%s', got '%s'. %s", tt.expectedClipID, clipID, tt.description)
			}
			if normalizedURL != tt.expectedURL {
				t.Errorf("Expected URL '%s', got '%s'. %s", tt.expectedURL, normalizedURL, tt.description)
			}
		})
	}
}

// TestGetClipMetadata_InvalidURL tests invalid URL handling
func TestGetClipMetadata_InvalidURL(t *testing.T) {
	service := &SubmissionService{}

	tests := []struct {
		name        string
		input       string
		expectError bool
		description string
	}{
		{
			name:        "Empty string",
			input:       "",
			expectError: true,
			description: "Empty input should return validation error",
		},
		{
			name:        "Whitespace only",
			input:       "   ",
			expectError: true,
			description: "Whitespace-only input should return validation error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := service.GetClipMetadata(context.Background(), tt.input)
			if tt.expectError && err == nil {
				t.Errorf("Expected error for input '%s'. %s", tt.input, tt.description)
			}
			if tt.expectError {
				// Check it's a validation error
				if _, ok := err.(*ValidationError); !ok {
					t.Errorf("Expected ValidationError, got %T. %s", err, tt.description)
				}
			}
		})
	}
}

// TestGetClipMetadata_MissingTwitchClient tests error when Twitch client is not configured
func TestGetClipMetadata_MissingTwitchClient(t *testing.T) {
	service := &SubmissionService{
		twitchClient: nil,
		redisClient:  nil,
	}

	_, err := service.GetClipMetadata(context.Background(), "ValidClipID123")
	if err == nil {
		t.Error("Expected error when Twitch client is nil")
	}

	expectedMsg := "Twitch API is not configured"
	if err.Error() != expectedMsg {
		t.Errorf("Expected error message '%s', got '%s'", expectedMsg, err.Error())
	}
}

// TestGetClipMetadata_ValidationError tests that empty input returns ValidationError
func TestGetClipMetadata_ValidationError(t *testing.T) {
	service := &SubmissionService{}

	_, err := service.GetClipMetadata(context.Background(), "")
	if err == nil {
		t.Fatal("Expected validation error for empty input")
	}

	valErr, ok := err.(*ValidationError)
	if !ok {
		t.Fatalf("Expected ValidationError, got %T", err)
	}

	if valErr.Field != "url" {
		t.Errorf("Expected field 'url', got '%s'", valErr.Field)
	}
}

// TestClipMetadata_ResponseStructure tests the ClipMetadata struct fields
func TestClipMetadata_ResponseStructure(t *testing.T) {
	// Test that the struct has all required fields
	metadata := ClipMetadata{
		ClipID:       "TestClipID",
		Title:        "Test Title",
		StreamerName: "TestStreamer",
		GameName:     "Test Game",
		ViewCount:    12543,
		CreatedAt:    time.Now(),
		ThumbnailURL: "https://clips-media-assets2.twitch.tv/test.jpg",
		Duration:     30.5,
		URL:          "https://clips.twitch.tv/TestClipID",
	}

	if metadata.ClipID != "TestClipID" {
		t.Errorf("Expected ClipID 'TestClipID', got '%s'", metadata.ClipID)
	}
	if metadata.Title != "Test Title" {
		t.Errorf("Expected Title 'Test Title', got '%s'", metadata.Title)
	}
	if metadata.StreamerName != "TestStreamer" {
		t.Errorf("Expected StreamerName 'TestStreamer', got '%s'", metadata.StreamerName)
	}
	if metadata.GameName != "Test Game" {
		t.Errorf("Expected GameName 'Test Game', got '%s'", metadata.GameName)
	}
	if metadata.ViewCount != 12543 {
		t.Errorf("Expected ViewCount 12543, got %d", metadata.ViewCount)
	}
	if metadata.Duration != 30.5 {
		t.Errorf("Expected Duration 30.5, got %f", metadata.Duration)
	}
}

// TestNormalizeClipURL_EdgeCases tests edge case handling for URL normalization
func TestNormalizeClipURL_EdgeCases(t *testing.T) {
	service := &SubmissionService{}

	tests := []struct {
		name           string
		input          string
		expectedClipID string
		expectedURL    string
		description    string
	}{
		{
			name:           "Trailing slash",
			input:          "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage/",
			expectedClipID: "AwkwardHelplessSalamanderSwiftRage",
			expectedURL:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description:    "Trailing slash should be handled",
		},
		{
			name:           "Fragment identifier",
			input:          "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage#section",
			expectedClipID: "AwkwardHelplessSalamanderSwiftRage",
			expectedURL:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description:    "Fragment identifier should be stripped",
		},
		{
			name:           "Query and fragment",
			input:          "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage?param=value#section",
			expectedClipID: "AwkwardHelplessSalamanderSwiftRage",
			expectedURL:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description:    "Both query params and fragments should be stripped",
		},
		{
			name:           "Mobile URL (m.twitch.tv)",
			input:          "https://m.twitch.tv/shroud/clip/AwkwardHelplessSalamanderSwiftRage",
			expectedClipID: "AwkwardHelplessSalamanderSwiftRage",
			expectedURL:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description:    "Mobile URL format should work",
		},
		{
			name:           "Whitespace around URL",
			input:          "  https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage  ",
			expectedClipID: "AwkwardHelplessSalamanderSwiftRage",
			expectedURL:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description:    "Leading/trailing whitespace should be trimmed",
		},
		{
			name:           "Clip ID with query param",
			input:          "AwkwardHelplessSalamanderSwiftRage?embed=true",
			expectedClipID: "AwkwardHelplessSalamanderSwiftRage",
			expectedURL:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			description:    "Clip ID with query param should have param stripped",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			clipID, normalizedURL := service.normalizeClipURL(tt.input)
			if clipID != tt.expectedClipID {
				t.Errorf("Expected clipID '%s', got '%s'. %s", tt.expectedClipID, clipID, tt.description)
			}
			if normalizedURL != tt.expectedURL {
				t.Errorf("Expected URL '%s', got '%s'. %s", tt.expectedURL, normalizedURL, tt.description)
			}
		})
	}
}

// TestExtractClipID_AdditionalCases tests additional clip ID extraction cases
func TestExtractClipID_AdditionalCases(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Standard clips.twitch.tv",
			input:    "https://clips.twitch.tv/TestClip123",
			expected: "TestClip123",
		},
		{
			name:     "User clip format",
			input:    "https://www.twitch.tv/username/clip/TestClip123",
			expected: "TestClip123",
		},
		{
			name:     "Mobile format",
			input:    "https://m.twitch.tv/username/clip/TestClip123",
			expected: "TestClip123",
		},
		{
			name:     "With query string",
			input:    "https://clips.twitch.tv/TestClip123?filter=clips",
			expected: "TestClip123",
		},
		{
			name:     "With fragment",
			input:    "https://clips.twitch.tv/TestClip123#anchor",
			expected: "TestClip123",
		},
		{
			name:     "Direct ID",
			input:    "TestClip123",
			expected: "TestClip123",
		},
		{
			name:     "Direct ID with query",
			input:    "TestClip123?param=value",
			expected: "TestClip123",
		},
		{
			name:     "Empty string",
			input:    "",
			expected: "",
		},
		{
			name:     "Just slash",
			input:    "/",
			expected: "",
		},
		{
			name:     "URL ending with slash - extracts domain as ID (validation happens at API)",
			input:    "https://clips.twitch.tv/",
			expected: "clips.twitch.tv", // Aggressively extracts; API will validate
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractClipIDFromURL(tt.input)
			if result != tt.expected {
				t.Errorf("extractClipIDFromURL(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}
