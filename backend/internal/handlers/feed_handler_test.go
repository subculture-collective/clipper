package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestListUserFeeds_InvalidUserID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create handler with nil dependencies (not accessed in this test)
	handler := &FeedHandler{
		feedService: nil,
		authService: nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/users/invalid-uuid/feeds", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	c.Params = gin.Params{
		{Key: "id", Value: "invalid-uuid"},
	}

	handler.ListUserFeeds(c)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected status %d, got %d", http.StatusBadRequest, w.Code)
	}
}

func TestCreateFeed_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FeedHandler{
		feedService: nil,
		authService: nil,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/550e8400-e29b-41d4-a716-446655440000/feeds", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// Don't set user_id to simulate unauthenticated request

	handler.CreateFeed(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	if err != nil {
		t.Errorf("response is not valid JSON: %v", err)
	}

	if _, exists := response["error"]; !exists {
		t.Error("expected error field in response")
	}
}

func TestUpdateFeed_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FeedHandler{
		feedService: nil,
		authService: nil,
	}

	req := httptest.NewRequest(http.MethodPut, "/api/v1/users/550e8400-e29b-41d4-a716-446655440000/feeds/650e8400-e29b-41d4-a716-446655440001", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// Don't set user_id to simulate unauthenticated request

	handler.UpdateFeed(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestDeleteFeed_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FeedHandler{
		feedService: nil,
		authService: nil,
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/users/550e8400-e29b-41d4-a716-446655440000/feeds/650e8400-e29b-41d4-a716-446655440001", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// Don't set user_id to simulate unauthenticated request

	handler.DeleteFeed(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestAddClipToFeed_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FeedHandler{
		feedService: nil,
		authService: nil,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/550e8400-e29b-41d4-a716-446655440000/feeds/650e8400-e29b-41d4-a716-446655440001/clips", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// Don't set user_id to simulate unauthenticated request

	handler.AddClipToFeed(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestRemoveClipFromFeed_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FeedHandler{
		feedService: nil,
		authService: nil,
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/users/550e8400-e29b-41d4-a716-446655440000/feeds/650e8400-e29b-41d4-a716-446655440001/clips/750e8400-e29b-41d4-a716-446655440002", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// Don't set user_id to simulate unauthenticated request

	handler.RemoveClipFromFeed(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestFollowFeed_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FeedHandler{
		feedService: nil,
		authService: nil,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/v1/users/550e8400-e29b-41d4-a716-446655440000/feeds/650e8400-e29b-41d4-a716-446655440001/follow", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// Don't set user_id to simulate unauthenticated request

	handler.FollowFeed(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}

func TestUnfollowFeed_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := &FeedHandler{
		feedService: nil,
		authService: nil,
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/users/550e8400-e29b-41d4-a716-446655440000/feeds/650e8400-e29b-41d4-a716-446655440001/follow", http.NoBody)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// Don't set user_id to simulate unauthenticated request

	handler.UnfollowFeed(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
	}
}
