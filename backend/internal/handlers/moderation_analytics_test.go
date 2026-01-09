package handlers

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TestGetModerationAuditLogs_InvalidModeratorID tests audit logs with invalid moderator ID
func TestGetModerationAuditLogs_InvalidModeratorID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testUserID := uuid.New()
	handler := NewModerationHandler(nil, nil, nil, nil, nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/admin/moderation/audit?moderator_id=invalid-uuid", nil)
	c.Set("user_id", testUserID)

	handler.GetModerationAuditLogs(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d for invalid moderator ID, got %d", http.StatusBadRequest, w.Code)
	}
}

// TestGetModerationAuditLogs_ValidParameters tests audit logs parameter parsing
func TestGetModerationAuditLogs_ValidParameters(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testUserID := uuid.New()
	handler := NewModerationHandler(nil, nil, nil, nil, nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	validModeratorID := uuid.New().String()
	c.Request = httptest.NewRequest(http.MethodGet,
		"/api/admin/moderation/audit?moderator_id="+validModeratorID+"&action=approve&start_date=2024-01-01&limit=50", nil)
	c.Set("user_id", testUserID)

	// Test passes if we don't get a bad request (400) - parameter validation passed
	// We expect eventual failure due to nil DB, but that's after validation
	handler.GetModerationAuditLogs(c)

	// Should not be a bad request since parameters are valid
	if w.Code == http.StatusBadRequest {
		t.Errorf("Expected valid parameters to not return bad request, got %d", w.Code)
	}
}

// TestGetModerationAnalytics_DefaultDateRange tests analytics defaults
func TestGetModerationAnalytics_DefaultDateRange(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testUserID := uuid.New()
	handler := NewModerationHandler(nil, nil, nil, nil, nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/admin/moderation/analytics", nil)
	c.Set("user_id", testUserID)

	handler.GetModerationAnalytics(c)

	// Should not be a bad request - defaults should be applied
	if w.Code == http.StatusBadRequest {
		t.Errorf("Expected default parameters to be valid, got %d", w.Code)
	}
}

// TestGetModerationAnalytics_CustomDateRange tests analytics with date range
func TestGetModerationAnalytics_CustomDateRange(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testUserID := uuid.New()
	handler := NewModerationHandler(nil, nil, nil, nil, nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet,
		"/api/admin/moderation/analytics?start_date=2024-01-01&end_date=2024-12-31", nil)
	c.Set("user_id", testUserID)

	handler.GetModerationAnalytics(c)

	// Should not be a bad request since parameters are valid
	if w.Code == http.StatusBadRequest {
		t.Errorf("Expected valid date range to not return bad request, got %d", w.Code)
	}
}
