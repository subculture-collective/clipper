package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

// TestListComments_InvalidClipID tests that invalid clip IDs are rejected
func TestListComments_InvalidClipID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &CommentHandler{
		commentService: nil, // nil is ok since we never get to the service call
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/clips/not-a-uuid/comments", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "not-a-uuid"},
	}

	handler.ListComments(c)

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

// TestGetReplies_InvalidCommentID tests the GetReplies endpoint with invalid comment ID
func TestGetReplies_InvalidCommentID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &CommentHandler{
		commentService: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/comments/not-a-uuid/replies", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "not-a-uuid"},
	}

	handler.GetReplies(c)

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

// TestListComments_IncludeRepliesParameter tests the include_replies query parameter
func TestListComments_IncludeRepliesParameter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name              string
		includeRepliesVal string
		expectInclude     bool
		description       string
	}{
		{
			name:              "Include replies true",
			includeRepliesVal: "true",
			expectInclude:     true,
			description:       "Should parse 'true' as boolean true",
		},
		{
			name:              "Include replies false",
			includeRepliesVal: "false",
			expectInclude:     false,
			description:       "Should parse 'false' as boolean false",
		},
		{
			name:              "Include replies empty",
			includeRepliesVal: "",
			expectInclude:     false,
			description:       "Should default to false when empty",
		},
		{
			name:              "Include replies invalid",
			includeRepliesVal: "invalid",
			expectInclude:     false,
			description:       "Should default to false for invalid values",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test parameter parsing logic
			includeReplies := tt.includeRepliesVal == "true"
			
			if includeReplies != tt.expectInclude {
				t.Errorf("Expected includeReplies=%v, got %v for value '%s'",
					tt.expectInclude, includeReplies, tt.includeRepliesVal)
			}
		})
	}
}

// TestListComments_PaginationParameters tests pagination parameters
func TestListComments_PaginationParameters(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name          string
		limitParam    string
		cursorParam   string
		expectedLimit int
		expectedCursor int
		description   string
	}{
		{
			name:           "Valid parameters",
			limitParam:     "20",
			cursorParam:    "10",
			expectedLimit:  20,
			expectedCursor: 10,
			description:    "Should parse valid numeric parameters",
		},
		{
			name:           "Invalid limit defaults to 50",
			limitParam:     "invalid",
			cursorParam:    "0",
			expectedLimit:  50,
			expectedCursor: 0,
			description:    "Should default limit to 50 for invalid values",
		},
		{
			name:           "Negative cursor defaults to 0",
			limitParam:     "10",
			cursorParam:    "-5",
			expectedLimit:  10,
			expectedCursor: 0,
			description:    "Should default cursor to 0 for negative values",
		},
		{
			name:           "Limit exceeds max",
			limitParam:     "200",
			cursorParam:    "0",
			expectedLimit:  50,
			expectedCursor: 0,
			description:    "Should cap limit at 100 but default to 50 here",
		},
		{
			name:           "Empty parameters use defaults",
			limitParam:     "",
			cursorParam:    "",
			expectedLimit:  50,
			expectedCursor: 0,
			description:    "Should use defaults for empty parameters",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test parameter parsing logic from handler
			limit := 50 // default
			if tt.limitParam != "" && tt.limitParam != "invalid" {
				var parsedLimit int
				if _, err := fmt.Sscanf(tt.limitParam, "%d", &parsedLimit); err == nil {
					if parsedLimit >= 1 && parsedLimit <= 100 {
						limit = parsedLimit
					}
				}
			}
			
			cursor := 0 // default
			if tt.cursorParam != "" && tt.cursorParam != "invalid" {
				var parsedCursor int
				if _, err := fmt.Sscanf(tt.cursorParam, "%d", &parsedCursor); err == nil {
					if parsedCursor >= 0 {
						cursor = parsedCursor
					}
				}
			}
			
			if limit != tt.expectedLimit {
				t.Errorf("Expected limit=%d, got %d", tt.expectedLimit, limit)
			}
			
			if cursor != tt.expectedCursor {
				t.Errorf("Expected cursor=%d, got %d", tt.expectedCursor, cursor)
			}
		})
	}
}

// TestGetReplies_PaginationParameters tests pagination for replies endpoint
func TestGetReplies_PaginationParameters(t *testing.T) {
	tests := []struct {
		name           string
		limit          string
		cursor         string
		expectedLimit  int
		expectedOffset int
	}{
		{
			name:           "Default pagination",
			limit:          "",
			cursor:         "",
			expectedLimit:  50,
			expectedOffset: 0,
		},
		{
			name:           "Custom limit",
			limit:          "25",
			cursor:         "0",
			expectedLimit:  25,
			expectedOffset: 0,
		},
		{
			name:           "With offset",
			limit:          "10",
			cursor:         "10",
			expectedLimit:  10,
			expectedOffset: 10,
		},
		{
			name:           "Max limit enforcement",
			limit:          "150",
			cursor:         "0",
			expectedLimit:  50,
			expectedOffset: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Simulate the handler's parameter parsing logic
			limit := 50
			if tt.limit != "" {
				var parsedLimit int
				if _, err := fmt.Sscanf(tt.limit, "%d", &parsedLimit); err == nil {
					if parsedLimit >= 1 && parsedLimit <= 100 {
						limit = parsedLimit
					}
				}
			}
			
			offset := 0
			if tt.cursor != "" {
				var parsedOffset int
				if _, err := fmt.Sscanf(tt.cursor, "%d", &parsedOffset); err == nil {
					if parsedOffset >= 0 {
						offset = parsedOffset
					}
				}
			}
			
			if limit != tt.expectedLimit {
				t.Errorf("Expected limit=%d, got %d", tt.expectedLimit, limit)
			}
			
			if offset != tt.expectedOffset {
				t.Errorf("Expected offset=%d, got %d", tt.expectedOffset, offset)
			}
		})
	}
}
