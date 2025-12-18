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

func TestRecordWatchProgress_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WatchHistoryHandler{
		repo: nil,
	}

	clipID := uuid.New().String()
	reqBody := map[string]interface{}{
		"clip_id":          clipID,
		"progress_seconds": 30,
		"duration_seconds": 120,
		"session_id":       "test_session_123",
	}
	jsonBody, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/watch-history", bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req

	handler.RecordWatchProgress(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	if err != nil {
		t.Errorf("response is not valid JSON: %v", err)
	}

	if errMsg, exists := response["error"]; !exists || errMsg != "User not authenticated" {
		t.Errorf("expected error message 'User not authenticated', got %v", errMsg)
	}
}

func TestGetWatchHistory_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WatchHistoryHandler{
		repo: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/watch-history", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req

	handler.GetWatchHistory(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestGetResumePosition_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &WatchHistoryHandler{
		repo: nil,
	}

	clipID := uuid.New().String()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/clips/"+clipID+"/progress", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: clipID},
	}

	handler.GetResumePosition(c)

	// For unauthenticated users, should return no progress
	if w.Code != http.StatusOK {
		t.Errorf("expected status %d, got %d", http.StatusOK, w.Code)
	}

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	if err != nil {
		t.Errorf("response is not valid JSON: %v", err)
	}

	if hasProgress, exists := response["has_progress"]; !exists || hasProgress != false {
		t.Errorf("expected has_progress to be false, got %v", hasProgress)
	}
}

func TestProgressPercentCalculation(t *testing.T) {
	tests := []struct {
		name            string
		progressSeconds int
		durationSeconds int
		expectedPercent float64
		expectedComplete bool
	}{
		{
			name:            "0% progress",
			progressSeconds: 0,
			durationSeconds: 100,
			expectedPercent: 0.0,
			expectedComplete: false,
		},
		{
			name:            "50% progress",
			progressSeconds: 50,
			durationSeconds: 100,
			expectedPercent: 50.0,
			expectedComplete: false,
		},
		{
			name:            "90% progress - completed",
			progressSeconds: 90,
			durationSeconds: 100,
			expectedPercent: 90.0,
			expectedComplete: true,
		},
		{
			name:            "95% progress - completed",
			progressSeconds: 95,
			durationSeconds: 100,
			expectedPercent: 95.0,
			expectedComplete: true,
		},
		{
			name:            "100% progress - completed",
			progressSeconds: 100,
			durationSeconds: 100,
			expectedPercent: 100.0,
			expectedComplete: true,
		},
		{
			name:            "89% progress - not completed",
			progressSeconds: 89,
			durationSeconds: 100,
			expectedPercent: 89.0,
			expectedComplete: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			progressPercent := float64(tt.progressSeconds) / float64(tt.durationSeconds) * 100
			completed := progressPercent >= 90.0

			if progressPercent != tt.expectedPercent {
				t.Errorf("expected progress percent %.1f, got %.1f", tt.expectedPercent, progressPercent)
			}

			if completed != tt.expectedComplete {
				t.Errorf("expected completed %v, got %v", tt.expectedComplete, completed)
			}
		})
	}
}
