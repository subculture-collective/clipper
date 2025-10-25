package services

import (
	"testing"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
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
			broadcasterNameFallback := stringOrDefault(submission.BroadcasterName, &emptyStr)
			result := stringOrDefault(submission.BroadcasterNameOverride, &broadcasterNameFallback)

			if result != tt.expected {
				t.Errorf("got %q, want %q", result, tt.expected)
			}
		})
	}
}

// Helper function for tests (mimics utils.StringOrDefault)
func stringOrDefault(s *string, def *string) string {
	if s != nil && *s != "" {
		return *s
	}
	if def != nil {
		return *def
	}
	return ""
}

// Helper function to create string pointers
func strPtr(s string) *string {
	return &s
}
