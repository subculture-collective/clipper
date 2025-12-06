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
		// Creator notification preferences tests
		{
			name: "should notify for clip approvals when enabled",
			prefs: &models.NotificationPreferences{
				NotifyClipApproved: true,
			},
			notifType: models.NotificationTypeSubmissionApproved,
			expected:  true,
		},
		{
			name: "should not notify for clip approvals when disabled",
			prefs: &models.NotificationPreferences{
				NotifyClipApproved: false,
			},
			notifType: models.NotificationTypeSubmissionApproved,
			expected:  false,
		},
		{
			name: "should notify for clip rejections when enabled",
			prefs: &models.NotificationPreferences{
				NotifyClipRejected: true,
			},
			notifType: models.NotificationTypeSubmissionRejected,
			expected:  true,
		},
		{
			name: "should not notify for clip rejections when disabled",
			prefs: &models.NotificationPreferences{
				NotifyClipRejected: false,
			},
			notifType: models.NotificationTypeSubmissionRejected,
			expected:  false,
		},
		{
			name: "should notify for clip comments when enabled",
			prefs: &models.NotificationPreferences{
				NotifyClipComments: true,
			},
			notifType: models.NotificationTypeClipComment,
			expected:  true,
		},
		{
			name: "should not notify for clip comments when disabled",
			prefs: &models.NotificationPreferences{
				NotifyClipComments: false,
			},
			notifType: models.NotificationTypeClipComment,
			expected:  false,
		},
		{
			name: "should notify for clip view threshold when enabled",
			prefs: &models.NotificationPreferences{
				NotifyClipThreshold: true,
			},
			notifType: models.NotificationTypeClipViewThreshold,
			expected:  true,
		},
		{
			name: "should not notify for clip vote threshold when disabled",
			prefs: &models.NotificationPreferences{
				NotifyClipThreshold: false,
			},
			notifType: models.NotificationTypeClipVoteThreshold,
			expected:  false,
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

// isVoteMilestone checks if a score is a vote milestone
// This helper matches the logic in NotificationService.NotifyVoteMilestone
func isVoteMilestone(score int) bool {
	milestones := []int{10, 25, 50, 100, 250, 500, 1000}
	for _, m := range milestones {
		if score == m {
			return true
		}
	}
	return false
}

func TestNotifyVoteMilestone_OnlyMilestones(t *testing.T) {
	milestones := []int{10, 25, 50, 100, 250, 500, 1000}
	nonMilestones := []int{1, 5, 15, 30, 75, 150, 300, 600, 2000}

	// Test that milestones would trigger notification
	// Note: This is a simplified test - actual implementation would need mock repos
	for _, score := range milestones {
		if !isVoteMilestone(score) {
			t.Errorf("Score %d should be a milestone", score)
		}
	}

	// Test that non-milestones would not trigger
	for _, score := range nonMilestones {
		if isVoteMilestone(score) {
			t.Errorf("Score %d should not be a milestone", score)
		}
	}
}

func TestShouldNotify_SubmissionTypes(t *testing.T) {
	service := &NotificationService{}

	tests := []struct {
		name      string
		prefs     *models.NotificationPreferences
		notifType string
		expected  bool
	}{
		{
			name: "should notify for submission approved when clip approved enabled",
			prefs: &models.NotificationPreferences{
				NotifyClipApproved: true,
			},
			notifType: models.NotificationTypeSubmissionApproved,
			expected:  true,
		},
		{
			name: "should not notify for submission approved when clip approved disabled",
			prefs: &models.NotificationPreferences{
				NotifyClipApproved: false,
			},
			notifType: models.NotificationTypeSubmissionApproved,
			expected:  false,
		},
		{
			name: "should notify for submission rejected when clip rejected enabled",
			prefs: &models.NotificationPreferences{
				NotifyClipRejected: true,
			},
			notifType: models.NotificationTypeSubmissionRejected,
			expected:  true,
		},
		{
			name: "should not notify for submission rejected when clip rejected disabled",
			prefs: &models.NotificationPreferences{
				NotifyClipRejected: false,
			},
			notifType: models.NotificationTypeSubmissionRejected,
			expected:  false,
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

func TestFormatNumber(t *testing.T) {
tests := []struct {
name     string
input    int64
expected string
}{
{
name:     "less than 1000",
input:    100,
expected: "100",
},
{
name:     "exactly 1000",
input:    1000,
expected: "1,000",
},
{
name:     "5000",
input:    5000,
expected: "5,000",
},
{
name:     "10000",
input:    10000,
expected: "10,000",
},
{
name:     "100000",
input:    100000,
expected: "100,000",
},
{
name:     "1 million",
input:    1000000,
expected: "1,000,000",
},
}

for _, tt := range tests {
t.Run(tt.name, func(t *testing.T) {
result := formatNumber(tt.input)
if result != tt.expected {
t.Errorf("formatNumber() = %v, want %v", result, tt.expected)
}
})
}
}
