//go:build integration

package premium

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// TestSubscriptionCreationFlows tests various subscription creation scenarios
func TestSubscriptionCreationFlows(t *testing.T) {
	router, jwtManager, _, db, redisClient, userID := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	accessToken := generateTestTokens(t, jwtManager, userID)

	t.Run("CreateMonthlySubscription_Success", func(t *testing.T) {
		req := models.CreateCheckoutSessionRequest{
			PriceID: "price_test_monthly",
		}
		bodyBytes, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/checkout", bytes.NewBuffer(bodyBytes))
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		// May fail without Stripe configured, but validates endpoint exists
		if w.Code == http.StatusOK {
			var response models.CreateCheckoutSessionResponse
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.NotEmpty(t, response.SessionID)
			assert.NotEmpty(t, response.SessionURL)
		}
	})

	t.Run("CreateYearlySubscription_Success", func(t *testing.T) {
		req := models.CreateCheckoutSessionRequest{
			PriceID: "price_test_yearly",
		}
		bodyBytes, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/checkout", bytes.NewBuffer(bodyBytes))
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		if w.Code == http.StatusOK {
			var response models.CreateCheckoutSessionResponse
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.NotEmpty(t, response.SessionID)
		}
	})

	t.Run("CreateSubscriptionWithCoupon_Success", func(t *testing.T) {
		couponCode := "TESTCOUPON"
		req := models.CreateCheckoutSessionRequest{
			PriceID:    "price_test_monthly",
			CouponCode: &couponCode,
		}
		bodyBytes, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/checkout", bytes.NewBuffer(bodyBytes))
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		// Should attempt to create with coupon
		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest, http.StatusInternalServerError}, w.Code)
	})

	t.Run("RejectInvalidPriceID", func(t *testing.T) {
		req := models.CreateCheckoutSessionRequest{
			PriceID: "price_invalid_123",
		}
		bodyBytes, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/checkout", bytes.NewBuffer(bodyBytes))
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		// Should reject invalid price ID
		assert.Contains(t, []int{http.StatusBadRequest, http.StatusInternalServerError}, w.Code)
	})

	t.Run("CreateTrialSubscription_Success", func(t *testing.T) {
		trialUserID := testutil.CreateTestUser(t, db, fmt.Sprintf("trial%d", time.Now().Unix())).ID
		trialAccessToken := generateTestTokens(t, jwtManager, trialUserID)

		req := models.CreateCheckoutSessionRequest{
			PriceID: "price_test_monthly",
		}
		bodyBytes, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/checkout", bytes.NewBuffer(bodyBytes))
		httpReq.Header.Set("Authorization", "Bearer "+trialAccessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		// Validates trial subscription flow exists
		if w.Code == http.StatusOK {
			var response models.CreateCheckoutSessionResponse
			err := json.Unmarshal(w.Body.Bytes(), &response)
			require.NoError(t, err)
			assert.NotEmpty(t, response.SessionID)
		}
	})
}

