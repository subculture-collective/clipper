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

// TestSubmitContactMessage_InvalidInput tests validation of contact form input
func TestSubmitContactMessage_InvalidInput(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		requestBody    map[string]interface{}
		expectedStatus int
		errorContains  string
	}{
		{
			name: "Invalid email format",
			requestBody: map[string]interface{}{
				"email":    "invalid-email",
				"category": "feedback",
				"subject":  "Test subject",
				"message":  "This is a test message with enough characters.",
			},
			expectedStatus: http.StatusBadRequest,
			errorContains:  "email",
		},
		{
			name: "Missing email",
			requestBody: map[string]interface{}{
				"category": "feedback",
				"subject":  "Test subject",
				"message":  "This is a test message.",
			},
			expectedStatus: http.StatusBadRequest,
			errorContains:  "error",
		},
		{
			name: "Invalid category",
			requestBody: map[string]interface{}{
				"email":    "test@example.com",
				"category": "invalid_category",
				"subject":  "Test subject",
				"message":  "This is a test message.",
			},
			expectedStatus: http.StatusBadRequest,
			errorContains:  "category",
		},
		{
			name: "Subject too short",
			requestBody: map[string]interface{}{
				"email":    "test@example.com",
				"category": "feedback",
				"subject":  "ab",
				"message":  "This is a test message with enough characters.",
			},
			expectedStatus: http.StatusBadRequest,
			errorContains:  "subject",
		},
		{
			name: "Message too short",
			requestBody: map[string]interface{}{
				"email":    "test@example.com",
				"category": "feedback",
				"subject":  "Test subject",
				"message":  "Short",
			},
			expectedStatus: http.StatusBadRequest,
			errorContains:  "message",
		},
		{
			name: "Missing category",
			requestBody: map[string]interface{}{
				"email":   "test@example.com",
				"subject": "Test subject",
				"message": "This is a test message.",
			},
			expectedStatus: http.StatusBadRequest,
			errorContains:  "error",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create handler with nil dependencies (validation happens before repo access)
			handler := &ContactHandler{
				contactRepo: nil,
				authService: nil,
			}

			// Create request
			body, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest(http.MethodPost, "/api/v1/contact", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			// Create response recorder
			w := httptest.NewRecorder()

			// Create gin context
			c, _ := gin.CreateTestContext(w)
			c.Request = req

			// Execute
			handler.SubmitContactMessage(c)

			// Assert
			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}

			var response map[string]interface{}
			json.Unmarshal(w.Body.Bytes(), &response)

			if errorMsg, ok := response["error"].(string); ok {
				if tt.errorContains != "" && len(errorMsg) == 0 {
					t.Errorf("expected error to contain '%s', got empty error", tt.errorContains)
				}
			} else if tt.errorContains != "" {
				t.Errorf("expected error in response, got none")
			}
		})
	}
}

// TestUpdateContactMessageStatus_InvalidInput tests validation of status update input
func TestUpdateContactMessageStatus_InvalidInput(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		messageID      string
		requestBody    map[string]interface{}
		expectedStatus int
	}{
		{
			name:      "Invalid message ID",
			messageID: "invalid-uuid",
			requestBody: map[string]interface{}{
				"status": "reviewed",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:      "Invalid status value",
			messageID: uuid.New().String(),
			requestBody: map[string]interface{}{
				"status": "invalid_status",
			},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Missing status",
			messageID:      uuid.New().String(),
			requestBody:    map[string]interface{}{},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := &ContactHandler{
				contactRepo: nil,
				authService: nil,
			}

			body, _ := json.Marshal(tt.requestBody)
			req, _ := http.NewRequest(http.MethodPut, "/api/v1/admin/contact/"+tt.messageID+"/status", bytes.NewBuffer(body))
			req.Header.Set("Content-Type", "application/json")

			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = req
			c.Params = []gin.Param{{Key: "id", Value: tt.messageID}}

			handler.UpdateContactMessageStatus(c)

			if w.Code != tt.expectedStatus {
				t.Errorf("expected status %d, got %d", tt.expectedStatus, w.Code)
			}
		})
	}
}
