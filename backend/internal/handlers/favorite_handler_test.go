package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestListUserFavorites_Unauthenticated(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create handler with nil dependencies (not accessed for unauthenticated case)
	handler := &FavoriteHandler{
		favoriteRepo: nil,
		voteRepo:     nil,
		clipService:  nil,
	}

	req := httptest.NewRequest(http.MethodGet, "/api/v1/favorites", nil)
	w := httptest.NewRecorder()

	c, _ := gin.CreateTestContext(w)
	c.Request = req
	// Don't set user_id to simulate unauthenticated request

	handler.ListUserFavorites(c)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status %d, got %d", http.StatusUnauthorized, w.Code)
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
	} else if response.Error.Code != "UNAUTHORIZED" {
		t.Errorf("expected error code UNAUTHORIZED, got %s", response.Error.Code)
	}
}
