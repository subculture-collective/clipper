package models

import (
	"testing"
)

func TestRejectionReasonTemplates(t *testing.T) {
	templates := GetRejectionReasonTemplates()

	if len(templates) == 0 {
		t.Error("Expected at least one rejection reason template")
	}

	// Check that all expected templates are present
	expectedReasons := []string{
		RejectionReasonLowQuality,
		RejectionReasonDuplicate,
		RejectionReasonInappropriate,
		RejectionReasonOffTopic,
		RejectionReasonPoorTitle,
		RejectionReasonTooShort,
		RejectionReasonTooLong,
		RejectionReasonSpam,
		RejectionReasonViolatesGuidelines,
		RejectionReasonOther,
	}

	foundReasons := make(map[string]bool)
	for _, template := range templates {
		foundReasons[template] = true
	}

	for _, expected := range expectedReasons {
		if !foundReasons[expected] {
			t.Errorf("Expected rejection reason template '%s' not found", expected)
		}
	}

	// Verify each constant has a non-empty value
	if RejectionReasonLowQuality == "" {
		t.Error("RejectionReasonLowQuality should not be empty")
	}
	if RejectionReasonDuplicate == "" {
		t.Error("RejectionReasonDuplicate should not be empty")
	}
	if RejectionReasonInappropriate == "" {
		t.Error("RejectionReasonInappropriate should not be empty")
	}
	if RejectionReasonOffTopic == "" {
		t.Error("RejectionReasonOffTopic should not be empty")
	}
	if RejectionReasonPoorTitle == "" {
		t.Error("RejectionReasonPoorTitle should not be empty")
	}
	if RejectionReasonTooShort == "" {
		t.Error("RejectionReasonTooShort should not be empty")
	}
	if RejectionReasonTooLong == "" {
		t.Error("RejectionReasonTooLong should not be empty")
	}
	if RejectionReasonSpam == "" {
		t.Error("RejectionReasonSpam should not be empty")
	}
	if RejectionReasonViolatesGuidelines == "" {
		t.Error("RejectionReasonViolatesGuidelines should not be empty")
	}
	if RejectionReasonOther == "" {
		t.Error("RejectionReasonOther should not be empty")
	}
}

func TestModerationAuditLogStructure(t *testing.T) {
	// Test that the struct can be created
	var log ModerationAuditLog
	
	// Verify the struct has all required fields
	_ = log.ID
	_ = log.Action
	_ = log.EntityType
	_ = log.EntityID
	_ = log.ModeratorID
	_ = log.Reason
	_ = log.Metadata
	_ = log.CreatedAt
	
	t.Log("ModerationAuditLog structure is valid")
}

func TestModerationAuditLogWithUserStructure(t *testing.T) {
	// Test that the struct can be created
	var log ModerationAuditLogWithUser
	
	// Verify the struct has all required fields including embedded struct
	_ = log.ID
	_ = log.Action
	_ = log.EntityType
	_ = log.EntityID
	_ = log.ModeratorID
	_ = log.Reason
	_ = log.Metadata
	_ = log.CreatedAt
	_ = log.Moderator
	
	t.Log("ModerationAuditLogWithUser structure is valid")
}
