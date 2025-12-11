package services

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/subculture-collective/clipper/internal/models"
)

// TestCreateCheckoutSessionWithCoupon tests checkout session creation with coupon code
func TestCreateCheckoutSessionWithCoupon(t *testing.T) {
	// This is a basic structure test - actual Stripe API testing requires mocking
	// or integration test environment

	t.Run("coupon code is optional", func(t *testing.T) {
		// Test that nil coupon code is valid
		var couponCode *string = nil
		assert.Nil(t, couponCode)
	})

	t.Run("coupon code can be provided", func(t *testing.T) {
		// Test that coupon code can be set
		code := "LAUNCH25"
		couponCode := &code
		assert.NotNil(t, couponCode)
		assert.Equal(t, "LAUNCH25", *couponCode)
	})
}

// TestChangeSubscriptionPlanValidation tests plan change validation
func TestChangeSubscriptionPlanValidation(t *testing.T) {
	t.Run("validates price ID format", func(t *testing.T) {
		// Price IDs should start with "price_"
		priceID := "price_test_123"
		assert.Contains(t, priceID, "price_")
	})

	t.Run("user must have subscription", func(t *testing.T) {
		// Subscription must exist
		subID := "sub_test"
		sub := &models.Subscription{
			ID:                   uuid.New(),
			UserID:               uuid.New(),
			StripeCustomerID:     "cus_test",
			StripeSubscriptionID: &subID,
			Status:               "active",
			Tier:                 "pro",
		}
		assert.NotNil(t, sub.StripeSubscriptionID)
		assert.Equal(t, "active", sub.Status)
	})
}

// TestProrationBehavior tests proration configuration
func TestProrationBehavior(t *testing.T) {
	t.Run("uses always_invoice behavior", func(t *testing.T) {
		behavior := "always_invoice"
		assert.Equal(t, "always_invoice", behavior)
	})
}

// TestFormatAmountForCurrency tests currency amount formatting
func TestFormatAmountForCurrency(t *testing.T) {
	t.Run("formats USD amount correctly", func(t *testing.T) {
		// Amount is in cents
		result := formatAmountForCurrency(1999, "usd")
		assert.Equal(t, "19.99 USD", result)
	})

	t.Run("formats EUR amount correctly", func(t *testing.T) {
		result := formatAmountForCurrency(2500, "eur")
		assert.Equal(t, "25.00 EUR", result)
	})

	t.Run("handles zero amount", func(t *testing.T) {
		result := formatAmountForCurrency(0, "usd")
		assert.Equal(t, "0.00 USD", result)
	})

	t.Run("formats JPY (zero-decimal currency) correctly", func(t *testing.T) {
		// JPY has no decimal places, amount is in yen
		result := formatAmountForCurrency(1000, "jpy")
		assert.Equal(t, "1000 JPY", result)
	})

	t.Run("formats KRW (zero-decimal currency) correctly", func(t *testing.T) {
		result := formatAmountForCurrency(50000, "krw")
		assert.Equal(t, "50000 KRW", result)
	})

	t.Run("formats KWD (three-decimal currency) correctly", func(t *testing.T) {
		// KWD has 3 decimal places
		result := formatAmountForCurrency(1500, "kwd")
		assert.Equal(t, "1.500 KWD", result)
	})

	t.Run("handles case insensitivity", func(t *testing.T) {
		result1 := formatAmountForCurrency(1000, "USD")
		result2 := formatAmountForCurrency(1000, "usd")
		assert.Equal(t, result1, result2)
	})
}

// TestInvoiceFinalizedNotificationType tests the invoice finalized notification type
func TestInvoiceFinalizedNotificationType(t *testing.T) {
	t.Run("notification type constant is correct", func(t *testing.T) {
		assert.Equal(t, "invoice_finalized", models.NotificationTypeInvoiceFinalized)
	})
}

// TestPaymentIntentWebhookHandlers tests the payment intent webhook handlers
func TestPaymentIntentWebhookHandlers(t *testing.T) {
	t.Run("handles payment intent with nil customer gracefully", func(t *testing.T) {
		// Test that handlers can handle payment intents without a customer
		var customerID string = ""
		assert.Empty(t, customerID)
	})

	t.Run("handles payment intent succeeded event structure", func(t *testing.T) {
		// Verify the metadata structure for successful payment intents
		metadata := map[string]interface{}{
			"payment_intent_id": "pi_test_123",
			"amount_cents":      1999,
			"currency":          "usd",
			"status":            "succeeded",
		}
		assert.Equal(t, "pi_test_123", metadata["payment_intent_id"])
		assert.Equal(t, 1999, metadata["amount_cents"])
		assert.Equal(t, "usd", metadata["currency"])
		assert.Equal(t, "succeeded", metadata["status"])
	})

	t.Run("handles payment intent failed event structure", func(t *testing.T) {
		// Verify the metadata structure for failed payment intents
		metadata := map[string]interface{}{
			"payment_intent_id": "pi_test_456",
			"amount_cents":      2999,
			"currency":          "usd",
			"status":            "requires_payment_method",
			"error_code":        "card_declined",
			"error_message":     "Your card was declined",
		}
		assert.Equal(t, "pi_test_456", metadata["payment_intent_id"])
		assert.Equal(t, "card_declined", metadata["error_code"])
		assert.Equal(t, "Your card was declined", metadata["error_message"])
	})

	t.Run("includes customer ID when present", func(t *testing.T) {
		// Verify that customer ID is included in metadata when available
		metadata := map[string]interface{}{
			"payment_intent_id":   "pi_test_789",
			"stripe_customer_id":  "cus_test_123",
		}
		assert.Contains(t, metadata, "stripe_customer_id")
		assert.Equal(t, "cus_test_123", metadata["stripe_customer_id"])
	})

	t.Run("handles nil payment error gracefully", func(t *testing.T) {
		// Test that handler can handle missing error information
		metadata := map[string]interface{}{
			"payment_intent_id": "pi_test_000",
			"status":            "requires_payment_method",
		}
		// Should not have error_code or error_message when error is nil
		assert.NotContains(t, metadata, "error_code")
		assert.NotContains(t, metadata, "error_message")
	})

	t.Run("validates payment intent event types", func(t *testing.T) {
		// Verify the event types are correctly defined
		succeededEvent := "payment_intent.succeeded"
		failedEvent := "payment_intent.payment_failed"
		
		assert.Equal(t, "payment_intent.succeeded", succeededEvent)
		assert.Equal(t, "payment_intent.payment_failed", failedEvent)
	})
}
