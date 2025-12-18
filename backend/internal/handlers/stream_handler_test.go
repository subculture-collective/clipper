package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/models"
)

// TestGetStreamStatus_MissingStreamer tests request with missing streamer parameter
func TestGetStreamStatus_MissingStreamer(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewStreamHandler(nil, nil)

	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/v1/streams/", nil)

	handler.GetStreamStatus(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("Expected status %d for missing streamer, got %d", http.StatusBadRequest, w.Code)
	}

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	if err != nil {
		t.Fatalf("Failed to parse response: %v", err)
	}

	if _, ok := response["error"]; !ok {
		t.Error("Expected error field in response")
	}
}

// TestStreamInfoStructure tests that StreamInfo model has correct structure
func TestStreamInfoStructure(t *testing.T) {
	streamInfo := models.StreamInfo{
		StreamerUsername: "teststreamer",
		IsLive:           true,
		ViewerCount:      100,
	}

	if streamInfo.StreamerUsername != "teststreamer" {
		t.Errorf("Expected streamer_username to be 'teststreamer', got %s", streamInfo.StreamerUsername)
	}

	if !streamInfo.IsLive {
		t.Error("Expected is_live to be true")
	}

	if streamInfo.ViewerCount != 100 {
		t.Errorf("Expected viewer_count to be 100, got %d", streamInfo.ViewerCount)
	}
}

// TestStreamHandler_Initialization tests that handler initializes correctly
func TestStreamHandler_Initialization(t *testing.T) {
	handler := NewStreamHandler(nil, nil)

	if handler == nil {
		t.Error("Expected handler to be created")
	}

	if handler.twitchClient != nil {
		t.Error("Expected twitchClient to be nil in test setup")
	}

	if handler.streamRepo != nil {
		t.Error("Expected streamRepo to be nil in test setup")
	}
}
