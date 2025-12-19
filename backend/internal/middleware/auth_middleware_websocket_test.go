package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestExtractToken_QueryParameter(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name           string
		setupRequest   func(*gin.Context)
		expectedToken  string
		description    string
	}{
		{
			name: "token from Authorization header",
			setupRequest: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "Bearer test-token-header")
			},
			expectedToken: "test-token-header",
			description:   "Should extract token from Authorization header",
		},
		{
			name: "token from query parameter",
			setupRequest: func(c *gin.Context) {
				c.Request.URL.RawQuery = "token=test-token-query"
			},
			expectedToken: "test-token-query",
			description:   "Should extract token from query parameter for WebSocket auth",
		},
		{
			name: "header takes precedence over query",
			setupRequest: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "Bearer test-token-header")
				c.Request.URL.RawQuery = "token=test-token-query"
			},
			expectedToken: "test-token-header",
			description:   "Authorization header should take precedence over query param",
		},
		{
			name: "token from cookie",
			setupRequest: func(c *gin.Context) {
				c.Request.AddCookie(&http.Cookie{
					Name:  "access_token",
					Value: "test-token-cookie",
				})
			},
			expectedToken: "test-token-cookie",
			description:   "Should extract token from cookie as fallback",
		},
		{
			name: "query takes precedence over cookie",
			setupRequest: func(c *gin.Context) {
				c.Request.URL.RawQuery = "token=test-token-query"
				c.Request.AddCookie(&http.Cookie{
					Name:  "access_token",
					Value: "test-token-cookie",
				})
			},
			expectedToken: "test-token-query",
			description:   "Query parameter should take precedence over cookie",
		},
		{
			name: "no token provided",
			setupRequest: func(c *gin.Context) {
				// No token in any location
			},
			expectedToken: "",
			description:   "Should return empty string when no token provided",
		},
		{
			name: "malformed Authorization header",
			setupRequest: func(c *gin.Context) {
				c.Request.Header.Set("Authorization", "InvalidFormat")
			},
			expectedToken: "",
			description:   "Should return empty string for malformed Authorization header",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(w)
			c.Request = httptest.NewRequest(http.MethodGet, "/test", nil)
			
			tt.setupRequest(c)
			
			token := extractToken(c)
			assert.Equal(t, tt.expectedToken, token, tt.description)
		})
	}
}

func TestExtractToken_WebSocketScenario(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Simulate a WebSocket upgrade request where token is passed as query param
	// This is the primary use case for query parameter authentication
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(
		http.MethodGet, 
		"/api/v1/watch-parties/123/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
		nil,
	)
	c.Request.Header.Set("Upgrade", "websocket")
	c.Request.Header.Set("Connection", "Upgrade")

	token := extractToken(c)
	
	assert.Equal(t, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", token, 
		"Should extract JWT token from query parameter for WebSocket connections")
	assert.NotEmpty(t, token, "Token should not be empty for authenticated WebSocket")
}
