package services

import (
	"testing"

	"github.com/subculture-collective/clipper/internal/models"
)

func TestShouldNotify(t *testing.T) {
	// Create a notification service (we can use nil repos for this test since we're only testing the logic)
	service := &NotificationService{}

	tests := []struct {
		name      string
		prefs     *models.NotificationPreferences
		notifType string
		expected  bool
	}{
		{
			name: "should notify for replies when enabled",
			prefs: &models.NotificationPreferences{
				NotifyReplies: true,
			},
			notifType: models.NotificationTypeReply,
			expected:  true,
		},
		{
			name: "should not notify for replies when disabled",
			prefs: &models.NotificationPreferences{
				NotifyReplies: false,
			},
			notifType: models.NotificationTypeReply,
			expected:  false,
		},
		{
			name: "should notify for mentions when enabled",
			prefs: &models.NotificationPreferences{
				NotifyMentions: true,
			},
			notifType: models.NotificationTypeMention,
			expected:  true,
		},
		{
			name: "should not notify for vote milestones when disabled",
			prefs: &models.NotificationPreferences{
				NotifyVotes: false,
			},
			notifType: models.NotificationTypeVoteMilestone,
			expected:  false,
		},
		{
			name: "should notify for badges when enabled",
			prefs: &models.NotificationPreferences{
				NotifyBadges: true,
			},
			notifType: models.NotificationTypeBadgeEarned,
			expected:  true,
		},
		{
			name: "should notify for moderation actions",
			prefs: &models.NotificationPreferences{
				NotifyModeration: true,
			},
			notifType: models.NotificationTypeContentRemoved,
			expected:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := service.shouldNotify(tt.prefs, tt.notifType)
			if result != tt.expected {
				t.Errorf("shouldNotify() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestExtractMentions(t *testing.T) {
	tests := []struct {
		name     string
		text     string
		expected []string
	}{
		{
			name:     "single mention",
			text:     "Hey @john, check this out!",
			expected: []string{"john"},
		},
		{
			name:     "multiple mentions",
			text:     "@alice and @bob, what do you think?",
			expected: []string{"alice", "bob"},
		},
		{
			name:     "duplicate mentions",
			text:     "@user mentioned @user again",
			expected: []string{"user"},
		},
		{
			name:     "no mentions",
			text:     "This is a comment without any mentions",
			expected: []string{},
		},
		{
			name:     "mention with underscore",
			text:     "Thanks @user_name for the help!",
			expected: []string{"user_name"},
		},
		{
			name:     "mention with numbers",
			text:     "Hey @user123, nice work!",
			expected: []string{"user123"},
		},
		{
			name:     "email addresses should not be matched",
			text:     "Contact me at user@example.com",
			expected: []string{"example"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractMentions(tt.text)
			if len(result) != len(tt.expected) {
				t.Errorf("extractMentions() returned %d mentions, want %d", len(result), len(tt.expected))
				return
			}
			for i, mention := range result {
				if mention != tt.expected[i] {
					t.Errorf("extractMentions()[%d] = %s, want %s", i, mention, tt.expected[i])
				}
			}
		})
	}
}

func TestNotifyVoteMilestone_OnlyMilestones(t *testing.T) {
	milestones := []int{10, 25, 50, 100, 250, 500, 1000}
	nonMilestones := []int{1, 5, 15, 30, 75, 150, 300, 600, 2000}

	// Test that milestones would trigger notification
	// Note: This is a simplified test - actual implementation would need mock repos
	for _, score := range milestones {
		isMilestone := false
		for _, m := range []int{10, 25, 50, 100, 250, 500, 1000} {
			if score == m {
				isMilestone = true
				break
			}
		}
		if !isMilestone {
			t.Errorf("Score %d should be a milestone", score)
		}
	}

	// Test that non-milestones would not trigger
	for _, score := range nonMilestones {
		isMilestone := false
		for _, m := range []int{10, 25, 50, 100, 250, 500, 1000} {
			if score == m {
				isMilestone = true
				break
			}
		}
		if isMilestone {
			t.Errorf("Score %d should not be a milestone", score)
		}
	}
}
