package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestListClips_InvalidSubmittedByUserID tests that invalid UUIDs in submitted_by_user_id parameter are rejected
func TestListClips_InvalidSubmittedByUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ClipHandler{
		clipService: nil, // nil is ok since we never get to the service call with invalid UUID
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?submitted_by_user_id=not-a-uuid", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req

	handler.ListClips(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}

	var response StandardResponse
	err := json.Unmarshal(w.Body.Bytes(), &response)
	if err != nil {
		t.Errorf("response is not valid JSON: %v", err)
	}

	if response.Success {
		t.Error("expected Success to be false")
	}

	if response.Error == nil {
		t.Error("expected Error to be set")
	} else if response.Error.Code != "INVALID_UUID" {
		t.Errorf("expected error code INVALID_UUID, got %s", response.Error.Code)
	}
}

// TestListClips_MultipleInvalidSubmittedByUserIDs tests various invalid UUID formats
func TestListClips_MultipleInvalidSubmittedByUserIDs(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &ClipHandler{
		clipService: nil,
	}

	testCases := []string{
		"not-a-uuid",
		"12345",
		"invalid-uuid-format",
		"zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz",
	}

	for _, invalidUUID := range testCases {
		t.Run(invalidUUID, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/clips?submitted_by_user_id="+invalidUUID, http.NoBody)
			w := httptest.NewRecorder()

			c, _ := gin.CreateTestContext(w)
			c.Request = req

			handler.ListClips(c)

			if w.Code != http.StatusBadRequest {
				t.Errorf("for UUID '%s': expected status %d, got %d", invalidUUID, http.StatusBadRequest, w.Code)
			}

			var response StandardResponse
			err := json.Unmarshal(w.Body.Bytes(), &response)
			if err != nil {
				t.Errorf("for UUID '%s': response is not valid JSON: %v", invalidUUID, err)
			}

			if response.Error == nil || response.Error.Code != "INVALID_UUID" {
				t.Errorf("for UUID '%s': expected INVALID_UUID error", invalidUUID)
			}
		})
	}
}
