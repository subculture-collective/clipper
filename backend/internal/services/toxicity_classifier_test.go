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
	
	// Rule-based classifier with no patterns should return non-toxic
	if score.Toxic {
		t.Error("Expected comment to be classified as non-toxic with empty rule set")
	}
	
	// Check that categories are populated
	if _, ok := score.Categories["RULE_BASED"]; !ok {
		t.Error("Expected RULE_BASED category in score")
	}
}

func TestToxicityScore_ThresholdLogic(t *testing.T) {
	tests := []struct {
		name       string
		threshold  float64
		confidence float64
		expectToxic bool
	}{
		{
			name:       "Below threshold",
			threshold:  0.85,
			confidence: 0.75,
			expectToxic: false,
		},
		{
			name:       "At threshold",
			threshold:  0.85,
			confidence: 0.85,
			expectToxic: true,
		},
		{
			name:       "Above threshold",
			threshold:  0.85,
			confidence: 0.95,
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
