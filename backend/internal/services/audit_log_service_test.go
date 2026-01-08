package services

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/subculture-collective/clipper/internal/repository"
)

// TestParseAuditLogFilters tests the filter parsing function
func TestParseAuditLogFilters(t *testing.T) {
	tests := []struct {
		name        string
		moderatorID string
		action      string
		entityType  string
		entityID    string
		channelID   string
		startDate   string
		endDate     string
		expectError bool
	}{
		{
			name:        "Valid filters",
			moderatorID: uuid.New().String(),
			action:      "ban",
			entityType:  "user",
			entityID:    uuid.New().String(),
			channelID:   uuid.New().String(),
			startDate:   time.Now().Add(-24 * time.Hour).Format(time.RFC3339),
			endDate:     time.Now().Format(time.RFC3339),
			expectError: false,
		},
		{
			name:        "Empty filters",
			moderatorID: "",
			action:      "",
			entityType:  "",
			entityID:    "",
			channelID:   "",
			startDate:   "",
			endDate:     "",
			expectError: false,
		},
		{
			name:        "Invalid moderator ID",
			moderatorID: "invalid-uuid",
			action:      "",
			entityType:  "",
			entityID:    "",
			channelID:   "",
			startDate:   "",
			endDate:     "",
			expectError: true,
		},
		{
			name:        "Invalid entity ID",
			moderatorID: "",
			action:      "",
			entityType:  "",
			entityID:    "invalid-uuid",
			channelID:   "",
			startDate:   "",
			endDate:     "",
			expectError: true,
		},
		{
			name:        "Invalid channel ID",
			moderatorID: "",
			action:      "",
			entityType:  "",
			entityID:    "",
			channelID:   "invalid-uuid",
			startDate:   "",
			endDate:     "",
			expectError: true,
		},
		{
			name:        "Invalid start date",
			moderatorID: "",
			action:      "",
			entityType:  "",
			entityID:    "",
			channelID:   "",
			startDate:   "invalid-date",
			endDate:     "",
			expectError: true,
		},
		{
			name:        "Invalid end date",
			moderatorID: "",
			action:      "",
			entityType:  "",
			entityID:    "",
			channelID:   "",
			startDate:   "",
			endDate:     "invalid-date",
			expectError: true,
		},
		{
			name:        "Partial filters - action and entity type only",
			moderatorID: "",
			action:      "timeout",
			entityType:  "message",
			entityID:    "",
			channelID:   "",
			startDate:   "",
			endDate:     "",
			expectError: false,
		},
		{
			name:        "Partial filters - date range only",
			moderatorID: "",
			action:      "",
			entityType:  "",
			entityID:    "",
			channelID:   "",
			startDate:   time.Now().Add(-7 * 24 * time.Hour).Format(time.RFC3339),
			endDate:     time.Now().Format(time.RFC3339),
			expectError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			filters, err := ParseAuditLogFilters(
				tt.moderatorID,
				tt.action,
				tt.entityType,
				tt.entityID,
				tt.channelID,
				tt.startDate,
				tt.endDate,
			)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				if tt.moderatorID != "" {
					assert.NotNil(t, filters.ModeratorID)
					assert.Equal(t, tt.moderatorID, filters.ModeratorID.String())
				}
				if tt.action != "" {
					assert.Equal(t, tt.action, filters.Action)
				}
				if tt.entityType != "" {
					assert.Equal(t, tt.entityType, filters.EntityType)
				}
				if tt.entityID != "" {
					assert.NotNil(t, filters.EntityID)
					assert.Equal(t, tt.entityID, filters.EntityID.String())
				}
				if tt.channelID != "" {
					assert.NotNil(t, filters.ChannelID)
					assert.Equal(t, tt.channelID, filters.ChannelID.String())
				}
				if tt.startDate != "" {
					assert.NotNil(t, filters.StartDate)
				}
				if tt.endDate != "" {
					assert.NotNil(t, filters.EndDate)
				}
			}
		})
	}
}

// TestParseAuditLogFiltersDateRangeOrder tests that date ranges are correctly parsed
func TestParseAuditLogFiltersDateRangeOrder(t *testing.T) {
	startDate := time.Now().Add(-7 * 24 * time.Hour)
	endDate := time.Now()

	filters, err := ParseAuditLogFilters(
		"",
		"",
		"",
		"",
		"",
		startDate.Format(time.RFC3339),
		endDate.Format(time.RFC3339),
	)

	assert.NoError(t, err)
	assert.NotNil(t, filters.StartDate)
	assert.NotNil(t, filters.EndDate)
	assert.True(t, filters.StartDate.Before(*filters.EndDate), "start date should be before end date")
}

// TestAuditLogFiltersStructure tests the AuditLogFilters structure
func TestAuditLogFiltersStructure(t *testing.T) {
	moderatorID := uuid.New()
	entityID := uuid.New()
	channelID := uuid.New()
	startDate := time.Now().Add(-24 * time.Hour)
	endDate := time.Now()

	filters := repository.AuditLogFilters{
		ModeratorID: &moderatorID,
		Action:      "ban",
		EntityType:  "user",
		EntityID:    &entityID,
		ChannelID:   &channelID,
		StartDate:   &startDate,
		EndDate:     &endDate,
	}

	assert.Equal(t, "ban", filters.Action)
	assert.Equal(t, "user", filters.EntityType)
	assert.NotNil(t, filters.ModeratorID)
	assert.Equal(t, moderatorID, *filters.ModeratorID)
	assert.NotNil(t, filters.EntityID)
	assert.Equal(t, entityID, *filters.EntityID)
	assert.NotNil(t, filters.ChannelID)
	assert.Equal(t, channelID, *filters.ChannelID)
	assert.NotNil(t, filters.StartDate)
	assert.NotNil(t, filters.EndDate)
}

// TestAuditLogFiltersOptional tests that filters work with optional fields
func TestAuditLogFiltersOptional(t *testing.T) {
	filters := repository.AuditLogFilters{
		Action:     "approve",
		EntityType: "clip_submission",
	}

	assert.Equal(t, "approve", filters.Action)
	assert.Equal(t, "clip_submission", filters.EntityType)
	assert.Nil(t, filters.ModeratorID)
	assert.Nil(t, filters.EntityID)
	assert.Nil(t, filters.ChannelID)
	assert.Nil(t, filters.StartDate)
	assert.Nil(t, filters.EndDate)
}

// TestAuditLogFiltersEmpty tests empty filters
func TestAuditLogFiltersEmpty(t *testing.T) {
	filters := repository.AuditLogFilters{}

	assert.Equal(t, "", filters.Action)
	assert.Equal(t, "", filters.EntityType)
	assert.Nil(t, filters.ModeratorID)
	assert.Nil(t, filters.EntityID)
	assert.Nil(t, filters.ChannelID)
	assert.Nil(t, filters.StartDate)
	assert.Nil(t, filters.EndDate)
}