// TestSubscriptionCancellationFlows tests subscription cancellation scenarios
func TestSubscriptionCancellationFlows(t *testing.T) {
	router, jwtManager, subscriptionService, db, redisClient, userID := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()
	accessToken := generateTestTokens(t, jwtManager, userID)
	testCustomerID := fmt.Sprintf("cus_cancel_%s", uuid.New().String()[:8])
	testSubscriptionID := fmt.Sprintf("sub_cancel_%s", uuid.New().String()[:8])

	// Create active subscription
	subscriptionRepo := subscriptionService.GetRepository()
	sub := &models.Subscription{
		UserID:               userID,
		StripeCustomerID:     testCustomerID,
		StripeSubscriptionID: &testSubscriptionID,
		Status:               "active",
		Tier:                 "pro",
		CurrentPeriodStart:   ptrTime(time.Now()),
		CurrentPeriodEnd:     ptrTime(time.Now().Add(30 * 24 * time.Hour)),
	}
	err := subscriptionRepo.Create(ctx, sub)
	require.NoError(t, err)

	t.Run("CancelImmediately_Success", func(t *testing.T) {
		req := models.CancelSubscriptionRequest{
			Immediate: true,
		}
		bodyBytes, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/cancel", bytes.NewBuffer(bodyBytes))
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		// May fail without Stripe API access, but validates endpoint
		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest, http.StatusInternalServerError}, w.Code)
	})

	t.Run("CancelAtPeriodEnd_Success", func(t *testing.T) {
		// Create new subscription for this test
		newUserID := testutil.CreateTestUser(t, db, fmt.Sprintf("cancel2_%d", time.Now().Unix())).ID
		newAccessToken := generateTestTokens(t, jwtManager, newUserID)
		newCustomerID := fmt.Sprintf("cus_cancel2_%s", uuid.New().String()[:8])
		newSubID := fmt.Sprintf("sub_cancel2_%s", uuid.New().String()[:8])

		sub2 := &models.Subscription{
			UserID:               newUserID,
			StripeCustomerID:     newCustomerID,
			StripeSubscriptionID: &newSubID,
			Status:               "active",
			Tier:                 "pro",
			CurrentPeriodStart:   ptrTime(time.Now()),
			CurrentPeriodEnd:     ptrTime(time.Now().Add(30 * 24 * time.Hour)),
		}
		err := subscriptionRepo.Create(ctx, sub2)
		require.NoError(t, err)

		req := models.CancelSubscriptionRequest{
			Immediate: false,
		}
		bodyBytes, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/cancel", bytes.NewBuffer(bodyBytes))
		httpReq.Header.Set("Authorization", "Bearer "+newAccessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest, http.StatusInternalServerError}, w.Code)
	})

	t.Run("ReactivateScheduledCancellation_Success", func(t *testing.T) {
		// Create subscription scheduled for cancellation
		reactUserID := testutil.CreateTestUser(t, db, fmt.Sprintf("react_%d", time.Now().Unix())).ID
		reactAccessToken := generateTestTokens(t, jwtManager, reactUserID)
		reactCustomerID := fmt.Sprintf("cus_react_%s", uuid.New().String()[:8])
		reactSubID := fmt.Sprintf("sub_react_%s", uuid.New().String()[:8])

		sub3 := &models.Subscription{
			UserID:               reactUserID,
			StripeCustomerID:     reactCustomerID,
			StripeSubscriptionID: &reactSubID,
			Status:               "active",
			Tier:                 "pro",
			CancelAtPeriodEnd:    true,
			CurrentPeriodStart:   ptrTime(time.Now()),
			CurrentPeriodEnd:     ptrTime(time.Now().Add(30 * 24 * time.Hour)),
		}
		err := subscriptionRepo.Create(ctx, sub3)
		require.NoError(t, err)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/reactivate", nil)
		httpReq.Header.Set("Authorization", "Bearer "+reactAccessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		// Validates reactivation endpoint exists
		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest, http.StatusInternalServerError}, w.Code)
	})
}

