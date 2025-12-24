package handlers

import (
	"regexp"
	"strings"
	"time"
)

// AutoModerationConfig holds configuration for automated moderation
type AutoModerationConfig struct {
	SpamDetectionEnabled   bool
	ProfanityFilterEnabled bool
	MaxMessageLength       int
	MaxRepeatedChars       int
	RateLimitMessages      int           // Max messages per window
	RateLimitWindow        time.Duration // Time window for rate limiting
	BannedWords            []string
	SuspiciousPatterns     []string
}

// DefaultAutoModerationConfig returns default moderation config
func DefaultAutoModerationConfig() AutoModerationConfig {
	return AutoModerationConfig{
		SpamDetectionEnabled:   true,
		ProfanityFilterEnabled: true,
		MaxMessageLength:       2000,
		MaxRepeatedChars:       5,
		RateLimitMessages:      10,
		RateLimitWindow:        time.Minute,
		BannedWords: []string{
			// Common profanity and inappropriate words
			"spam", "scam", "phishing",
		},
		SuspiciousPatterns: []string{
			`https?://bit\.ly/`,      // Shortened URLs
			`https?://tinyurl\.com/`, // Shortened URLs
			`\b[A-Z]{5,}\b`,          // Excessive caps (5+ consecutive uppercase letters)
		},
	}
}

// ModerationResult contains the result of automated moderation
type ModerationResult struct {
	IsViolation   bool
	ViolationType string
	Reason        string
	Severity      int // 1-3: 1=low, 2=medium, 3=high
}

// CheckMessage performs automated moderation checks on a message
func CheckMessage(content string, config AutoModerationConfig) ModerationResult {
	// Check message length
	if len(content) > config.MaxMessageLength {
		return ModerationResult{
			IsViolation:   true,
			ViolationType: "excessive_length",
			Reason:        "Message exceeds maximum length",
			Severity:      1,
		}
	}

	// Check for excessive repeated characters
	if config.SpamDetectionEnabled && hasExcessiveRepeatedChars(content, config.MaxRepeatedChars) {
		return ModerationResult{
			IsViolation:   true,
			ViolationType: "spam",
			Reason:        "Excessive repeated characters detected",
			Severity:      2,
		}
	}

	// Check for profanity
	if config.ProfanityFilterEnabled {
		if word := containsBannedWord(content, config.BannedWords); word != "" {
			return ModerationResult{
				IsViolation:   true,
				ViolationType: "profanity",
				Reason:        "Inappropriate language detected",
				Severity:      2,
			}
		}
	}

	// Check for suspicious patterns
	if config.SpamDetectionEnabled {
		if pattern := matchesSuspiciousPattern(content, config.SuspiciousPatterns); pattern != "" {
			return ModerationResult{
				IsViolation:   true,
				ViolationType: "suspicious_content",
				Reason:        "Suspicious pattern detected",
				Severity:      2,
			}
		}
	}

	return ModerationResult{
		IsViolation: false,
	}
}

// hasExcessiveRepeatedChars checks if a string has too many repeated characters
func hasExcessiveRepeatedChars(s string, max int) bool {
	if len(s) == 0 {
		return false
	}

	count := 1
	prev := rune(s[0])

	for _, char := range s[1:] {
		if char == prev {
			count++
			if count > max {
				return true
			}
		} else {
			count = 1
			prev = char
		}
	}

	return false
}

// containsBannedWord checks if the content contains any banned words
func containsBannedWord(content string, bannedWords []string) string {
	lowerContent := strings.ToLower(content)

	for _, word := range bannedWords {
		// Use word boundaries to match whole words only
		pattern := `\b` + strings.ToLower(word) + `\b`
		matched, _ := regexp.MatchString(pattern, lowerContent)
		if matched {
			return word
		}
	}

	return ""
}

// matchesSuspiciousPattern checks if content matches any suspicious patterns
func matchesSuspiciousPattern(content string, patterns []string) string {
	for _, pattern := range patterns {
		matched, _ := regexp.MatchString(pattern, content)
		if matched {
			return pattern
		}
	}

	return ""
}

// ShouldAutoModerate determines if a message should be automatically moderated
// based on the violation severity and user trust score
func ShouldAutoModerate(result ModerationResult, userTrustScore int) bool {
	if !result.IsViolation {
		return false
	}

	// High severity violations always trigger auto-moderation
	if result.Severity >= 3 {
		return true
	}

	// Medium severity violations trigger for low-trust users
	if result.Severity >= 2 && userTrustScore < 50 {
		return true
	}

	// Low severity violations only trigger for very low trust users
	if result.Severity >= 1 && userTrustScore < 20 {
		return true
	}

	return false
}
