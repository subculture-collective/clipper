package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// TestBanUser_InvalidChannelID tests that invalid channel IDs are rejected
func TestBanUser_InvalidChannelID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ChatHandler{
		db: nil, // nil is ok since we never get to the DB call
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/chat/channels/not-a-uuid/ban", strings.NewReader(`{"user_id":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "not-a-uuid"},
	}

	handler.BanUser(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("response is not valid JSON: %v", err)
	}

	if _, ok := response["error"]; !ok {
		t.Error("expected error field in response")
	}
}

// TestBanUser_Unauthorized tests that unauthorized requests are rejected
func TestBanUser_Unauthorized(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ChatHandler{
		db: nil,
	}

	channelID := uuid.New().String()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/chat/channels/"+channelID+"/ban", strings.NewReader(`{"user_id":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: channelID},
	}
	// Note: not setting user_id in context to simulate unauthorized

	handler.BanUser(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

// TestDeleteMessage_InvalidMessageID tests that invalid message IDs are rejected
func TestDeleteMessage_InvalidMessageID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ChatHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/chat/messages/not-a-uuid", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "not-a-uuid"},
	}

	handler.DeleteMessage(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("response is not valid JSON: %v", err)
	}

	if _, ok := response["error"]; !ok {
		t.Error("expected error field in response")
	}
}

// TestMuteUser_InvalidChannelID tests that invalid channel IDs are rejected
func TestMuteUser_InvalidChannelID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ChatHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/chat/channels/invalid/mute", strings.NewReader(`{"user_id":"test"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "invalid"},
	}

	handler.MuteUser(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

// TestTimeoutUser_InvalidChannelID tests that invalid channel IDs are rejected
func TestTimeoutUser_InvalidChannelID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ChatHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/chat/channels/invalid/timeout", strings.NewReader(`{"user_id":"test","duration_minutes":10}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "invalid"},
	}

	handler.TimeoutUser(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

// TestGetModerationLog_InvalidChannelID tests that invalid channel IDs are rejected
func TestGetModerationLog_InvalidChannelID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ChatHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/chat/channels/invalid/moderation-log", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "invalid"},
	}

	handler.GetModerationLog(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

// TestCheckUserBan_InvalidChannelID tests that invalid channel IDs are rejected
func TestCheckUserBan_InvalidChannelID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ChatHandler{
		db: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/chat/channels/invalid/check-ban?user_id=test", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "invalid"},
	}

	handler.CheckUserBan(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}
