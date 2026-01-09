package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TestSyncBans_Unauthorized tests that syncing bans requires authentication
func TestSyncBans_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewModerationHandler(nil, nil, nil, nil, nil, nil)

	requestBody := map[string]string{
		"channel_id": "123456",
	}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/moderation/sync-bans", bytes.NewReader(jsonBody))
	c.Request.Header.Set("Content-Type", "application/json")
	// Not setting user_id to test authorization

	handler.SyncBans(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d for unauthorized request, got %d", http.StatusUnauthorized, w.Code)
	}
}

// TestSyncBans_InvalidJSON tests sync-bans with invalid JSON
func TestSyncBans_InvalidJSON(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testUserID := uuid.New()
	handler := NewModerationHandler(nil, nil, nil, nil, nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/moderation/sync-bans", bytes.NewReader([]byte("invalid json")))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", testUserID)

	handler.SyncBans(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d for invalid JSON, got %d", http.StatusBadRequest, w.Code)
	}
}

// TestSyncBans_MissingChannelID tests sync-bans with missing channelId
func TestSyncBans_MissingChannelID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testUserID := uuid.New()
	handler := NewModerationHandler(nil, nil, nil, nil, nil, nil)

	requestBody := map[string]string{}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/moderation/sync-bans", bytes.NewReader(jsonBody))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", testUserID)

	handler.SyncBans(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d for missing channelId, got %d", http.StatusBadRequest, w.Code)
	}
}

// TestSyncBans_EmptyChannelID tests sync-bans with empty channelId
func TestSyncBans_EmptyChannelID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testUserID := uuid.New()
	handler := NewModerationHandler(nil, nil, nil, nil, nil, nil)

	requestBody := map[string]string{
		"channel_id": "",
	}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/moderation/sync-bans", bytes.NewReader(jsonBody))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", testUserID)

	handler.SyncBans(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d for empty channelId, got %d", http.StatusBadRequest, w.Code)
	}
}

// TestSyncBans_ServiceUnavailable tests sync-bans when service is not available
func TestSyncBans_ServiceUnavailable(t *testing.T) {
	gin.SetMode(gin.TestMode)

	testUserID := uuid.New()
	// Create handler without TwitchBanSyncService (nil)
	handler := NewModerationHandler(nil, nil, nil, nil, nil, nil)

	requestBody := map[string]string{
		"channel_id": "123456",
	}
	jsonBody, _ := json.Marshal(requestBody)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/v1/moderation/sync-bans", bytes.NewReader(jsonBody))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("user_id", testUserID)

	handler.SyncBans(c)

	if w.Code != http.StatusServiceUnavailable {
		t.Errorf("Expected status %d when service unavailable, got %d", http.StatusServiceUnavailable, w.Code)
	}
}
