package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestGetLeaderboardInvalidType(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a minimal handler setup
	// We don't need real services since we're testing the invalid type path
	handler := &ReputationHandler{
		reputationService: nil, // Not accessed in invalid type case
		authService:       nil, // Not accessed in invalid type case
	}

	// Create router
	r := gin.New()
	r.GET("/leaderboards/:type", handler.GetLeaderboard)

	tests := []struct {
		name              string
		leaderboardType   string
		expectedStatus    int
		expectedErrorCode string
	}{
		{
			name:              "invalid leaderboard type",
			leaderboardType:   "invalid",
			expectedStatus:    http.StatusBadRequest,
			expectedErrorCode: "INVALID_LEADERBOARD_TYPE",
		},
		{
			name:              "empty leaderboard type",
			leaderboardType:   "",
			expectedStatus:    http.StatusNotFound, // Gin returns 404 for empty path params
			expectedErrorCode: "",
		},
		{
			name:              "numeric leaderboard type",
			leaderboardType:   "123",
			expectedStatus:    http.StatusBadRequest,
			expectedErrorCode: "INVALID_LEADERBOARD_TYPE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create request
			path := "/leaderboards/" + tt.leaderboardType
			req := httptest.NewRequest("GET", path, nil)
			w := httptest.NewRecorder()

			// Serve request
			r.ServeHTTP(w, req)

			// Check status code
			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			// For error responses, check JSON structure
			if tt.expectedStatus >= 400 && tt.expectedErrorCode != "" {
				// Verify response is valid JSON
				var response map[string]interface{}
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Errorf("response is not valid JSON: %v, body: %s", err, w.Body.String())
					return
				}

				// Check content type
				contentType := w.Header().Get("Content-Type")
				if contentType != "application/json; charset=utf-8" {
					t.Errorf("expected Content-Type 'application/json; charset=utf-8', got '%s'", contentType)
				}

				// Verify error response structure
				code, ok := response["code"].(string)
				if !ok {
					t.Error("code field missing or not a string in error response")
				} else if code != tt.expectedErrorCode {
					t.Errorf("expected error code '%s', got '%s'", tt.expectedErrorCode, code)
				}

				// Verify all required error fields are present
				if _, ok := response["error"]; !ok {
					t.Error("error field missing in error response")
				}
				if _, ok := response["message"]; !ok {
					t.Error("message field missing in error response")
				}
			}
		})
	}
}

func TestGetLeaderboardJSONResponse(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// This test verifies that even without a database,
	// the endpoint returns JSON (not HTML) when it fails
	handler := &ReputationHandler{
		reputationService: nil, // Will cause nil pointer if accessed
		authService:       nil,
	}

	r := gin.New()
	// Add recovery middleware to catch panics
	r.Use(func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
					"error":   "Internal server error",
					"code":    "INTERNAL_ERROR",
					"message": "An unexpected error occurred",
				})
			}
		}()
		c.Next()
	})
	r.GET("/leaderboards/:type", handler.GetLeaderboard)

	// Test valid type but with nil service (will panic)
	req := httptest.NewRequest("GET", "/leaderboards/karma", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	// Should get 500 status
	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected status %d, got %d", http.StatusInternalServerError, w.Code)
	}

	// Verify response is JSON, not HTML
	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json; charset=utf-8" {
		t.Errorf("expected JSON content type, got '%s'", contentType)
	}

	// Verify we can parse the response as JSON
	var response map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Errorf("response is not valid JSON: %v, body: %s", err, w.Body.String())
	}
}
