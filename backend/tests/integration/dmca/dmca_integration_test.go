//go:build integration

package dmca

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/middleware"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// setupDMCATestRouter creates a test router with DMCA routes
func setupDMCATestRouter(t *testing.T) (*gin.Engine, *services.DMCAService, *services.AuthService, *database.DB, *redispkg.Client, *jwtpkg.Manager) {
	gin.SetMode(gin.TestMode)

	// Load test configuration
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     testutil.GetEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     testutil.GetEnv("TEST_DATABASE_PORT", "5437"),
			User:     testutil.GetEnv("TEST_DATABASE_USER", "clipper"),
			Password: testutil.GetEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     testutil.GetEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: config.RedisConfig{
			Host: testutil.GetEnv("TEST_REDIS_HOST", "localhost"),
			Port: testutil.GetEnv("TEST_REDIS_PORT", "6380"),
		},
		JWT: config.JWTConfig{
			PrivateKey: testutil.GenerateTestJWTKey(t),
		},
	}

	// Initialize database
	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err, "Failed to connect to test database")

	// Initialize Redis
	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err, "Failed to connect to test Redis")

	// Initialize JWT manager
	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err, "Failed to initialize JWT manager")

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	dmcaRepo := repository.NewDMCARepository(db.Pool)
	clipRepo := repository.NewClipRepository(db.Pool)
	auditLogRepo := repository.NewAuditLogRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	dmcaServiceConfig := &services.DMCAServiceConfig{
		BaseURL:        "https://clipper.example.com",
		DMCAAgentEmail: "dmca@clipper.example.com",
	}

	// Create a mock email service
	emailService := &services.EmailService{} // Using real service, but email sending will be mocked in actual tests

	dmcaService := services.NewDMCAService(
		dmcaRepo,
		clipRepo,
		userRepo,
		auditLogRepo,
		emailService,
		nil, // searchIndexer - not needed for basic tests
		db.Pool,
		dmcaServiceConfig,
	)

	// Initialize handlers
	dmcaHandler := handlers.NewDMCAHandler(dmcaService, authService)

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())

	// Public DMCA routes
	api := r.Group("/api/v1")
	{
		api.POST("/dmca/takedown", dmcaHandler.SubmitTakedownNotice)
		api.POST("/dmca/counter-notice", dmcaHandler.SubmitCounterNotice)
		api.GET("/users/:id/dmca-strikes", middleware.AuthMiddleware(authService), dmcaHandler.GetUserStrikes)
	}

	// Admin DMCA routes
	admin := r.Group("/api/admin/dmca")
	admin.Use(middleware.AuthMiddleware(authService))
	admin.Use(middleware.RoleMiddleware("admin", "moderator"))
	{
		admin.GET("/notices", dmcaHandler.ListDMCANotices)
		admin.PATCH("/notices/:id/review", dmcaHandler.ReviewNotice)
		admin.POST("/notices/:id/process", dmcaHandler.ProcessTakedown)
		admin.POST("/counter-notices/:id/forward", dmcaHandler.ForwardCounterNotice)
		admin.GET("/dashboard", dmcaHandler.GetDashboardStats)
	}

	return r, dmcaService, authService, db, redisClient, jwtManager
}

// ==============================================================================
// Takedown Notice Submission Tests
// ==============================================================================

