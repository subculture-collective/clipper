package services

import (
	"testing"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/utils"
)

func TestSubmissionService_ShouldAutoApprove(t *testing.T) {
	// Create a service with nil repos just to test this method
	service := &SubmissionService{}

	t.Run("Admin should be auto-approved", func(t *testing.T) {
		user := &models.User{
			ID:          uuid.New(),
			Role:        "admin",
			KarmaPoints: 0,
		}
		if !service.shouldAutoApprove(user) {
			t.Error("Admin should be auto-approved")
		}
	})

	t.Run("Moderator should be auto-approved", func(t *testing.T) {
		user := &models.User{
			ID:          uuid.New(),
			Role:        "moderator",
			KarmaPoints: 0,
		}
		if !service.shouldAutoApprove(user) {
			t.Error("Moderator should be auto-approved")
		}
	})

	t.Run("High karma user should be auto-approved", func(t *testing.T) {
		user := &models.User{
			ID:          uuid.New(),
			Role:        "user",
			KarmaPoints: 1000,
		}
		if !service.shouldAutoApprove(user) {
			t.Error("High karma user should be auto-approved")
		}
	})

	t.Run("Regular user should not be auto-approved", func(t *testing.T) {
		user := &models.User{
			ID:          uuid.New(),
			Role:        "user",
			KarmaPoints: 500,
		}
		if service.shouldAutoApprove(user) {
			t.Error("Regular user should not be auto-approved")
		}
	})
}

func TestExtractClipIDFromURL(t *testing.T) {
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
			result := extractClipIDFromURL(tt.input)
			if result != tt.expected {
				t.Errorf("extractClipIDFromURL(%s) = %s, want %s", tt.input, result, tt.expected)
			}
		})
	}
}

func TestBroadcasterNameHandling(t *testing.T) {
	tests := []struct {
		name                    string
		broadcasterNameOverride *string
		broadcasterName         *string
		expected                string
	}{
		{
			name:                    "Override provided",
			broadcasterNameOverride: strPtr("CustomBroadcaster"),
			broadcasterName:         strPtr("OriginalBroadcaster"),
			expected:                "CustomBroadcaster",
		},
		{
			name:                    "No override, use original",
			broadcasterNameOverride: nil,
			broadcasterName:         strPtr("OriginalBroadcaster"),
			expected:                "OriginalBroadcaster",
		},
		{
			name:                    "Empty override, use original",
			broadcasterNameOverride: strPtr(""),
			broadcasterName:         strPtr("OriginalBroadcaster"),
			expected:                "OriginalBroadcaster",
		},
		{
			name:                    "Both nil, use empty string",
			broadcasterNameOverride: nil,
			broadcasterName:         nil,
			expected:                "",
		},
		{
			name:                    "Override provided, original nil",
			broadcasterNameOverride: strPtr("CustomBroadcaster"),
			broadcasterName:         nil,
			expected:                "CustomBroadcaster",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate the logic from createClipFromSubmission
			emptyStr := ""
			submission := &models.ClipSubmission{
				BroadcasterNameOverride: tt.broadcasterNameOverride,
				BroadcasterName:         tt.broadcasterName,
			}

			// This is the pattern used in createClipFromSubmission
			broadcasterNameFallback := utils.StringOrDefault(submission.BroadcasterName, &emptyStr)
			result := utils.StringOrDefault(submission.BroadcasterNameOverride, &broadcasterNameFallback)

			if result != tt.expected {
				t.Errorf("got %q, want %q", result, tt.expected)
			}
		})
	}
}

// Helper function to create string pointers
func strPtr(s string) *string {
	return &s
}

func TestSubmissionService_BroadcasterNameOverridePrecedence(t *testing.T) {
	t.Run("Override should take precedence over Twitch metadata", func(t *testing.T) {
		twitchBroadcaster := "TwitchBroadcaster"
		overrideBroadcaster := "OverrideBroadcaster"

		submission := &models.ClipSubmission{
			TwitchClipID:            "TestClipID",
			TwitchClipURL:           "https://clips.twitch.tv/TestClipID",
			BroadcasterName:         &twitchBroadcaster,
			BroadcasterNameOverride: &overrideBroadcaster,
		}

		// Test that the override takes precedence
		// Since we can't easily test createClipFromSubmission without a full DB setup,
		// we'll test the logic directly
		result := ""
		if submission.BroadcasterNameOverride != nil && *submission.BroadcasterNameOverride != "" {
			result = *submission.BroadcasterNameOverride
		} else if submission.BroadcasterName != nil {
			result = *submission.BroadcasterName
		}

		if result != overrideBroadcaster {
			t.Errorf("Expected broadcaster name to be %s (override), got %s", overrideBroadcaster, result)
		}
	})

	t.Run("Twitch metadata used when no override provided", func(t *testing.T) {
		twitchBroadcaster := "TwitchBroadcaster"

		submission := &models.ClipSubmission{
			TwitchClipID:            "TestClipID",
			TwitchClipURL:           "https://clips.twitch.tv/TestClipID",
			BroadcasterName:         &twitchBroadcaster,
			BroadcasterNameOverride: nil,
		}

		result := ""
		if submission.BroadcasterNameOverride != nil && *submission.BroadcasterNameOverride != "" {
			result = *submission.BroadcasterNameOverride
		} else if submission.BroadcasterName != nil {
			result = *submission.BroadcasterName
		}

		if result != twitchBroadcaster {
			t.Errorf("Expected broadcaster name to be %s (from Twitch), got %s", twitchBroadcaster, result)
		}
	})

	t.Run("Empty override should not override Twitch metadata", func(t *testing.T) {
		twitchBroadcaster := "TwitchBroadcaster"
		emptyOverride := ""

		submission := &models.ClipSubmission{
			TwitchClipID:            "TestClipID",
			TwitchClipURL:           "https://clips.twitch.tv/TestClipID",
			BroadcasterName:         &twitchBroadcaster,
			BroadcasterNameOverride: &emptyOverride,
		}

		result := ""
		if submission.BroadcasterNameOverride != nil && *submission.BroadcasterNameOverride != "" {
			result = *submission.BroadcasterNameOverride
		} else if submission.BroadcasterName != nil {
			result = *submission.BroadcasterName
		}

		if result != twitchBroadcaster {
			t.Errorf("Expected broadcaster name to be %s (from Twitch when override is empty), got %s", twitchBroadcaster, result)
		}
	})
}
