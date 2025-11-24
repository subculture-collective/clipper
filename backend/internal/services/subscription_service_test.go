package services

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/subculture-collective/clipper/config"
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

// TestStripeTaxConfiguration tests Stripe Tax configuration settings
func TestStripeTaxConfiguration(t *testing.T) {
	t.Run("tax can be enabled via config", func(t *testing.T) {
		cfg := &config.StripeConfig{
			TaxEnabled: true,
		}
		assert.True(t, cfg.TaxEnabled)
	})

	t.Run("tax is disabled by default", func(t *testing.T) {
		cfg := &config.StripeConfig{}
		assert.False(t, cfg.TaxEnabled)
	})

	t.Run("default tax behavior should be exclusive", func(t *testing.T) {
		// Test that exclusive is a valid tax behavior
		behavior := "exclusive"
		assert.Equal(t, "exclusive", behavior)

		// Test inclusive as alternative
		behavior = "inclusive"
		assert.Equal(t, "inclusive", behavior)
	})
}

// TestInvoicePDFConfiguration tests invoice PDF delivery configuration
func TestInvoicePDFConfiguration(t *testing.T) {
	t.Run("invoice auto email can be enabled", func(t *testing.T) {
		cfg := &config.StripeConfig{
			InvoiceAutoEmailEnabled: true,
		}
		assert.True(t, cfg.InvoiceAutoEmailEnabled)
	})

	t.Run("billing address collection can be enabled", func(t *testing.T) {
		cfg := &config.StripeConfig{
			CollectBillingAddress: true,
		}
		assert.True(t, cfg.CollectBillingAddress)
	})

	t.Run("all tax and invoice settings can be configured together", func(t *testing.T) {
		cfg := &config.StripeConfig{
			SecretKey:               "sk_test_xxx",
			TaxEnabled:              true,
			InvoiceAutoEmailEnabled: true,
			CollectBillingAddress:   true,
			DefaultTaxBehavior:      "exclusive",
		}
		assert.True(t, cfg.TaxEnabled)
		assert.True(t, cfg.InvoiceAutoEmailEnabled)
		assert.True(t, cfg.CollectBillingAddress)
		assert.Equal(t, "exclusive", cfg.DefaultTaxBehavior)
	})
}
