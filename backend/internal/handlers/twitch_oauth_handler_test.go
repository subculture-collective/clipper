package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

func setupTwitchOAuthTestHandler(t *testing.T) (*TwitchOAuthHandler, *pgxpool.Pool, func()) {
	t.Helper()
	
	connString := os.Getenv("TEST_DATABASE_URL")
	if connString == "" {
		connString = "postgres://clipper:clipper_password@localhost:5436/clipper_db?sslmode=disable"
	}
	
	pool, err := pgxpool.New(context.Background(), connString)
	if err != nil {
		t.Skipf("Skipping test: database not available: %v", err)
		return nil, nil, func() {}
	}
	
	// Test connection
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		t.Skipf("Skipping test: cannot ping database: %v", err)
		return nil, nil, func() {}
	}
	
	repo := repository.NewTwitchAuthRepository(pool)
	handler := NewTwitchOAuthHandler(repo)
	
	cleanup := func() {
		pool.Close()
	}
	
	return handler, pool, cleanup
}

func TestTwitchOAuthHandler_GetTwitchAuthStatus_NotAuthenticated(t *testing.T) {
	handler, _, cleanup := setupTwitchOAuthTestHandler(t)
	if handler == nil {
		return
	}
	defer cleanup()
	
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	
	// No user_id in context (not authenticated)
	handler.GetTwitchAuthStatus(c)
	
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
	
	var response models.TwitchAuthStatusResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}
	
	if response.Authenticated {
		t.Error("Expected authenticated to be false")
	}
}

func TestTwitchOAuthHandler_GetTwitchAuthStatus_NoTwitchAuth(t *testing.T) {
	handler, _, cleanup := setupTwitchOAuthTestHandler(t)
	if handler == nil {
		return
	}
	defer cleanup()
	
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	
	// Set user_id but no Twitch auth exists
	userID := uuid.New()
	c.Set("user_id", userID)
	
	handler.GetTwitchAuthStatus(c)
	
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
	
	var response models.TwitchAuthStatusResponse
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("Failed to unmarshal response: %v", err)
	}
	
	if response.Authenticated {
		t.Error("Expected authenticated to be false")
	}
}

func TestTwitchOAuthHandler_RevokeTwitchAuth_NotAuthenticated(t *testing.T) {
	handler, _, cleanup := setupTwitchOAuthTestHandler(t)
	if handler == nil {
		return
	}
	defer cleanup()
	
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	
	// No user_id in context
	handler.RevokeTwitchAuth(c)
	
	if w.Code != http.StatusUnauthorized {
		t.Errorf("Expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestTwitchOAuthHandler_RevokeTwitchAuth_Success(t *testing.T) {
	handler, _, cleanup := setupTwitchOAuthTestHandler(t)
	if handler == nil {
		return
	}
	defer cleanup()
	
	gin.SetMode(gin.TestMode)
	
	// Create a context for the database operation
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	
	// Create a mock request first
	req, _ := http.NewRequest("DELETE", "/api/v1/twitch/auth", nil)
	c.Request = req
	
	// First, create a Twitch auth record
	userID := uuid.New()
	auth := &models.TwitchAuth{
		UserID:         userID,
		TwitchUserID:   "test123",
		TwitchUsername: "testuser",
		AccessToken:    "test_token",
		RefreshToken:   "test_refresh",
		ExpiresAt:      time.Now().Add(4 * time.Hour),
	}
	
	err := handler.twitchAuthRepo.UpsertTwitchAuth(c.Request.Context(), auth)
	if err != nil {
		t.Fatalf("Failed to create test auth: %v", err)
	}
	
	// Now test revoke
	c.Set("user_id", userID)
	
	handler.RevokeTwitchAuth(c)
	
	if w.Code != http.StatusOK {
		t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
	}
	
	// Verify auth was deleted
	retrieved, _ := handler.twitchAuthRepo.GetTwitchAuth(c.Request.Context(), userID)
	if retrieved != nil {
		t.Error("Expected auth to be deleted")
	}
}

func TestTwitchOAuthHandler_InitiateTwitchOAuth(t *testing.T) {
	handler, _, cleanup := setupTwitchOAuthTestHandler(t)
	if handler == nil {
		return
	}
	defer cleanup()
	
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	
	// Create a mock request
	req, _ := http.NewRequest("GET", "/api/v1/twitch/oauth/authorize", nil)
	c.Request = req
	
	handler.InitiateTwitchOAuth(c)
	
	// Should redirect
	if w.Code != http.StatusTemporaryRedirect {
		t.Errorf("Expected status %d, got %d", http.StatusTemporaryRedirect, w.Code)
	}
	
	location := w.Header().Get("Location")
	if location == "" {
		t.Error("Expected redirect location to be set")
	}
	
	// Verify redirect URL contains necessary parameters
	if !contains(location, "id.twitch.tv/oauth2/authorize") {
		t.Error("Expected redirect to Twitch OAuth")
	}
	if !contains(location, "chat:read") || !contains(location, "chat:edit") {
		t.Error("Expected chat scopes in redirect URL")
	}
}

func contains(s, substr string) bool {
	return len(s) > 0 && len(substr) > 0 && stringContains(s, substr)
}

func stringContains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