func TestDMCATakedownNoticeSubmission(t *testing.T) {
	router, dmcaService, _, db, redisClient, _ := setupDMCATestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("SubmitValidTakedownNotice", func(t *testing.T) {
		// Create a test clip first
		user := testutil.CreateTestUser(t, db, fmt.Sprintf("clipowner%d", time.Now().UnixNano()))
		clip := testutil.CreateTestClip(t, db, user.ID, "Test clip for DMCA")

		// Create valid takedown notice request
		req := models.SubmitDMCANoticeRequest{
			ComplainantName:            "John Doe",
			ComplainantEmail:           "john.doe@example.com",
			ComplainantAddress:         "123 Main Street, Anytown, CA 12345",
			Relationship:               "owner",
			CopyrightedWorkDescription: "My original video content that was published on YouTube",
			InfringingURLs:             []string{fmt.Sprintf("https://clipper.example.com/clip/%s", clip.ID.String())},
			GoodFaithStatement:         true,
			AccuracyStatement:          true,
			Signature:                  "John Doe",
		}
		body, _ := json.Marshal(req)

		// Submit takedown notice
		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/dmca/takedown", bytes.NewBuffer(body))
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Contains(t, response, "notice_id")
		assert.Equal(t, "pending_review", response["status"])
		assert.Contains(t, response, "message")

		// Verify notice was created in database
		noticeID, _ := uuid.Parse(response["notice_id"].(string))
		assert.NotEqual(t, uuid.Nil, noticeID)

		// Clean up - dmcaService is used to verify but we're not calling GetUserStrikes here
		_ = dmcaService
	})

	t.Run("RejectInvalidDomainURL", func(t *testing.T) {
		req := models.SubmitDMCANoticeRequest{
			ComplainantName:            "John Doe",
			ComplainantEmail:           "john.doe@example.com",
			ComplainantAddress:         "123 Main Street, Anytown, CA 12345",
			Relationship:               "owner",
			CopyrightedWorkDescription: "My original video content",
			InfringingURLs:             []string{"https://other-site.com/clip/123"},
			GoodFaithStatement:         true,
			AccuracyStatement:          true,
			Signature:                  "John Doe",
		}
		body, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/dmca/takedown", bytes.NewBuffer(body))
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		assert.Equal(t, http.StatusBadRequest, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "error")
	})

	t.Run("RejectWithoutRequiredStatements", func(t *testing.T) {
		req := models.SubmitDMCANoticeRequest{
			ComplainantName:            "John Doe",
			ComplainantEmail:           "john.doe@example.com",
			ComplainantAddress:         "123 Main Street, Anytown, CA 12345",
			Relationship:               "owner",
			CopyrightedWorkDescription: "My original video content",
			InfringingURLs:             []string{"https://clipper.example.com/clip/123e4567-e89b-12d3-a456-426614174000"},
			GoodFaithStatement:         false, // Missing required statement
			AccuracyStatement:          true,
			Signature:                  "John Doe",
		}
		body, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/dmca/takedown", bytes.NewBuffer(body))
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// ==============================================================================
// Admin Review and Processing Tests
// ==============================================================================

func TestDMCAAdminReviewWorkflow(t *testing.T) {
	router, dmcaService, _, db, redisClient, jwtManager := setupDMCATestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("AdminCanReviewNotice", func(t *testing.T) {
		// Create admin user
		admin := testutil.CreateTestUser(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()))
		ctx := context.Background()
		_, err := db.Pool.Exec(ctx, "UPDATE users SET role = 'admin' WHERE id = $1", admin.ID)
		require.NoError(t, err)

		// Create test clip and notice
		user := testutil.CreateTestUser(t, db, fmt.Sprintf("user%d", time.Now().UnixNano()))
		clip := testutil.CreateTestClip(t, db, user.ID, "Test clip")

		// Submit a notice through service
		noticeReq := &models.SubmitDMCANoticeRequest{
			ComplainantName:            "Copyright Holder",
			ComplainantEmail:           "holder@example.com",
			ComplainantAddress:         "456 Legal Ave, Suite 100",
			Relationship:               "owner",
			CopyrightedWorkDescription: "Original copyrighted work",
			InfringingURLs:             []string{fmt.Sprintf("https://clipper.example.com/clip/%s", clip.ID.String())},
			GoodFaithStatement:         true,
			AccuracyStatement:          true,
			Signature:                  "Copyright Holder",
		}
		notice, err := dmcaService.SubmitTakedownNotice(ctx, noticeReq, "127.0.0.1", "test-agent")
		require.NoError(t, err)

		// Generate admin token
		accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, admin.ID, "admin")

		// Review notice as admin
		reviewReq := models.UpdateDMCANoticeStatusRequest{
			Status: "valid",
		}
		body, _ := json.Marshal(reviewReq)

		httpReq := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/api/admin/dmca/notices/%s/review", notice.ID.String()), bytes.NewBuffer(body))
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Equal(t, "valid", response["status"])
	})

	t.Run("NonAdminCannotReviewNotice", func(t *testing.T) {
		// Create regular user
		user := testutil.CreateTestUser(t, db, fmt.Sprintf("reguser%d", time.Now().UnixNano()))
		accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		noticeID := uuid.New()
		reviewReq := models.UpdateDMCANoticeStatusRequest{
			Status: "valid",
		}
		body, _ := json.Marshal(reviewReq)

		httpReq := httptest.NewRequest(http.MethodPatch, fmt.Sprintf("/api/admin/dmca/notices/%s/review", noticeID.String()), bytes.NewBuffer(body))
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		// Should be forbidden due to role middleware
		assert.Equal(t, http.StatusForbidden, w.Code)
	})
}

// ==============================================================================
// Strike Management Tests
// ==============================================================================

func TestDMCAStrikeIssuance(t *testing.T) {
	router, dmcaService, _, db, redisClient, jwtManager := setupDMCATestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("ProcessTakedownIssuesStrike", func(t *testing.T) {
		// Create admin user
		admin := testutil.CreateTestUser(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()))
		ctx := context.Background()
		_, err := db.Pool.Exec(ctx, "UPDATE users SET role = 'admin' WHERE id = $1", admin.ID)
		require.NoError(t, err)

		// Create user and clip
		user := testutil.CreateTestUser(t, db, fmt.Sprintf("user%d", time.Now().UnixNano()))
		clip := testutil.CreateTestClip(t, db, user.ID, "Infringing content")

		// Submit and validate notice
		noticeReq := &models.SubmitDMCANoticeRequest{
			ComplainantName:            "Rights Owner",
			ComplainantEmail:           "owner@example.com",
			ComplainantAddress:         "789 Copyright Blvd",
			Relationship:               "owner",
			CopyrightedWorkDescription: "My protected work",
			InfringingURLs:             []string{fmt.Sprintf("https://clipper.example.com/clip/%s", clip.ID.String())},
			GoodFaithStatement:         true,
			AccuracyStatement:          true,
			Signature:                  "Rights Owner",
		}
		notice, err := dmcaService.SubmitTakedownNotice(ctx, noticeReq, "127.0.0.1", "test-agent")
		require.NoError(t, err)

		// Review as valid
		err = dmcaService.ReviewNotice(ctx, notice.ID, admin.ID, "valid", nil)
		require.NoError(t, err)

		// Process takedown (this should issue strike)
		accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, admin.ID, "admin")

		httpReq := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/api/admin/dmca/notices/%s/process", notice.ID.String()), nil)
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		assert.Equal(t, http.StatusOK, w.Code)

		// Verify strike was issued
		strikes, err := dmcaService.GetUserStrikes(ctx, user.ID)
		require.NoError(t, err)
		assert.Greater(t, len(strikes), 0, "User should have at least one strike")
	})
}

