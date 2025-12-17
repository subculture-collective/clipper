package handlers

import (
	"strings"
	"testing"
	"time"
)

func TestCheckMessage_ExcessiveLength(t *testing.T) {
	config := DefaultAutoModerationConfig()
	config.MaxMessageLength = 100

	content := strings.Repeat("a", 101)
	result := CheckMessage(content, config)

	if !result.IsViolation {
		t.Error("Expected violation for excessive length")
	}

	if result.ViolationType != "excessive_length" {
		t.Errorf("Expected violation type 'excessive_length', got %s", result.ViolationType)
	}
}

func TestCheckMessage_ExcessiveRepeatedChars(t *testing.T) {
	config := DefaultAutoModerationConfig()
	config.MaxRepeatedChars = 3

	content := "Hellooooo world!!!!"
	result := CheckMessage(content, config)

	if !result.IsViolation {
		t.Error("Expected violation for excessive repeated characters")
	}

	if result.ViolationType != "spam" {
		t.Errorf("Expected violation type 'spam', got %s", result.ViolationType)
	}
}

func TestCheckMessage_Profanity(t *testing.T) {
	config := DefaultAutoModerationConfig()
	config.BannedWords = []string{"badword", "inappropriate"}

	content := "This message contains badword"
	result := CheckMessage(content, config)

	if !result.IsViolation {
		t.Error("Expected violation for profanity")
	}

	if result.ViolationType != "profanity" {
		t.Errorf("Expected violation type 'profanity', got %s", result.ViolationType)
	}
}

func TestCheckMessage_SuspiciousPattern(t *testing.T) {
	config := DefaultAutoModerationConfig()
	config.SuspiciousPatterns = []string{`https?://bit\.ly/`}
	config.BannedWords = []string{} // Clear banned words to test pattern matching

	content := "Check out this link http://bit.ly/promo"
	result := CheckMessage(content, config)

	if !result.IsViolation {
		t.Error("Expected violation for suspicious pattern")
	}

	if result.ViolationType != "suspicious_content" {
		t.Errorf("Expected violation type 'suspicious_content', got %s", result.ViolationType)
	}
}

func TestCheckMessage_CleanContent(t *testing.T) {
	config := DefaultAutoModerationConfig()

	content := "This is a normal, clean message"
	result := CheckMessage(content, config)

	if result.IsViolation {
		t.Error("Expected no violation for clean content")
	}
}

func TestHasExcessiveRepeatedChars(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		max      int
		expected bool
	}{
		{"No repeats", "hello", 3, false},
		{"Few repeats", "hello", 2, false},
		{"Exact limit", "helloo", 2, false},
		{"Over limit", "hellooo", 2, true},
		{"Multiple groups", "hellooo world", 2, true},
		{"Empty string", "", 3, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := hasExcessiveRepeatedChars(tt.input, tt.max)
			if result != tt.expected {
				t.Errorf("hasExcessiveRepeatedChars(%q, %d) = %v, want %v",
					tt.input, tt.max, result, tt.expected)
			}
		})
	}
}

func TestContainsBannedWord(t *testing.T) {
	bannedWords := []string{"spam", "scam", "badword"}

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{"Contains banned word", "This is spam", "spam"},
		{"Contains banned word case insensitive", "This is SPAM", "spam"},
		{"Contains multiple banned words", "This is spam and a scam", "spam"},
		{"Does not contain banned word", "This is a good message", ""},
		{"Partial match should not trigger", "spammer", ""},
		{"Word boundary check", "spam is bad", "spam"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := containsBannedWord(tt.input, bannedWords)
			if result != tt.expected {
				t.Errorf("containsBannedWord(%q) = %q, want %q",
					tt.input, result, tt.expected)
			}
		})
	}
}

func TestShouldAutoModerate(t *testing.T) {
	tests := []struct {
		name           string
		severity       int
		trustScore     int
		isViolation    bool
		expectedResult bool
	}{
		{"No violation", 0, 100, false, false},
		{"High severity always triggers", 3, 100, true, true},
		{"Medium severity with low trust", 2, 40, true, true},
		{"Medium severity with high trust", 2, 80, true, false},
		{"Low severity with very low trust", 1, 10, true, true},
		{"Low severity with medium trust", 1, 50, true, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := ModerationResult{
				IsViolation: tt.isViolation,
				Severity:    tt.severity,
			}
			shouldMod := ShouldAutoModerate(result, tt.trustScore)
			if shouldMod != tt.expectedResult {
				t.Errorf("ShouldAutoModerate(severity=%d, trust=%d) = %v, want %v",
					tt.severity, tt.trustScore, shouldMod, tt.expectedResult)
			}
		})
	}
}

func TestDefaultAutoModerationConfig(t *testing.T) {
	config := DefaultAutoModerationConfig()

	if !config.SpamDetectionEnabled {
		t.Error("Expected spam detection to be enabled by default")
	}

	if !config.ProfanityFilterEnabled {
		t.Error("Expected profanity filter to be enabled by default")
	}

	if config.MaxMessageLength <= 0 {
		t.Error("Expected positive max message length")
	}

	if config.RateLimitWindow != time.Minute {
		t.Errorf("Expected rate limit window to be 1 minute, got %v", config.RateLimitWindow)
	}

	if len(config.BannedWords) == 0 {
		t.Error("Expected some default banned words")
	}

	if len(config.SuspiciousPatterns) == 0 {
		t.Error("Expected some default suspicious patterns")
	}
}
