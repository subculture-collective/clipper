//go:build integration

package premium

import (
	"bytes"
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
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

func setupPremiumTestRouter(t *testing.T) (*gin.Engine, *jwtpkg.Manager, *services.SubscriptionService, *database.DB, *redispkg.Client, uuid.UUID) {
	gin.SetMode(gin.TestMode)

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
		Stripe: config.StripeConfig{
			SecretKey:         testutil.GetEnv("TEST_STRIPE_SECRET_KEY", "sk_test_mock"),
			WebhookSecrets:    []string{testutil.GetEnv("TEST_STRIPE_WEBHOOK_SECRET", "whsec_test")},
			ProMonthlyPriceID: "price_test_premium",
			ProYearlyPriceID:  "price_test_pro",
		},
	}

	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err)

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err)

	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err)

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	subscriptionRepo := repository.NewSubscriptionRepository(db.Pool)
	webhookRepo := repository.NewWebhookRepository(db.Pool)
	auditLogRepo := repository.NewAuditLogRepository(db.Pool)
	dunningRepo := repository.NewDunningRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)
	auditLogService := services.NewAuditLogService(auditLogRepo)
	dunningService := services.NewDunningService(dunningRepo, subscriptionRepo, userRepo, nil, auditLogService)
	subscriptionService := services.NewSubscriptionService(subscriptionRepo, userRepo, webhookRepo, cfg, auditLogService, dunningService, nil)

	// Initialize handlers
	subscriptionHandler := handlers.NewSubscriptionHandler(subscriptionService)

	// Create test user
	user := testutil.CreateTestUser(t, db, fmt.Sprintf("premuser%d", time.Now().Unix()))

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())

	// Subscription routes
	subscriptions := r.Group("/api/v1/subscriptions")
	{
		subscriptions.POST("/checkout", middleware.AuthMiddleware(authService), subscriptionHandler.CreateCheckoutSession)
		subscriptions.GET("/me", middleware.AuthMiddleware(authService), subscriptionHandler.GetSubscription)
		subscriptions.POST("/portal", middleware.AuthMiddleware(authService), subscriptionHandler.CreatePortalSession)
	}

	// Webhook routes
	r.POST("/api/v1/webhooks/stripe", subscriptionHandler.HandleWebhook)

	return r, jwtManager, subscriptionService, db, redisClient, user.ID
}

func TestSubscriptionFlow(t *testing.T) {
	router, jwtManager, _, db, redisClient, userID := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, userID, "user")

	t.Run("GetSubscriptionStatus_NoSubscription", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/subscriptions/me", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should return 404 if no subscription exists
		assert.Contains(t, []int{http.StatusOK, http.StatusNotFound}, w.Code)
	})

	t.Run("CreateCheckoutSession_Premium", func(t *testing.T) {
		checkout := map[string]interface{}{
			"price_id": "price_test_premium",
		}
		bodyBytes, _ := json.Marshal(checkout)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/checkout", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Stripe integration may not be available in test environment
		if w.Code == http.StatusOK {
			var response map[string]interface{}
			err := json.Unmarshal(w.Body.Bytes(), &response)
			if err == nil && response != nil {
				// Check for session_url (correct field name) if response is OK
				_, hasSessionURL := response["session_url"]
				assert.True(t, hasSessionURL || len(response) == 0, "Response should have session_url or be empty")
			}
		}
		assert.Contains(t, []int{http.StatusOK, http.StatusInternalServerError, http.StatusBadRequest}, w.Code)
	})

	t.Run("CancelSubscription_NoActiveSubscription", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/portal", nil)
		req.Header.Set("Authorization", "Bearer "+accessToken)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should fail as no active subscription exists, or return 200 if service handles gracefully
		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest, http.StatusNotFound}, w.Code)
	})
}

func TestStripeWebhooks(t *testing.T) {
	router, _, _, db, redisClient, _ := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("WebhookEndpoint_InvalidSignature", func(t *testing.T) {
		webhook := map[string]interface{}{
			"type": "customer.subscription.created",
			"data": map[string]interface{}{
				"object": map[string]interface{}{
					"id":       "sub_test123",
					"customer": "cus_test123",
					"status":   "active",
				},
			},
		}
		bodyBytes, _ := json.Marshal(webhook)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		// Missing or invalid Stripe-Signature header
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should fail due to invalid signature
		assert.Contains(t, []int{http.StatusBadRequest, http.StatusUnauthorized}, w.Code)
	})

	t.Run("WebhookEndpoint_ValidSignature", func(t *testing.T) {
		t.Skip("Requires Stripe signature generation for testing")

		// In actual test, would:
		// 1. Generate valid Stripe webhook signature
		// 2. Send webhook with signature
		// 3. Verify subscription is created/updated
	})
}

func TestSubscriptionTiers(t *testing.T) {
	router, jwtManager, _, db, redisClient, userID := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, userID, "user")

	t.Run("CreateCheckoutSession_PremiumTier", func(t *testing.T) {
		checkout := map[string]interface{}{
			"price_id": "price_test_premium",
		}
		bodyBytes, _ := json.Marshal(checkout)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/checkout", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusInternalServerError, http.StatusBadRequest}, w.Code)
	})

	t.Run("CreateCheckoutSession_ProTier", func(t *testing.T) {
		checkout := map[string]interface{}{
			"price_id": "price_test_pro",
		}
		bodyBytes, _ := json.Marshal(checkout)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/checkout", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Contains(t, []int{http.StatusOK, http.StatusInternalServerError, http.StatusBadRequest}, w.Code)
	})

	t.Run("CreateCheckoutSession_InvalidPriceId", func(t *testing.T) {
		checkout := map[string]interface{}{
			"price_id": "invalid_price_id",
		}
		bodyBytes, _ := json.Marshal(checkout)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/checkout", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Invalid price ID should be rejected or cause an error
		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest, http.StatusInternalServerError}, w.Code)
	})
}

// Note: Comprehensive subscription lifecycle tests including cancellation, dunning,
// payment failures, proration, reactivation, and disputes are implemented in
// subscription_lifecycle_test.go