// ==============================================================================
// User Access Tests
// ==============================================================================

func TestDMCAUserStrikesAccess(t *testing.T) {
	router, _, _, db, redisClient, jwtManager := setupDMCATestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("UserCanViewOwnStrikes", func(t *testing.T) {
		user := testutil.CreateTestUser(t, db, fmt.Sprintf("user%d", time.Now().UnixNano()))
		accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		httpReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/users/%s/dmca-strikes", user.ID.String()), nil)
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		assert.Equal(t, http.StatusOK, w.Code)
	})

	t.Run("UserCannotViewOthersStrikes", func(t *testing.T) {
		user1 := testutil.CreateTestUser(t, db, fmt.Sprintf("user1_%d", time.Now().UnixNano()))
		user2 := testutil.CreateTestUser(t, db, fmt.Sprintf("user2_%d", time.Now().UnixNano()))

		accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, user1.ID, user1.Role)

		httpReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/users/%s/dmca-strikes", user2.ID.String()), nil)
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		assert.Equal(t, http.StatusForbidden, w.Code)
	})

	t.Run("AdminCanViewAnyUserStrikes", func(t *testing.T) {
		admin := testutil.CreateTestUser(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()))
		user := testutil.CreateTestUser(t, db, fmt.Sprintf("user%d", time.Now().UnixNano()))

		ctx := context.Background()
		_, err := db.Pool.Exec(ctx, "UPDATE users SET role = 'admin' WHERE id = $1", admin.ID)
		require.NoError(t, err)

		accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, admin.ID, "admin")

		httpReq := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/users/%s/dmca-strikes", user.ID.String()), nil)
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}

