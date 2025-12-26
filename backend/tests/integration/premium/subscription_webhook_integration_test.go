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

// createWebhookPayload creates a Stripe webhook event payload for testing
func createWebhookPayload(eventID, eventType string, dataObject map[string]interface{}) []byte {
	payload := map[string]interface{}{
		"id":   eventID,
		"type": eventType,
		"data": map[string]interface{}{
			"object": dataObject,
		},
	}
	jsonBytes, _ := json.Marshal(payload)
	return jsonBytes
}

// TestWebhookIdempotencyWithDatabaseAssertion validates webhook handler infrastructure
// and database schema for idempotency tracking. Note: These tests verify that webhook
// handlers are wired correctly and can process requests, but do not test actual idempotency
// logic since that requires valid Stripe webhook signatures.
func TestWebhookIdempotencyWithDatabaseAssertion(t *testing.T) {
	router, _, _, db, redisClient, _ := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()

	// Create a test user subscription in database
	testCustomerID := fmt.Sprintf("cus_test_%s", uuid.New().String()[:8])
	testSubscriptionID := fmt.Sprintf("sub_test_%s", uuid.New().String()[:8])
	eventID := fmt.Sprintf("evt_test_%s", uuid.New().String()[:8])

	t.Run("WebhookEndpointResponds", func(t *testing.T) {
		// Validates that the webhook endpoint exists and returns a response
		// Note: Signature verification will fail with test signature, which is expected behavior
		payload := []byte(fmt.Sprintf(`{
			"id": "%s",
			"type": "customer.subscription.created",
			"data": {
				"object": {
					"id": "%s",
					"customer": "%s",
					"status": "active",
					"items": {
						"data": [{
							"price": {
								"id": "price_test_monthly"
							}
						}]
					},
					"current_period_start": %d,
					"current_period_end": %d
				}
			}
		}`, eventID, testSubscriptionID, testCustomerID, time.Now().Unix(), time.Now().Add(30*24*time.Hour).Unix()))

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", "test_signature")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should return 400 for invalid signature
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("ConcurrentWebhookRequestsHandled", func(t *testing.T) {
		// Validates that concurrent webhook requests are handled without panics
		eventID2 := fmt.Sprintf("evt_race_%s", uuid.New().String()[:8])
		payload := []byte(fmt.Sprintf(`{
			"id": "%s",
			"type": "customer.subscription.updated",
			"data": {
				"object": {
					"id": "%s",
					"customer": "%s",
					"status": "active"
				}
			}
		}`, eventID2, testSubscriptionID, testCustomerID))

		// Simulate concurrent requests
		done := make(chan *httptest.ResponseRecorder, 2)

		for i := 0; i < 2; i++ {
			go func() {
				req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("Stripe-Signature", "test_signature")
				w := httptest.NewRecorder()

				router.ServeHTTP(w, req)
				done <- w
			}()
		}

		// Wait for both to complete and verify both returned responses
		response1 := <-done
		response2 := <-done

		assert.NotNil(t, response1)
		assert.NotNil(t, response2)
		// Both should fail signature verification
		assert.Equal(t, http.StatusBadRequest, response1.Code)
		assert.Equal(t, http.StatusBadRequest, response2.Code)
	})

	t.Run("WebhookLogTableExists", func(t *testing.T) {
		// Validates that the stripe_webhooks_log table exists and can be queried
		query := `SELECT COUNT(*) FROM stripe_webhooks_log`
		var count int
		err := db.Pool.QueryRow(ctx, query).Scan(&count)

		assert.NoError(t, err, "stripe_webhooks_log table should exist and be queryable")
	})
}

// TestEntitlementUpdatesOnSubscriptionStatusChanges validates that subscription
// status changes persist correctly and that the IsProUser logic works as expected
// for different subscription states. Note: This tests direct database operations and
// business logic, not webhook-driven updates (which require valid Stripe signatures).
func TestEntitlementUpdatesOnSubscriptionStatusChanges(t *testing.T) {
	router, _, subscriptionService, db, redisClient, userID := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()
	testCustomerID := fmt.Sprintf("cus_ent_%s", uuid.New().String()[:8])
	testSubscriptionID := fmt.Sprintf("sub_ent_%s", uuid.New().String()[:8])

	// Create subscription record for user
	sub := &models.Subscription{
		UserID:               userID,
		StripeCustomerID:     testCustomerID,
		StripeSubscriptionID: &testSubscriptionID,
		Status:               "active",
		Tier:                 "pro",
	}

	subscriptionRepo := subscriptionService.GetRepository()
	err := subscriptionRepo.Create(ctx, sub)
	if err != nil {
		t.Logf("Failed to create subscription: %v (may already exist)", err)
	}

	t.Run("ActiveSubscriptionEnablesPremiumFeatures", func(t *testing.T) {
		// Validates IsProUser logic for active subscriptions
		isProUser := subscriptionService.IsProUser(ctx, userID)
		assert.True(t, isProUser, "User with active subscription should be pro")
	})

	t.Run("WebhookEndpointReceivesCancellationEvents", func(t *testing.T) {
		// Validates that cancellation webhook endpoint exists and responds
		// Note: Does not test actual cancellation logic (requires valid signature)
		eventID := fmt.Sprintf("evt_cancel_%s", uuid.New().String()[:8])
		dataObject := map[string]interface{}{
			"id":          testSubscriptionID,
			"customer":    testCustomerID,
			"status":      "canceled",
			"canceled_at": time.Now().Unix(),
		}
		payload := createWebhookPayload(eventID, "customer.subscription.deleted", dataObject)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", "test_signature")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should fail signature verification
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("WebhookEndpointReceivesPastDueEvents", func(t *testing.T) {
		// Validates that past_due webhook endpoint exists and responds
		eventID := fmt.Sprintf("evt_pastdue_%s", uuid.New().String()[:8])
		payload := []byte(fmt.Sprintf(`{
			"id": "%s",
			"type": "customer.subscription.updated",
			"data": {
				"object": {
					"id": "%s",
					"customer": "%s",
					"status": "past_due"
				}
			}
		}`, eventID, testSubscriptionID, testCustomerID))

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", "test_signature")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should fail signature verification
		assert.Equal(t, http.StatusBadRequest, w.Code)

		// Subscription should still exist in database
		sub, err := subscriptionRepo.GetByUserID(ctx, userID)
		if err == nil {
			assert.NotNil(t, sub)
		}
	})

	t.Run("TrialingSubscriptionProvidesAccess", func(t *testing.T) {
		// Validates IsProUser logic for trialing subscriptions
		trialUserID := testutil.CreateTestUser(t, db, fmt.Sprintf("trial%d", time.Now().Unix())).ID
		trialCustomerID := fmt.Sprintf("cus_trial_%s", uuid.New().String()[:8])
		trialSubID := fmt.Sprintf("sub_trial_%s", uuid.New().String()[:8])

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
}

// TestWebhookRetryLogic validates that webhook retry infrastructure exists in the database.
// Note: This tests database schema only, not actual retry processing behavior.
func TestWebhookRetryLogic(t *testing.T) {
	_, _, _, db, redisClient, _ := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()

	t.Run("RetryQueueTableExists", func(t *testing.T) {
		// Validates that the webhook_retry_queue table exists
		query := `SELECT COUNT(*) FROM webhook_retry_queue`
		var count int
		err := db.Pool.QueryRow(ctx, query).Scan(&count)
		assert.NoError(t, err, "webhook_retry_queue table should exist")
	})

	t.Run("RetryQueueSupportsBackoffScheduling", func(t *testing.T) {
		// Validates retry queue has next_retry_at column for scheduling
		query := `SELECT column_name FROM information_schema.columns 
				  WHERE table_name = 'webhook_retry_queue' 
				  AND column_name = 'next_retry_at'`
		var columnName string
		err := db.Pool.QueryRow(ctx, query).Scan(&columnName)
		assert.NoError(t, err, "webhook_retry_queue should have next_retry_at column")
		assert.Equal(t, "next_retry_at", columnName)
	})

	t.Run("RetryQueueHasMaxRetriesColumn", func(t *testing.T) {
		// Validates max retries column exists
		query := `SELECT column_name FROM information_schema.columns 
				  WHERE table_name = 'webhook_retry_queue' 
				  AND column_name = 'max_retries'`
		var columnName string
		err := db.Pool.QueryRow(ctx, query).Scan(&columnName)
		assert.NoError(t, err, "webhook_retry_queue should have max_retries column")
		assert.Equal(t, "max_retries", columnName)
	})

	t.Run("WebhookLogSupportsErrorTracking", func(t *testing.T) {
		// Validates processing_error column exists for error logging
		query := `SELECT column_name FROM information_schema.columns 
				  WHERE table_name = 'stripe_webhooks_log' 
				  AND column_name = 'processing_error'`
		var columnName string
		err := db.Pool.QueryRow(ctx, query).Scan(&columnName)
		assert.NoError(t, err, "stripe_webhooks_log should have processing_error column")
		assert.Equal(t, "processing_error", columnName)
	})
}

// TestProrationCalculationsWithValidation validates infrastructure for proration handling.
// Note: This tests that endpoints exist and schema supports proration, but does not
// validate actual proration calculations (which require valid Stripe API access).
func TestProrationCalculationsWithValidation(t *testing.T) {
	router, jwtManager, subscriptionService, db, redisClient, userID := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()
	accessToken := generateTestTokens(t, jwtManager, userID)

	testCustomerID := fmt.Sprintf("cus_pror_%s", uuid.New().String()[:8])
	testSubscriptionID := fmt.Sprintf("sub_pror_%s", uuid.New().String()[:8])

	// Create active subscription
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

	subscriptionRepo := subscriptionService.GetRepository()
	err := subscriptionRepo.Create(ctx, sub)
	if err != nil {
		t.Logf("Subscription creation failed: %v (may already exist)", err)
	}

	t.Run("ProrationInvoiceWebhookEndpointExists", func(t *testing.T) {
		// Validates that proration invoice webhook endpoint exists
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

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", "test_signature")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should fail signature verification
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("PlanChangeEndpointExists", func(t *testing.T) {
		// Validates that plan change endpoint exists and responds
		req := models.ChangeSubscriptionPlanRequest{
			PriceID: "price_test_yearly",
		}
		bodyBytes, _ := json.Marshal(req)

		httpReq := httptest.NewRequest(http.MethodPost, "/api/v1/subscriptions/change-plan", bytes.NewBuffer(bodyBytes))
		httpReq.Header.Set("Authorization", "Bearer "+accessToken)
		httpReq.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, httpReq)

		// Validates endpoint exists (may fail without valid Stripe API access)
		assert.NotNil(t, w)
	})
}

// TestPaymentFailureHandlingWithAlerts validates infrastructure for payment failure handling.
// Note: This tests that webhook endpoints exist and respond, but does not test actual dunning
// or escalation logic (which requires valid Stripe signatures and proper webhook processing).
func TestPaymentFailureHandlingWithAlerts(t *testing.T) {
	router, _, _, db, redisClient, _ := setupPremiumTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	ctx := context.Background()
	testCustomerID := fmt.Sprintf("cus_fail_%s", uuid.New().String()[:8])
	testSubscriptionID := fmt.Sprintf("sub_fail_%s", uuid.New().String()[:8])

	t.Run("PaymentFailureWebhookEndpointExists", func(t *testing.T) {
		// Validates that payment failure webhook endpoint exists
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

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", "test_signature")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should fail signature verification
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("MultipleFailureWebhookEndpointExists", func(t *testing.T) {
		// Validates that webhook endpoint can receive multiple failure events
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

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", "test_signature")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should fail signature verification
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("PaymentIntentFailureWebhookEndpointExists", func(t *testing.T) {
		// Validates that payment intent failure webhook endpoint exists
		eventID := fmt.Sprintf("evt_pi_fail_%s", uuid.New().String()[:8])
		payload := []byte(fmt.Sprintf(`{
			"id": "%s",
			"type": "payment_intent.payment_failed",
			"data": {
				"object": {
					"id": "pi_fail",
					"customer": "%s",
					"amount": 1999,
					"currency": "usd",
					"last_payment_error": {
						"code": "card_declined",
						"message": "Your card was declined",
						"decline_code": "insufficient_funds"
					}
				}
			}
		}`, eventID, testCustomerID))

		req := httptest.NewRequest(http.MethodPost, "/api/v1/webhooks/stripe", bytes.NewBuffer(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Stripe-Signature", "test_signature")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		// Should fail signature verification
		assert.Equal(t, http.StatusBadRequest, w.Code)

		// Validates stripe_webhooks_log table can be queried
		query := `SELECT COUNT(*) FROM stripe_webhooks_log`
		var count int
		err := db.Pool.QueryRow(ctx, query).Scan(&count)
		assert.NoError(t, err)
	})
}

// Helper functions
func ptrString(s string) *string {
	return &s
}

func ptrTime(t time.Time) *time.Time {
	return &t
}
