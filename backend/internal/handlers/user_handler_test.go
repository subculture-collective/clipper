package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestGetUserClips_InvalidUserID tests that invalid user IDs are rejected
func TestGetUserClips_InvalidUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &UserHandler{
		clipRepo: nil, // nil is ok since we never get to the repo call with invalid UUID
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/not-a-uuid/clips", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "not-a-uuid"},
	}

	handler.GetUserClips(c)

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

// TestGetUserClips_MultipleInvalidUserIDs tests various invalid UUID formats in user ID parameter
func TestGetUserClips_MultipleInvalidUserIDs(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &UserHandler{
		clipRepo: nil,
	}

	testCases := []string{
		"not-a-uuid",
		"12345",
		"invalid-format",
		"abcdefgh-ijkl-mnop-qrst-uvwxyz123456",
	}

	for _, invalidID := range testCases {
		t.Run(invalidID, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/v1/users/"+invalidID+"/clips", http.NoBody)
			w := httptest.NewRecorder()

			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = gin.Params{
				{Key: "id", Value: invalidID},
			}

			handler.GetUserClips(c)

			if w.Code != http.StatusBadRequest {
				t.Errorf("for user ID '%s': expected status %d, got %d", invalidID, http.StatusBadRequest, w.Code)
			}

			var response map[string]interface{}
			if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
				t.Errorf("for user ID '%s': response is not valid JSON: %v", invalidID, err)
			}

			if _, ok := response["error"]; !ok {
				t.Errorf("for user ID '%s': expected error field in response", invalidID)
			}
		})
	}
}