// ==============================================================================
// Counter-Notice Tests
// ==============================================================================

func TestDMCACounterNotice(t *testing.T) {
	router, dmcaService, _, db, redisClient, jwtManager := setupDMCATestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("SubmitValidCounterNotice", func(t *testing.T) {
		// Setup: Create user, clip, and processed DMCA notice
		ctx := context.Background()
		admin := testutil.CreateTestUser(t, db, fmt.Sprintf("admin%d", time.Now().UnixNano()))
		_, err := db.Pool.Exec(ctx, "UPDATE users SET role = 'admin' WHERE id = $1", admin.ID)
		require.NoError(t, err)

		user := testutil.CreateTestUser(t, db, fmt.Sprintf("user%d", time.Now().UnixNano()))
		clip := testutil.CreateTestClip(t, db, user.ID, "Disputed content")

		// Submit and process takedown
		noticeReq := &models.SubmitDMCANoticeRequest{
			ComplainantName:            "Complainant",
			ComplainantEmail:           "complainant@example.com",
			ComplainantAddress:         "123 Complaint St",
			Relationship:               "owner",
			CopyrightedWorkDescription: "Alleged copyright",
			InfringingURLs:             []string{fmt.Sprintf("https://clipper.example.com/clip/%s", clip.ID.String())},
			GoodFaithStatement:         true,
			AccuracyStatement:          true,
			Signature:                  "Complainant",
		}
		notice, err := dmcaService.SubmitTakedownNotice(ctx, noticeReq, "127.0.0.1", "test")
		require.NoError(t, err)

		err = dmcaService.ReviewNotice(ctx, notice.ID, admin.ID, "valid", nil)
		require.NoError(t, err)

		err = dmcaService.ProcessTakedown(ctx, notice.ID, admin.ID)
		require.NoError(t, err)

		// Submit counter-notice
		counterReq := models.SubmitDMCACounterNoticeRequest{
			DMCANoticeID:          notice.ID,
			UserName:              "Content Creator",
			UserEmail:             "creator@example.com",
			UserAddress:           "456 Creator Ave",
			RemovedMaterialURL:    fmt.Sprintf("https://clipper.example.com/clip/%s", clip.ID.String()),
			GoodFaithStatement:    true,
			ConsentToJurisdiction: true,
			ConsentToService:      true,
			Signature:             "Content Creator",
		}
		body, _ := json.Marshal(counterReq)

		userToken, _ := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/dmca/counter-notice", bytes.NewBuffer(body))
		httpReq.Header.Set("Content-Type", "application/json")
		httpReq.Header.Set("Authorization", "Bearer "+userToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		assert.Equal(t, http.StatusCreated, w.Code)

		var response map[string]interface{}
		err = json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)
		assert.Contains(t, response, "counter_notice_id")
		assert.Contains(t, response, "waiting_period_ends")
	})
}
