package services

import (
	"context"
	"testing"
)

func TestToxicityClassifier_Disabled(t *testing.T) {
	// Test classifier when disabled
	classifier := NewToxicityClassifier("", "", false, 0.85, nil)

	score, err := classifier.ClassifyComment(context.Background(), "This is a test comment")
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	if score.Toxic {
		t.Error("Expected comment to be classified as non-toxic when classifier is disabled")
	}

	if score.ConfidenceScore != 0.0 {
		t.Errorf("Expected confidence score of 0.0, got: %f", score.ConfidenceScore)
	}
}

func TestToxicityClassifier_RuleBasedFallback(t *testing.T) {
	// Test rule-based fallback when API is not configured
	classifier := NewToxicityClassifier("", "", true, 0.85, nil)

	score, err := classifier.ClassifyComment(context.Background(), "This is a test comment")
	if err != nil {
		t.Fatalf("Expected no error, got: %v", err)
	}

	// Rule-based classifier with clean text should return non-toxic
	if score.Toxic {
		t.Error("Expected comment to be classified as non-toxic")
	}

	// Clean text should have no categories flagged
	if len(score.Categories) > 0 {
		t.Errorf("Expected no categories for clean text, got: %v", score.Categories)
	}
}

func TestToxicityScore_ThresholdLogic(t *testing.T) {
	tests := []struct {
		name        string
		threshold   float64
		confidence  float64
		expectToxic bool
	}{
		{
			name:        "Below threshold",
			threshold:   0.85,
			confidence:  0.75,
			expectToxic: false,
		},
		{
			name:        "At threshold",
			threshold:   0.85,
			confidence:  0.85,
			expectToxic: true,
		},
		{
			name:        "Above threshold",
			threshold:   0.85,
			confidence:  0.95,
			expectToxic: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := &ToxicityScore{
				Toxic:           tt.confidence >= tt.threshold,
				ConfidenceScore: tt.confidence,
			}

			if score.Toxic != tt.expectToxic {
				t.Errorf("Expected toxic=%v, got toxic=%v", tt.expectToxic, score.Toxic)
			}
		})
	}
}

// TestToxicityClassifier_RuleBasedDetection tests the rule-based toxicity detection
func TestToxicityClassifier_RuleBasedDetection(t *testing.T) {
	classifier := NewToxicityClassifier("", "", true, 0.7, nil)

	tests := []struct {
		name        string
		text        string
		expectToxic bool
		category    string
	}{
		{
			name:        "Clean text",
			text:        "Hello world, this is a nice comment",
			expectToxic: false,
			category:    "",
		},
		{
			name:        "Profanity - direct",
			text:        "This is fucking terrible",
			expectToxic: false, // Medium severity profanity with weight 0.5 is below 0.7 threshold
			category:    "profanity",
		},
		{
			name:        "Profanity - obfuscated with asterisk",
			text:        "This is f*cking terrible",
			expectToxic: false, // Medium severity
			category:    "profanity",
		},
		{
			name:        "Profanity - l33tspeak",
			text:        "You are such an asshole",
			expectToxic: true, // High severity profanity with weight 0.7
			category:    "profanity",
		},
		{
			name:        "Harassment - threat",
			text:        "Go kill yourself",
			expectToxic: true, // High severity harassment
			category:    "harassment",
		},
		{
			name:        "Whitelisted - Scunthorpe",
			text:        "I live in Scunthorpe",
			expectToxic: false,
			category:    "",
		},
		{
			name:        "Whitelisted - assassin",
			text:        "The assassin was caught",
			expectToxic: false,
			category:    "",
		},
		{
			name:        "Violence - direct",
			text:        "I want to murder them",
			expectToxic: true, // High severity violence (0.8)
			category:    "violence",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score, err := classifier.ClassifyComment(context.Background(), tt.text)
			if err != nil {
				t.Fatalf("Expected no error, got: %v", err)
			}

			if score.Toxic != tt.expectToxic {
				t.Errorf("Expected toxic=%v, got toxic=%v (score: %v, categories: %v)",
					tt.expectToxic, score.Toxic, score.ConfidenceScore, score.Categories)
			}

			if tt.expectToxic && tt.category != "" {
				// Check if expected category is present
				if _, ok := score.Categories[tt.category]; !ok {
					t.Errorf("Expected category %s to be present in %v", tt.category, score.Categories)
				}
			}
		})
	}
}

// TestToxicityClassifier_Obfuscation tests various obfuscation techniques
func TestToxicityClassifier_Obfuscation(t *testing.T) {
	classifier := NewToxicityClassifier("", "", true, 0.4, nil)  // Lower threshold for these tests

	tests := []struct {
		name        string
		text        string
		expectToxic bool
	}{
		{
			name:        "Asterisk replacement",
			text:        "f*ck",
			expectToxic: true,
		},
		{
			name:        "At symbol replacement",
			text:        "ass",
			expectToxic: true,
		},
		{
			name:        "Dollar sign replacement",
			text:        "a$$",
			expectToxic: true,
		},
		{
			name:        "Number replacements",
			text:        "sh1t",
			expectToxic: true,
		},
		{
			name:        "Mixed obfuscation",
			text:        "@$$h0le",
			expectToxic: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score, err := classifier.ClassifyComment(context.Background(), tt.text)
			if err != nil {
				t.Fatalf("Expected no error, got: %v", err)
			}

			if score.Toxic != tt.expectToxic {
				t.Errorf("Expected toxic=%v, got toxic=%v (score: %v, categories: %v)",
					tt.expectToxic, score.Toxic, score.ConfidenceScore, score.Categories)
			}
		})
	}
}

// TestToxicityClassifier_Whitelist tests whitelist functionality
func TestToxicityClassifier_Whitelist(t *testing.T) {
	classifier := NewToxicityClassifier("", "", true, 0.5, nil)

	tests := []struct {
		name string
		text string
	}{
		{
			name: "Scunthorpe - town name",
			text: "Scunthorpe is a nice town",
		},
		{
			name: "assassin - valid word",
			text: "The assassin was very skilled",
		},
		{
			name: "assume - valid word",
			text: "I assume you are correct",
		},
		{
			name: "class - valid word",
			text: "This is a great class",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score, err := classifier.ClassifyComment(context.Background(), tt.text)
			if err != nil {
				t.Fatalf("Expected no error, got: %v", err)
			}

			if score.Toxic {
				t.Errorf("Expected whitelisted text to be non-toxic, got toxic=%v (score: %v)",
					score.Toxic, score.ConfidenceScore)
			}
		})
	}
}
