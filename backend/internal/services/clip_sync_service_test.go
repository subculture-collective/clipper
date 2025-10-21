package services

import (
	"testing"
	"time"

	"github.com/subculture-collective/clipper/pkg/twitch"
)

func TestExtractClipID(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "Direct ID",
			input:    "AwkwardHelplessSalamanderSwiftRage",
			expected: "AwkwardHelplessSalamanderSwiftRage",
		},
		{
			name:     "Full URL",
			input:    "https://www.twitch.tv/username/clip/AwkwardHelplessSalamanderSwiftRage",
			expected: "AwkwardHelplessSalamanderSwiftRage",
		},
		{
			name:     "Clips subdomain URL",
			input:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage",
			expected: "AwkwardHelplessSalamanderSwiftRage",
		},
		{
			name:     "URL with query params",
			input:    "https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage?filter=clips",
			expected: "AwkwardHelplessSalamanderSwiftRage",
		},
		{
			name:     "Empty string",
			input:    "",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ExtractClipID(tt.input)
			if result != tt.expected {
				t.Errorf("ExtractClipID(%s) = %s, want %s", tt.input, result, tt.expected)
			}
		})
	}
}

func TestTransformTwitchClip(t *testing.T) {
	now := time.Now()
	twitchClip := &twitch.Clip{
		ID:              "test-clip-id",
		URL:             "https://clips.twitch.tv/test-clip-id",
		EmbedURL:        "https://clips.twitch.tv/embed?clip=test-clip-id",
		BroadcasterID:   "broadcaster-123",
		BroadcasterName: "TestStreamer",
		CreatorID:       "creator-456",
		CreatorName:     "TestClipCreator",
		GameID:          "game-789",
		Language:        "en",
		Title:           "Amazing Play",
		ViewCount:       1000,
		CreatedAt:       now,
		ThumbnailURL:    "https://example.com/thumb.jpg",
		Duration:        30.5,
	}

	clip := transformTwitchClip(twitchClip)

	if clip.TwitchClipID != twitchClip.ID {
		t.Errorf("Expected TwitchClipID %s, got %s", twitchClip.ID, clip.TwitchClipID)
	}
	if clip.TwitchClipURL != twitchClip.URL {
		t.Errorf("Expected TwitchClipURL %s, got %s", twitchClip.URL, clip.TwitchClipURL)
	}
	if clip.Title != twitchClip.Title {
		t.Errorf("Expected Title %s, got %s", twitchClip.Title, clip.Title)
	}
	if clip.ViewCount != twitchClip.ViewCount {
		t.Errorf("Expected ViewCount %d, got %d", twitchClip.ViewCount, clip.ViewCount)
	}
	if clip.CreatedAt != twitchClip.CreatedAt {
		t.Errorf("Expected CreatedAt %v, got %v", twitchClip.CreatedAt, clip.CreatedAt)
	}
	if clip.BroadcasterName != twitchClip.BroadcasterName {
		t.Errorf("Expected BroadcasterName %s, got %s", twitchClip.BroadcasterName, clip.BroadcasterName)
	}
	if clip.CreatorName != twitchClip.CreatorName {
		t.Errorf("Expected CreatorName %s, got %s", twitchClip.CreatorName, clip.CreatorName)
	}

	// Check pointer fields
	if clip.BroadcasterID == nil || *clip.BroadcasterID != twitchClip.BroadcasterID {
		t.Errorf("Expected BroadcasterID %s, got %v", twitchClip.BroadcasterID, clip.BroadcasterID)
	}
	if clip.CreatorID == nil || *clip.CreatorID != twitchClip.CreatorID {
		t.Errorf("Expected CreatorID %s, got %v", twitchClip.CreatorID, clip.CreatorID)
	}
	if clip.GameID == nil || *clip.GameID != twitchClip.GameID {
		t.Errorf("Expected GameID %s, got %v", twitchClip.GameID, clip.GameID)
	}
	if clip.Language == nil || *clip.Language != twitchClip.Language {
		t.Errorf("Expected Language %s, got %v", twitchClip.Language, clip.Language)
	}
	if clip.Duration == nil || *clip.Duration != twitchClip.Duration {
		t.Errorf("Expected Duration %f, got %v", twitchClip.Duration, clip.Duration)
	}

	// Check default values
	if clip.VoteScore != 0 {
		t.Errorf("Expected VoteScore 0, got %d", clip.VoteScore)
	}
	if clip.CommentCount != 0 {
		t.Errorf("Expected CommentCount 0, got %d", clip.CommentCount)
	}
	if clip.IsFeatured != false {
		t.Errorf("Expected IsFeatured false, got %t", clip.IsFeatured)
	}
	if clip.IsNSFW != false {
		t.Errorf("Expected IsNSFW false, got %t", clip.IsNSFW)
	}
	if clip.IsRemoved != false {
		t.Errorf("Expected IsRemoved false, got %t", clip.IsRemoved)
	}
}

func TestStringPtr(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected *string
	}{
		{
			name:     "Non-empty string",
			input:    "test",
			expected: stringPtr("test"),
		},
		{
			name:     "Empty string",
			input:    "",
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := stringPtr(tt.input)
			if tt.expected == nil {
				if result != nil {
					t.Errorf("Expected nil, got %v", result)
				}
			} else {
				if result == nil || *result != *tt.expected {
					t.Errorf("Expected %v, got %v", tt.expected, result)
				}
			}
		})
	}
}

func TestFloat64Ptr(t *testing.T) {
	tests := []struct {
		name     string
		input    float64
		expected *float64
	}{
		{
			name:     "Non-zero value",
			input:    30.5,
			expected: float64Ptr(30.5),
		},
		{
			name:     "Zero value",
			input:    0,
			expected: nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := float64Ptr(tt.input)
			if tt.expected == nil {
				if result != nil {
					t.Errorf("Expected nil, got %v", result)
				}
			} else {
				if result == nil || *result != *tt.expected {
					t.Errorf("Expected %v, got %v", tt.expected, result)
				}
			}
		})
	}
}

func TestMin(t *testing.T) {
	tests := []struct {
		name     string
		a        int
		b        int
		expected int
	}{
		{
			name:     "a is smaller",
			a:        5,
			b:        10,
			expected: 5,
		},
		{
			name:     "b is smaller",
			a:        10,
			b:        5,
			expected: 5,
		},
		{
			name:     "equal values",
			a:        5,
			b:        5,
			expected: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := min(tt.a, tt.b)
			if result != tt.expected {
				t.Errorf("min(%d, %d) = %d, want %d", tt.a, tt.b, result, tt.expected)
			}
		})
	}
}
