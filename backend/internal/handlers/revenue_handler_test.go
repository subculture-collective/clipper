package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

// TestNewRevenueHandler tests handler creation
func TestNewRevenueHandler(t *testing.T) {
	handler := NewRevenueHandler(nil)
	assert.NotNil(t, handler)
}

func TestRevenueHandler_TriggerBackfill_Success(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	handler := &RevenueHandler{revenueService: nil}

	router.POST("/admin/revenue/backfill", handler.TriggerBackfill)

	req := httptest.NewRequest(http.MethodPost, "/admin/revenue/backfill", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// TriggerBackfill returns immediately with success
	// The actual backfill runs in a goroutine and will log errors if service is nil
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, true, response["success"])
	assert.Equal(t, "Backfill job started", response["message"])
	assert.Equal(t, float64(30), response["days"])
}

func TestRevenueHandler_TriggerBackfill_CustomDays(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	handler := &RevenueHandler{revenueService: nil}

	router.POST("/admin/revenue/backfill", handler.TriggerBackfill)

	req := httptest.NewRequest(http.MethodPost, "/admin/revenue/backfill?days=90", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, float64(90), response["days"])
}

func TestRevenueHandler_TriggerBackfill_InvalidDays(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	handler := &RevenueHandler{revenueService: nil}

	router.POST("/admin/revenue/backfill", handler.TriggerBackfill)

	// Invalid days should default to 30
	req := httptest.NewRequest(http.MethodPost, "/admin/revenue/backfill?days=invalid", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, float64(30), response["days"])
}

func TestRevenueHandler_TriggerBackfill_DaysOutOfRange(t *testing.T) {
	gin.SetMode(gin.TestMode)

	router := gin.New()
	handler := &RevenueHandler{revenueService: nil}

	router.POST("/admin/revenue/backfill", handler.TriggerBackfill)

	// Days > 365 should default to 30
	req := httptest.NewRequest(http.MethodPost, "/admin/revenue/backfill?days=500", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)
	assert.NoError(t, err)
	assert.Equal(t, float64(30), response["days"])
}