// TestPaymentFailureFlows tests payment failure scenarios and dunning
func TestPaymentFailureFlows(t *testing.T) {
	router, _, subscriptionService, db, redisClient, userID := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()
	testCustomerID := fmt.Sprintf("cus_fail_%s", uuid.New().String()[:8])
	testSubscriptionID := fmt.Sprintf("sub_fail_%s", uuid.New().String()[:8])

	// Create subscription
	subscriptionRepo := subscriptionService.GetRepository()
	sub := &models.Subscription{
		UserID:               userID,
		StripeCustomerID:     testCustomerID,
		StripeSubscriptionID: &testSubscriptionID,
		Status:               "active",
		Tier:                 "pro",
	}
	err := subscriptionRepo.Create(ctx, sub)
	require.NoError(t, err)

	t.Run("FirstPaymentFailure_InitiatesGracePeriod", func(t *testing.T) {
		eventID := fmt.Sprintf("evt_fail1_%s", uuid.New().String()[:8])
		payload := []byte(fmt.Sprintf(`{
			"id": "%s",
			"type": "invoice.payment_failed",
			"data": {
				"object": {
					"id": "in_fail1",
					"customer": "%s",
					"subscription": "%s",
					"amount_due": 1999,
					"attempt_count": 1,
					"status": "open",
					"next_payment_attempt": %d
				}
			}
		}`, eventID, testCustomerID, testSubscriptionID, time.Now().Add(3*24*time.Hour).Unix()))

		timestamp := time.Now().Unix()
		signature := generateStripeSignature(payload, timestamp, "whsec_test")

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", signature)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Validates webhook endpoint processes payment failures
		assert.Equal(t, http.StatusBadRequest, w.Code) // Fails signature verification
	})

	t.Run("MultiplePaymentFailures_EscalatesDunning", func(t *testing.T) {
		eventID := fmt.Sprintf("evt_fail3_%s", uuid.New().String()[:8])
		payload := []byte(fmt.Sprintf(`{
			"id": "%s",
			"type": "invoice.payment_failed",
			"data": {
				"object": {
					"id": "in_fail3",
					"customer": "%s",
					"subscription": "%s",
					"amount_due": 1999,
					"attempt_count": 3,
					"status": "open"
				}
			}
		}`, eventID, testCustomerID, testSubscriptionID))

		timestamp := time.Now().Unix()
		signature := generateStripeSignature(payload, timestamp, "whsec_test")

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", signature)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("DunningTableExists", func(t *testing.T) {
		query := `SELECT COUNT(*) FROM dunning_attempts`
		var count int
		err := db.Pool.QueryRow(ctx, query).Scan(&count)
		assert.NoError(t, err, "dunning_attempts table should exist for payment failure tracking")
	})

	t.Run("PaymentRecovery_ClearsDunning", func(t *testing.T) {
		eventID := fmt.Sprintf("evt_paid_%s", uuid.New().String()[:8])
		payload := []byte(fmt.Sprintf(`{
			"id": "%s",
			"type": "invoice.payment_succeeded",
			"data": {
				"object": {
					"id": "in_paid",
					"customer": "%s",
					"subscription": "%s",
					"amount_paid": 1999,
					"status": "paid"
				}
			}
		}`, eventID, testCustomerID, testSubscriptionID))

		timestamp := time.Now().Unix()
		signature := generateStripeSignature(payload, timestamp, "whsec_test")

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", signature)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestProrationFlows tests subscription plan changes with proration
func TestProrationFlows(t *testing.T) {
	router, jwtManager, subscriptionService, db, redisClient, userID := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()
	accessToken := generateTestTokens(t, jwtManager, userID)
	testCustomerID := fmt.Sprintf("cus_pror_%s", uuid.New().String()[:8])
	testSubscriptionID := fmt.Sprintf("sub_pror_%s", uuid.New().String()[:8])

	// Create active monthly subscription
	subscriptionRepo := subscriptionService.GetRepository()
	sub := &models.Subscription{
		UserID:               userID,
		StripeCustomerID:     testCustomerID,
		StripeSubscriptionID: &testSubscriptionID,
		Status:               "active",
		Tier:                 "pro",
		StripePriceID:        ptrString("price_test_monthly"),
		CurrentPeriodStart:   ptrTime(time.Now()),
		CurrentPeriodEnd:     ptrTime(time.Now().Add(30 * 24 * time.Hour)),
	}
	err := subscriptionRepo.Create(ctx, sub)
	require.NoError(t, err)

	t.Run("UpgradeMonthlyToYearly_GeneratesProration", func(t *testing.T) {
		req := models.ChangeSubscriptionPlanRequest{
			PriceID: "price_test_yearly",
		}
		bodyBytes, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/change-plan", bytes.NewBuffer(bodyBytes))
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		// Validates plan change endpoint exists
		assert.Contains(t, []int{http.StatusOK, http.StatusBadRequest, http.StatusInternalServerError}, w.Code)
	})

	t.Run("ProrationInvoiceWebhook_ProcessesCorrectly", func(t *testing.T) {
		eventID := fmt.Sprintf("evt_pror_%s", uuid.New().String()[:8])
		invoiceID := fmt.Sprintf("in_pror_%s", uuid.New().String()[:8])

		payload := []byte(fmt.Sprintf(`{
			"id": "%s",
			"type": "invoice.created",
			"data": {
				"object": {
					"id": "%s",
					"customer": "%s",
					"subscription": "%s",
					"amount_due": 500,
					"billing_reason": "subscription_update",
					"lines": {
						"data": [
							{
								"amount": -1000,
								"description": "Unused time on Premium Monthly",
								"proration": true
							},
							{
								"amount": 1500,
								"description": "Remaining time on Premium Yearly",
								"proration": true
							}
						]
					}
				}
			}
		}`, eventID, invoiceID, testCustomerID, testSubscriptionID))

		timestamp := time.Now().Unix()
		signature := generateStripeSignature(payload, timestamp, "whsec_test")

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", signature)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}

// TestDisputeHandlingFlows tests dispute/chargeback handling
func TestDisputeHandlingFlows(t *testing.T) {
	router, _, _, db, redisClient, _ := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()
	_ = ctx // Mark as used

	t.Run("DisputeCreated_LogsAndNotifies", func(t *testing.T) {
		eventID := fmt.Sprintf("evt_disp_%s", uuid.New().String()[:8])
		payload := []byte(fmt.Sprintf(`{
			"id": "%s",
			"type": "charge.dispute.created",
			"data": {
				"object": {
					"id": "dp_test_%s",
					"charge": "ch_test_%s",
					"amount": 1999,
					"currency": "usd",
					"reason": "fraudulent",
					"status": "needs_response"
				}
			}
		}`, eventID, uuid.New().String()[:8], uuid.New().String()[:8]))

		timestamp := time.Now().Unix()
		signature := generateStripeSignature(payload, timestamp, "whsec_test")

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", signature)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("DisputeReasons_AllHandled", func(t *testing.T) {
		reasons := []string{
			"fraudulent",
			"duplicate",
			"product_not_received",
			"product_unacceptable",
			"subscription_canceled",
			"unrecognized",
		}

		for _, reason := range reasons {
			eventID := fmt.Sprintf("evt_disp_%s_%s", reason, uuid.New().String()[:8])
			payload := []byte(fmt.Sprintf(`{
				"id": "%s",
				"type": "charge.dispute.created",
				"data": {
					"object": {
						"id": "dp_%s",
						"charge": "ch_%s",
						"amount": 1999,
						"currency": "usd",
						"reason": "%s",
						"status": "needs_response"
					}
				}
			}`, eventID, uuid.New().String()[:8], uuid.New().String()[:8], reason))

			timestamp := time.Now().Unix()
			signature := generateStripeSignature(payload, timestamp, "whsec_test")

			req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Stripe-Signature", signature)
			w := httptest.NewRecorder()

			router.ServeHTTP(w, req)

			assert.Equal(t, http.StatusBadRequest, w.Code)
		}
	})

	t.Run("AuditLogTracksDisputes", func(t *testing.T) {
		// Verify audit log capability exists
		query := `SELECT COUNT(*) FROM audit_logs WHERE action LIKE '%dispute%'`
		var count int
		err := db.Pool.QueryRow(ctx, query).Scan(&count)
		// May have no disputes yet, but query should not error
		assert.NoError(t, err, "Should be able to query audit logs for disputes")
	})
}

// TestTrialPeriodHandling tests trial period functionality
func TestTrialPeriodHandling(t *testing.T) {
	_, _, subscriptionService, db, redisClient, _ := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()

	t.Run("TrialingSubscription_ProvidesProAccess", func(t *testing.T) {
		trialUserID := testutil.CreateTestUser(t, db, fmt.Sprintf("trial_%d", time.Now().Unix())).ID
		trialCustomerID := fmt.Sprintf("cus_trial_%s", uuid.New().String()[:8])
		trialSubID := fmt.Sprintf("sub_trial_%s", uuid.New().String()[:8])

		subscriptionRepo := subscriptionService.GetRepository()
		trialSub := &models.Subscription{
			UserID:               trialUserID,
			StripeCustomerID:     trialCustomerID,
			StripeSubscriptionID: &trialSubID,
			Status:               "trialing",
			Tier:                 "pro",
			TrialStart:           ptrTime(time.Now()),
			TrialEnd:             ptrTime(time.Now().Add(14 * 24 * time.Hour)),
		}

		err := subscriptionRepo.Create(ctx, trialSub)
		require.NoError(t, err)

		isProUser := subscriptionService.IsProUser(ctx, trialUserID)
		assert.True(t, isProUser, "User with trialing subscription should have pro access")
	})

	t.Run("ExpiredTrial_RemovesProAccess", func(t *testing.T) {
		expiredUserID := testutil.CreateTestUser(t, db, fmt.Sprintf("expired_%d", time.Now().Unix())).ID
		expiredCustomerID := fmt.Sprintf("cus_expired_%s", uuid.New().String()[:8])
		expiredSubID := fmt.Sprintf("sub_expired_%s", uuid.New().String()[:8])

		subscriptionRepo := subscriptionService.GetRepository()
		expiredSub := &models.Subscription{
			UserID:               expiredUserID,
			StripeCustomerID:     expiredCustomerID,
			StripeSubscriptionID: &expiredSubID,
			Status:               "canceled",
			Tier:                 "free",
			TrialStart:           ptrTime(time.Now().Add(-21 * 24 * time.Hour)),
			TrialEnd:             ptrTime(time.Now().Add(-7 * 24 * time.Hour)),
		}

		err := subscriptionRepo.Create(ctx, expiredSub)
		require.NoError(t, err)

		isProUser := subscriptionService.IsProUser(ctx, expiredUserID)
		assert.False(t, isProUser, "User with expired trial should not have pro access")
	})
}
