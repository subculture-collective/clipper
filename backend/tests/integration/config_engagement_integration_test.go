//go:build integration

package integration

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
)

// Validates PUT /admin/config/engagement persists settings
func TestEngagementConfigIntegration(t *testing.T) {
	// Ensure test DB env matches docker-compose.test.yml
	os.Setenv("DATABASE_URL", "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable")

	cfg, err := config.Load()
	require.NoError(t, err)

	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err)
	defer db.Close()

	appSettingsRepo := repository.NewAppSettingsRepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)

	configService := services.NewConfigService(appSettingsRepo)
	h := handlers.NewConfigHandler(configService, clipRepo)

	gin.SetMode(gin.TestMode)
	r := gin.Default()
	r.PUT("/api/v1/admin/config/engagement", func(c *gin.Context){
		// Simulate admin user id existing
		c.Set("user_id", appSettingsRepo.MustSystemUserID(context.Background()))
		h.UpdateEngagementConfig(c)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/config/engagement", strings.NewReader(`{"vote_weight":4.0,"comment_weight":2.5,"favorite_weight":2.0,"view_weight":0.2}`))
	req.Header.Set("Content-Type", "application/json")
	r.ServeHTTP(w, req)

	require.Equal(t, http.StatusOK, w.Code)

	// Verify app_settings persisted new values
	settings, err := appSettingsRepo.GetByPrefix(context.Background(), "engagement_scoring.")
	require.NoError(t, err)
	vals := map[string]string{}
	for _, s := range settings { vals[s.Key] = s.Value }
	require.Equal(t, "4", vals["engagement_scoring.vote_weight"])   // compact float formatting
	require.Equal(t, "2.5", vals["engagement_scoring.comment_weight"])
	require.Equal(t, "2", vals["engagement_scoring.favorite_weight"])   // compact
	require.Equal(t, "0.2", vals["engagement_scoring.view_weight"])
}
package integration
//go:build integration






































































}	require.Equal(t, "0.2", vals["engagement_scoring.view_weight"])	require.Equal(t, "2", vals["engagement_scoring.favorite_weight"]) // compact	require.Equal(t, "2.5", vals["engagement_scoring.comment_weight"])	require.Equal(t, "4", vals["engagement_scoring.vote_weight"]) // FormatFloat can write compact form	}		vals[s.Key] = s.Value	for _, s := range settings {	vals := map[string]string{}	require.NoError(t, err)	settings, err := appSettingsRepo.GetByPrefix(context.Background(), "engagement_scoring.")	// Verify app_settings persisted new values	require.Equal(t, http.StatusOK, w.Code)	r.ServeHTTP(w, req)	req.Header.Set("Content-Type", "application/json")	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/config/engagement", strings.NewReader(`{"vote_weight":4.0,"comment_weight":2.5,"favorite_weight":2.0,"view_weight":0.2}`))	w := httptest.NewRecorder()	})		h.UpdateEngagementConfig(c)		c.Set("user_id", userRepo.GetSystemUserID(context.Background()))		// Simulate admin user	r.PUT("/api/v1/admin/config/engagement", func(c *gin.Context){	r := gin.Default()	h := handlers.NewConfigHandler(configService, clipRepo)	// Minimal auth service mock; use AuthMiddleware bypass by setting user_id directly	configService := services.NewConfigService(appSettingsRepo)	userRepo := repository.NewUserRepository(db.Pool)	clipRepo := repository.NewClipRepository(db.Pool)	appSettingsRepo := repository.NewAppSettingsRepository(db.Pool)	defer db.Close()	require.NoError(t, err)	db, err := database.NewDB(&cfg.Database)	require.NoError(t, err)	cfg, err := config.Load()	os.Setenv("DATABASE_URL", "postgresql://clipper:clipper_password@localhost:5437/clipper_test?sslmode=disable")	// Ensure test DB env matches docker-compose.test.ymlfunc TestEngagementConfigIntegration(t *testing.T) {// and recalculates engagement scores for clips.// This integration test validates PUT /admin/config/engagement persists settings)	"github.com/subculture-collective/clipper/pkg/database"	"github.com/subculture-collective/clipper/internal/services"	"github.com/subculture-collective/clipper/internal/repository"	"github.com/subculture-collective/clipper/internal/middleware"	"github.com/subculture-collective/clipper/internal/handlers"	"github.com/subculture-collective/clipper/config"	"github.com/stretchr/testify/require"	"github.com/gin-gonic/gin"	"testing"	"strings"	"os"	"net/http/httptest"	"net/http"	"context"import (package integration
