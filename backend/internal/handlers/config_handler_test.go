package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/subculture-collective/clipper/internal/services"
)

type mockConfigService struct{
	cfg services.EngagementConfig
	updated bool
}

func (m *mockConfigService) GetEngagementConfig(ctx context.Context) (*services.EngagementConfig, error) {
	c := m.cfg
	return &c, nil
}

func (m *mockConfigService) UpdateEngagementConfig(ctx context.Context, cfg *services.EngagementConfig, updatedBy uuid.UUID) error {
	m.cfg = *cfg
	m.updated = true
	return nil
}

type mockClipRepo struct{}

func (m *mockClipRepo) RecalculateEngagementScores(ctx context.Context, voteWeight, commentWeight, favoriteWeight, viewWeight float64) error {
	return nil
}

func TestGetEngagementConfig(t *testing.T) {
	gin.SetMode(gin.TestMode)
	svc := &mockConfigService{cfg: services.EngagementConfig{VoteWeight:3, CommentWeight:2, FavoriteWeight:1.5, ViewWeight:0.1}}
	repo := &mockClipRepo{}
	h := &ConfigHandler{configService: svc, clipRepo: repo}

	r := gin.Default()
	r.GET("/admin/config/engagement", func(c *gin.Context){ h.GetEngagementConfig(c) })
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/admin/config/engagement", nil)
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	body := w.Body.String()
	assert.Contains(t, body, "vote_weight")
	assert.Contains(t, body, "3")
}

func TestUpdateEngagementConfig_Validates(t *testing.T){
	gin.SetMode(gin.TestMode)
	svc := &mockConfigService{}
	repo := &mockClipRepo{}
	h := &ConfigHandler{configService: svc, clipRepo: repo}

	r := gin.Default()
	r.PUT("/admin/config/engagement", func(c *gin.Context){
		// Simulate auth middleware setting user_id
		uid := uuid.New()
		c.Set("user_id", uid)
		h.UpdateEngagementConfig(c)
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/admin/config/engagement", strings.NewReader(`{"vote_weight":-1,"comment_weight":0,"favorite_weight":0,"view_weight":0}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusBadRequest, w.Code)
	assert.Contains(t, w.Body.String(), "non-negative")
}

func TestUpdateEngagementConfig_Success(t *testing.T){
	gin.SetMode(gin.TestMode)
	svc := &mockConfigService{}
	repo := &mockClipRepo{}
	h := &ConfigHandler{configService: svc, clipRepo: repo}

	r := gin.Default()
	r.PUT("/admin/config/engagement", func(c *gin.Context){
		uid := uuid.New()
		c.Set("user_id", uid)
		h.UpdateEngagementConfig(c)
	})
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/admin/config/engagement", strings.NewReader(`{"vote_weight":3.2,"comment_weight":2.1,"favorite_weight":1.6,"view_weight":0.12}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "updated")
}
