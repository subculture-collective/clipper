package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v81"
	portalsession "github.com/stripe/stripe-go/v81/billingportal/session"
	"github.com/stripe/stripe-go/v81/checkout/session"
	"github.com/stripe/stripe-go/v81/customer"
	"github.com/stripe/stripe-go/v81/subscription"
	"github.com/stripe/stripe-go/v81/webhook"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
)

var (
	// ErrSubscriptionNotFound indicates the subscription was not found
	ErrSubscriptionNotFound = errors.New("subscription not found")
	// ErrInvalidPriceID indicates an invalid price ID was provided
	ErrInvalidPriceID = errors.New("invalid price ID")
	// ErrStripeCustomerNotFound indicates the Stripe customer was not found
	ErrStripeCustomerNotFound = errors.New("stripe customer not found")
)

// SubscriptionService handles subscription business logic
type SubscriptionService struct {
	repo           *repository.SubscriptionRepository
	userRepo       *repository.UserRepository
	webhookRepo    *repository.WebhookRepository
	cfg            *config.Config
	auditLogSvc    *AuditLogService
	dunningService *DunningService
	emailService   *EmailService
}

// NewSubscriptionService creates a new subscription service
func NewSubscriptionService(
	repo *repository.SubscriptionRepository,
	userRepo *repository.UserRepository,
	webhookRepo *repository.WebhookRepository,
	cfg *config.Config,
	auditLogSvc *AuditLogService,
	dunningService *DunningService,
	emailService *EmailService,
) *SubscriptionService {
	// Initialize Stripe with secret key
	stripe.Key = cfg.Stripe.SecretKey

	return &SubscriptionService{
		repo:           repo,
		userRepo:       userRepo,
		webhookRepo:    webhookRepo,
		cfg:            cfg,
		auditLogSvc:    auditLogSvc,
		dunningService: dunningService,
		emailService:   emailService,
	}
}

// GetOrCreateCustomer gets or creates a Stripe customer for the user
func (s *SubscriptionService) GetOrCreateCustomer(ctx context.Context, user *models.User) (string, error) {
	// Check if user already has a subscription with customer ID
	sub, err := s.repo.GetByUserID(ctx, user.ID)
	if err == nil && sub.StripeCustomerID != "" {
		return sub.StripeCustomerID, nil
	}

	// Create new Stripe customer
	params := &stripe.CustomerParams{
		Email: stripe.String(*user.Email),
		Metadata: map[string]string{
			"user_id":  user.ID.String(),
			"username": user.Username,
		},
	}

	if user.DisplayName != "" {
		params.Name = stripe.String(user.DisplayName)
	}

	cust, err := customer.New(params)
	if err != nil {
		return "", fmt.Errorf("failed to create Stripe customer: %w", err)
	}

	// Create or update subscription record with customer ID
	if sub == nil {
		sub = &models.Subscription{
			UserID:           user.ID,
			StripeCustomerID: cust.ID,
			Status:           "inactive",
			Tier:             "free",
		}
		if err := s.repo.Create(ctx, sub); err != nil {
			return "", fmt.Errorf("failed to create subscription record: %w", err)
		}
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, user.ID, "customer_created", map[string]interface{}{
			"stripe_customer_id": cust.ID,
		})
	}

	return cust.ID, nil
}

// CreateCheckoutSession creates a Stripe Checkout session for subscription
func (s *SubscriptionService) CreateCheckoutSession(ctx context.Context, user *models.User, priceID string, couponCode *string) (*models.CreateCheckoutSessionResponse, error) {
	// Validate price ID
	if priceID != s.cfg.Stripe.ProMonthlyPriceID && priceID != s.cfg.Stripe.ProYearlyPriceID {
		return nil, ErrInvalidPriceID
	}

	// Get or create Stripe customer
	customerID, err := s.GetOrCreateCustomer(ctx, user)
	if err != nil {
		return nil, err
	}

	// Create checkout session with idempotency key
	idempotencyKey := fmt.Sprintf("checkout_%s_%s", user.ID.String(), priceID)

	params := &stripe.CheckoutSessionParams{
		Customer: stripe.String(customerID),
		Mode:     stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				Price:    stripe.String(priceID),
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(s.cfg.Stripe.SuccessURL + "?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(s.cfg.Stripe.CancelURL),
		Metadata: map[string]string{
			"user_id": user.ID.String(),
		},
		// Enable promotion codes by default
		AllowPromotionCodes: stripe.Bool(true),
	}

	// Enable Stripe Tax for automatic tax calculation if configured
	if s.cfg.Stripe.TaxEnabled {
		params.AutomaticTax = &stripe.CheckoutSessionAutomaticTaxParams{
			Enabled: stripe.Bool(true),
		}
		// Require billing address collection for tax calculation
		params.BillingAddressCollection = stripe.String("required")
	}

	// Apply coupon code if provided
	if couponCode != nil && *couponCode != "" {
		params.Discounts = []*stripe.CheckoutSessionDiscountParams{
			{
				Coupon: stripe.String(*couponCode),
			},
		}
	}

	params.SetIdempotencyKey(idempotencyKey)

	sess, err := session.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create checkout session: %w", err)
	}

	// Log audit event
	metadata := map[string]interface{}{
		"session_id": sess.ID,
		"price_id":   priceID,
	}
	if couponCode != nil && *couponCode != "" {
		metadata["coupon_code"] = *couponCode
	}
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, user.ID, "checkout_session_created", metadata)
	}

	return &models.CreateCheckoutSessionResponse{
		SessionID:  sess.ID,
		SessionURL: sess.URL,
	}, nil
}

// CreatePortalSession creates a Stripe Customer Portal session
func (s *SubscriptionService) CreatePortalSession(ctx context.Context, user *models.User) (*models.CreatePortalSessionResponse, error) {
	// Get subscription to find customer ID
	sub, err := s.repo.GetByUserID(ctx, user.ID)
	if err != nil {
		return nil, ErrSubscriptionNotFound
	}

	if sub.StripeCustomerID == "" {
		return nil, ErrStripeCustomerNotFound
	}

	// Create portal session
	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(sub.StripeCustomerID),
		ReturnURL: stripe.String(s.cfg.Stripe.SuccessURL),
	}

	sess, err := portalsession.New(params)
	if err != nil {
		return nil, fmt.Errorf("failed to create portal session: %w", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, user.ID, "portal_session_created", map[string]interface{}{
			"session_id": sess.ID,
		})
	}

	return &models.CreatePortalSessionResponse{
		PortalURL: sess.URL,
	}, nil
}

// GetSubscriptionByUserID retrieves a user's subscription
func (s *SubscriptionService) GetSubscriptionByUserID(ctx context.Context, userID uuid.UUID) (*models.Subscription, error) {
	return s.repo.GetByUserID(ctx, userID)
}

// HandleWebhook processes Stripe webhook events
func (s *SubscriptionService) HandleWebhook(ctx context.Context, payload []byte, signature string) error {
	// Verify webhook signature against all configured secrets
	event, err := s.verifyWebhookSignature(payload, signature)
	if err != nil {
		log.Printf("[WEBHOOK] Signature verification failed: %v", err)
		return fmt.Errorf("webhook signature verification failed: %w", err)
	}

	// Log webhook received
	log.Printf("[WEBHOOK] Received event: %s (type: %s)", event.ID, event.Type)

	// Check for duplicate event (idempotency)
	existingEvent, err := s.repo.GetEventByStripeEventID(ctx, event.ID)
	if err == nil && existingEvent != nil {
		log.Printf("[WEBHOOK] Duplicate event %s, skipping", event.ID)
		return nil
	}

	// Process the webhook with retry mechanism
	err = s.processWebhookWithRetry(ctx, event)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to process event %s: %v", event.ID, err)
		// Add to retry queue if not already there
		if s.webhookRepo != nil {
			retryErr := s.webhookRepo.AddToRetryQueue(ctx, event.ID, string(event.Type), event, 3)
			if retryErr != nil {
				log.Printf("[WEBHOOK] Failed to add event %s to retry queue: %v", event.ID, retryErr)
			} else {
				log.Printf("[WEBHOOK] Added event %s to retry queue", event.ID)
			}
		}
		return err
	}

	log.Printf("[WEBHOOK] Successfully processed event: %s", event.ID)
	return nil
}

// verifyWebhookSignature attempts verification with each configured Stripe webhook secret
// so the service can honor Stripe's per-endpoint multiple secret requirement.
func (s *SubscriptionService) verifyWebhookSignature(payload []byte, signature string) (stripe.Event, error) {
	var lastErr error
	for _, secret := range s.cfg.Stripe.WebhookSecrets {
		if secret == "" {
			continue
		}
		event, err := webhook.ConstructEvent(payload, signature, secret)
		if err == nil {
			return event, nil
		}
		lastErr = err
	}
	if lastErr == nil {
		lastErr = errors.New("no webhook secrets configured")
	}
	return stripe.Event{}, lastErr
}

// processWebhookWithRetry processes a webhook event and handles the routing to specific handlers
func (s *SubscriptionService) processWebhookWithRetry(ctx context.Context, event stripe.Event) error {
	// Handle different event types
	switch event.Type {
	case "customer.subscription.created":
		return s.handleSubscriptionCreated(ctx, event)
	case "customer.subscription.updated":
		return s.handleSubscriptionUpdated(ctx, event)
	case "customer.subscription.deleted":
		return s.handleSubscriptionDeleted(ctx, event)
	case "invoice.paid", "invoice.payment_succeeded":
		return s.handleInvoicePaid(ctx, event)
	case "invoice.payment_failed":
		return s.handleInvoicePaymentFailed(ctx, event)
	case "invoice.finalized":
		return s.handleInvoiceFinalized(ctx, event)
	case "payment_intent.succeeded":
		return s.handlePaymentIntentSucceeded(ctx, event)
	case "payment_intent.payment_failed":
		return s.handlePaymentIntentFailed(ctx, event)
	default:
		log.Printf("[WEBHOOK] Unhandled event type: %s", event.Type)
		return nil
	}
}

// handleSubscriptionCreated processes subscription.created events
func (s *SubscriptionService) handleSubscriptionCreated(ctx context.Context, event stripe.Event) error {
	var stripeSubscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &stripeSubscription); err != nil {
		log.Printf("[WEBHOOK] Failed to unmarshal subscription.created event %s: %v", event.ID, err)
		return fmt.Errorf("failed to unmarshal subscription: %w", err)
	}

	log.Printf("[WEBHOOK] Processing subscription.created for customer: %s, subscription: %s",
		stripeSubscription.Customer.ID, stripeSubscription.ID)

	// Get subscription by customer ID
	sub, err := s.repo.GetByStripeCustomerID(ctx, stripeSubscription.Customer.ID)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to find subscription by customer ID %s: %v", stripeSubscription.Customer.ID, err)
		return fmt.Errorf("failed to find subscription by customer ID: %w", err)
	}

	// Determine tier from price ID
	tier := s.getTierFromPriceID(stripeSubscription.Items.Data[0].Price.ID)

	// Update subscription with Stripe subscription details
	sub.StripeSubscriptionID = &stripeSubscription.ID
	sub.StripePriceID = &stripeSubscription.Items.Data[0].Price.ID
	sub.Status = string(stripeSubscription.Status)
	sub.Tier = tier
	sub.CurrentPeriodStart = timePtr(time.Unix(stripeSubscription.CurrentPeriodStart, 0))
	sub.CurrentPeriodEnd = timePtr(time.Unix(stripeSubscription.CurrentPeriodEnd, 0))
	sub.CancelAtPeriodEnd = stripeSubscription.CancelAtPeriodEnd

	if stripeSubscription.CanceledAt > 0 {
		sub.CanceledAt = timePtr(time.Unix(stripeSubscription.CanceledAt, 0))
	}

	if stripeSubscription.TrialStart > 0 {
		sub.TrialStart = timePtr(time.Unix(stripeSubscription.TrialStart, 0))
	}

	if stripeSubscription.TrialEnd > 0 {
		sub.TrialEnd = timePtr(time.Unix(stripeSubscription.TrialEnd, 0))
	}

	if err := s.repo.Update(ctx, sub); err != nil {
		log.Printf("[WEBHOOK] Failed to update subscription for customer %s: %v", stripeSubscription.Customer.ID, err)
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// Log event
	if err := s.repo.LogSubscriptionEvent(ctx, &sub.ID, "subscription_created", &event.ID, stripeSubscription); err != nil {
		log.Printf("[WEBHOOK] Failed to log subscription event: %v", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "subscription_created", map[string]interface{}{
			"subscription_id": stripeSubscription.ID,
			"tier":            tier,
			"status":          string(stripeSubscription.Status),
		})
	}

	log.Printf("[WEBHOOK] Successfully created subscription for user %s (tier: %s, status: %s)",
		sub.UserID, tier, stripeSubscription.Status)
	return nil
}

// handleSubscriptionUpdated processes subscription.updated events
func (s *SubscriptionService) handleSubscriptionUpdated(ctx context.Context, event stripe.Event) error {
	var stripeSubscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &stripeSubscription); err != nil {
		log.Printf("[WEBHOOK] Failed to unmarshal subscription.updated event %s: %v", event.ID, err)
		return fmt.Errorf("failed to unmarshal subscription: %w", err)
	}

	log.Printf("[WEBHOOK] Processing subscription.updated for subscription: %s", stripeSubscription.ID)

	// Get subscription by Stripe subscription ID
	sub, err := s.repo.GetByStripeSubscriptionID(ctx, stripeSubscription.ID)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to find subscription %s: %v", stripeSubscription.ID, err)
		return fmt.Errorf("failed to find subscription: %w", err)
	}

	// Determine tier from price ID
	tier := s.getTierFromPriceID(stripeSubscription.Items.Data[0].Price.ID)

	// Update subscription details
	sub.StripePriceID = &stripeSubscription.Items.Data[0].Price.ID
	sub.Status = string(stripeSubscription.Status)
	sub.Tier = tier
	sub.CurrentPeriodStart = timePtr(time.Unix(stripeSubscription.CurrentPeriodStart, 0))
	sub.CurrentPeriodEnd = timePtr(time.Unix(stripeSubscription.CurrentPeriodEnd, 0))
	sub.CancelAtPeriodEnd = stripeSubscription.CancelAtPeriodEnd

	if stripeSubscription.CanceledAt > 0 {
		sub.CanceledAt = timePtr(time.Unix(stripeSubscription.CanceledAt, 0))
	}

	if err := s.repo.Update(ctx, sub); err != nil {
		log.Printf("[WEBHOOK] Failed to update subscription %s: %v", stripeSubscription.ID, err)
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// Log event
	if err := s.repo.LogSubscriptionEvent(ctx, &sub.ID, "subscription_updated", &event.ID, stripeSubscription); err != nil {
		log.Printf("[WEBHOOK] Failed to log subscription event: %v", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "subscription_updated", map[string]interface{}{
			"subscription_id": stripeSubscription.ID,
			"tier":            tier,
			"status":          string(stripeSubscription.Status),
		})
	}

	log.Printf("[WEBHOOK] Successfully updated subscription %s (tier: %s, status: %s)",
		stripeSubscription.ID, tier, stripeSubscription.Status)
	return nil
}

// handleSubscriptionDeleted processes subscription.deleted events
func (s *SubscriptionService) handleSubscriptionDeleted(ctx context.Context, event stripe.Event) error {
	var stripeSubscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &stripeSubscription); err != nil {
		log.Printf("[WEBHOOK] Failed to unmarshal subscription.deleted event %s: %v", event.ID, err)
		return fmt.Errorf("failed to unmarshal subscription: %w", err)
	}

	log.Printf("[WEBHOOK] Processing subscription.deleted for subscription: %s", stripeSubscription.ID)

	// Get subscription by Stripe subscription ID
	sub, err := s.repo.GetByStripeSubscriptionID(ctx, stripeSubscription.ID)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to find subscription %s: %v", stripeSubscription.ID, err)
		return fmt.Errorf("failed to find subscription: %w", err)
	}

	// Update subscription to canceled/inactive
	sub.Status = "canceled"
	sub.Tier = "free"
	sub.CanceledAt = timePtr(time.Now())

	if err := s.repo.Update(ctx, sub); err != nil {
		log.Printf("[WEBHOOK] Failed to update subscription %s to canceled: %v", stripeSubscription.ID, err)
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// Log event
	if err := s.repo.LogSubscriptionEvent(ctx, &sub.ID, "subscription_deleted", &event.ID, stripeSubscription); err != nil {
		log.Printf("[WEBHOOK] Failed to log subscription event: %v", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "subscription_deleted", map[string]interface{}{
			"subscription_id": stripeSubscription.ID,
		})
	}

	log.Printf("[WEBHOOK] Successfully deleted subscription %s for user %s", stripeSubscription.ID, sub.UserID)
	return nil
}

// handleInvoicePaid processes invoice.paid events
func (s *SubscriptionService) handleInvoicePaid(ctx context.Context, event stripe.Event) error {
	var invoice stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		log.Printf("[WEBHOOK] Failed to unmarshal invoice.paid event %s: %v", event.ID, err)
		return fmt.Errorf("failed to unmarshal invoice: %w", err)
	}

	if invoice.Subscription == nil {
		log.Printf("[WEBHOOK] Invoice %s is not a subscription invoice, skipping", invoice.ID)
		return nil // Not a subscription invoice
	}

	log.Printf("[WEBHOOK] Processing invoice.paid for subscription: %s, invoice: %s",
		invoice.Subscription.ID, invoice.ID)

	// Get subscription by Stripe subscription ID
	sub, err := s.repo.GetByStripeSubscriptionID(ctx, invoice.Subscription.ID)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to find subscription for invoice %s: %v", invoice.ID, err)
		return nil // Not critical
	}

	// Process payment success for dunning (clears grace period and marks failures as resolved)
	if s.dunningService != nil {
		if err := s.dunningService.HandlePaymentSuccess(ctx, &invoice); err != nil {
			log.Printf("[WEBHOOK] Failed to process payment success in dunning service: %v", err)
		}
	}

	// Log event
	if err := s.repo.LogSubscriptionEvent(ctx, &sub.ID, "invoice_paid", &event.ID, invoice); err != nil {
		log.Printf("[WEBHOOK] Failed to log subscription event: %v", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "invoice_paid", map[string]interface{}{
			"invoice_id":      invoice.ID,
			"amount_paid":     invoice.AmountPaid,
			"subscription_id": invoice.Subscription.ID,
		})
	}

	log.Printf("[WEBHOOK] Successfully processed invoice.paid for subscription %s", invoice.Subscription.ID)
	return nil
}

// handleInvoicePaymentFailed processes invoice.payment_failed events
func (s *SubscriptionService) handleInvoicePaymentFailed(ctx context.Context, event stripe.Event) error {
	var invoice stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		log.Printf("[WEBHOOK] Failed to unmarshal invoice.payment_failed event %s: %v", event.ID, err)
		return fmt.Errorf("failed to unmarshal invoice: %w", err)
	}

	if invoice.Subscription == nil {
		log.Printf("[WEBHOOK] Invoice %s is not a subscription invoice, skipping", invoice.ID)
		return nil // Not a subscription invoice
	}

	log.Printf("[WEBHOOK] Processing invoice.payment_failed for subscription: %s, invoice: %s",
		invoice.Subscription.ID, invoice.ID)

	// Get subscription by Stripe subscription ID
	sub, err := s.repo.GetByStripeSubscriptionID(ctx, invoice.Subscription.ID)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to find subscription for invoice %s: %v", invoice.ID, err)
		return nil // Not critical
	}

	// Update subscription status if needed
	if sub.Status != "past_due" && sub.Status != "unpaid" {
		sub.Status = "past_due"
		if err := s.repo.Update(ctx, sub); err != nil {
			log.Printf("[WEBHOOK] Failed to update subscription status to past_due: %v", err)
		} else {
			log.Printf("[WEBHOOK] Updated subscription %s status to past_due", sub.ID)
		}
	}

	// Process payment failure through dunning service
	if s.dunningService != nil {
		if err := s.dunningService.HandlePaymentFailure(ctx, &invoice); err != nil {
			log.Printf("[WEBHOOK] Failed to process payment failure in dunning service: %v", err)
		}
	}

	// Log event
	if err := s.repo.LogSubscriptionEvent(ctx, &sub.ID, "invoice_payment_failed", &event.ID, invoice); err != nil {
		log.Printf("[WEBHOOK] Failed to log subscription event: %v", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "invoice_payment_failed", map[string]interface{}{
			"invoice_id":      invoice.ID,
			"amount_due":      invoice.AmountDue,
			"subscription_id": invoice.Subscription.ID,
		})
	}

	log.Printf("[WEBHOOK] Successfully processed invoice.payment_failed for subscription %s", invoice.Subscription.ID)
	return nil
}

// handleInvoiceFinalized processes invoice.finalized events and sends invoice PDFs to customers
func (s *SubscriptionService) handleInvoiceFinalized(ctx context.Context, event stripe.Event) error {
	var invoice stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		log.Printf("[WEBHOOK] Failed to unmarshal invoice.finalized event %s: %v", event.ID, err)
		return fmt.Errorf("failed to unmarshal invoice: %w", err)
	}

	log.Printf("[WEBHOOK] Processing invoice.finalized for invoice: %s, customer: %s",
		invoice.ID, invoice.Customer.ID)

	// Skip if invoice is not related to a subscription
	if invoice.Subscription == nil {
		log.Printf("[WEBHOOK] Invoice %s is not a subscription invoice, skipping", invoice.ID)
		return nil
	}

	// Skip if invoice PDF delivery is disabled
	if !s.cfg.Stripe.InvoicePDFEnabled {
		log.Printf("[WEBHOOK] Invoice PDF delivery disabled, skipping for invoice %s", invoice.ID)
		return nil
	}

	// Skip if no invoice PDF URL is available (shouldn't happen for finalized invoices)
	if invoice.InvoicePDF == "" {
		log.Printf("[WEBHOOK] No invoice PDF URL available for invoice %s", invoice.ID)
		return nil
	}

	// Get subscription by Stripe customer ID
	sub, err := s.repo.GetByStripeCustomerID(ctx, invoice.Customer.ID)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to find subscription for customer %s: %v", invoice.Customer.ID, err)
		return nil // Not critical, don't fail the webhook
	}

	// Get user for email
	user, err := s.userRepo.GetByID(ctx, sub.UserID)
	if err != nil {
		log.Printf("[WEBHOOK] Failed to get user %s for invoice email: %v", sub.UserID, err)
		return nil // Not critical
	}

	// Send invoice email with PDF link
	if s.emailService != nil {
		emailData := map[string]interface{}{
			"InvoiceID":        invoice.ID,
			"InvoicePDFURL":    invoice.InvoicePDF,
			"HostedInvoiceURL": invoice.HostedInvoiceURL,
			"AmountDue":        formatAmountForCurrency(invoice.AmountDue, string(invoice.Currency)),
			"Currency":         string(invoice.Currency),
			"InvoiceNumber":    invoice.Number,
		}

		// Add tax information if available
		if invoice.AutomaticTax != nil && invoice.AutomaticTax.Status != "" {
			emailData["TaxStatus"] = string(invoice.AutomaticTax.Status)
		}
		if invoice.Tax > 0 {
			emailData["TaxAmount"] = formatAmountForCurrency(invoice.Tax, string(invoice.Currency))
			// Always set Subtotal when TaxAmount is present
			emailData["Subtotal"] = formatAmountForCurrency(invoice.Subtotal, string(invoice.Currency))
		}
		// Always set Total; use AmountDue as fallback if Total is not positive
		if invoice.Total > 0 {
			emailData["Total"] = formatAmountForCurrency(invoice.Total, string(invoice.Currency))
		} else {
			emailData["Total"] = formatAmountForCurrency(invoice.AmountDue, string(invoice.Currency))
		}

		notificationID := uuid.New()
		if err := s.emailService.SendNotificationEmail(ctx, user, models.NotificationTypeInvoiceFinalized, notificationID, emailData); err != nil {
			log.Printf("[WEBHOOK] Failed to send invoice email to user %s: %v", user.ID, err)
			// Continue processing, email failure shouldn't fail the webhook
		} else {
			log.Printf("[WEBHOOK] Invoice email sent to user %s for invoice %s", user.ID, invoice.ID)
		}
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "invoice_finalized", map[string]interface{}{
			"invoice_id":     invoice.ID,
			"invoice_number": invoice.Number,
			"amount_due":     invoice.AmountDue,
			"tax":            invoice.Tax,
			"pdf_url":        invoice.InvoicePDF,
		})
	}

	log.Printf("[WEBHOOK] Successfully processed invoice.finalized for invoice %s", invoice.ID)
	return nil
}

// formatAmountForCurrency formats an amount in smallest currency unit for display with currency
// Handles zero-decimal currencies (JPY, KRW, etc.) and three-decimal currencies (KWD, BHD, etc.)
func formatAmountForCurrency(amount int64, currency string) string {
	currency = strings.ToUpper(currency)

	// Zero-decimal currencies (no decimal places)
	zeroDecimalCurrencies := map[string]bool{
		"BIF": true, "CLP": true, "DJF": true, "GNF": true, "JPY": true,
		"KMF": true, "KRW": true, "MGA": true, "PYG": true, "RWF": true,
		"UGX": true, "VND": true, "VUV": true, "XAF": true, "XOF": true, "XPF": true,
	}

	// Three-decimal currencies
	threeDecimalCurrencies := map[string]bool{
		"BHD": true, "JOD": true, "KWD": true, "OMR": true, "TND": true,
	}

	if zeroDecimalCurrencies[currency] {
		return fmt.Sprintf("%d %s", amount, currency)
	}

	if threeDecimalCurrencies[currency] {
		return fmt.Sprintf("%.3f %s", float64(amount)/1000, currency)
	}

	// Default: two decimal places (most currencies)
	return fmt.Sprintf("%.2f %s", float64(amount)/100, currency)
}

// getTierFromPriceID determines the subscription tier from Stripe price ID
func (s *SubscriptionService) getTierFromPriceID(priceID string) string {
	if priceID == s.cfg.Stripe.ProMonthlyPriceID || priceID == s.cfg.Stripe.ProYearlyPriceID {
		return "pro"
	}
	return "free"
}

// ChangeSubscriptionPlan changes a user's subscription plan with proration
func (s *SubscriptionService) ChangeSubscriptionPlan(ctx context.Context, user *models.User, newPriceID string) error {
	// Validate new price ID
	if newPriceID != s.cfg.Stripe.ProMonthlyPriceID && newPriceID != s.cfg.Stripe.ProYearlyPriceID {
		return ErrInvalidPriceID
	}

	// Get existing subscription
	sub, err := s.repo.GetByUserID(ctx, user.ID)
	if err != nil {
		return fmt.Errorf("failed to get subscription: %w", err)
	}

	if sub.StripeSubscriptionID == nil || *sub.StripeSubscriptionID == "" {
		return errors.New("no active stripe subscription found")
	}

	// Get the subscription from Stripe
	stripeSubscription, err := subscription.Get(*sub.StripeSubscriptionID, nil)
	if err != nil {
		return fmt.Errorf("failed to get stripe subscription: %w", err)
	}

	// Validate subscription has items
	if len(stripeSubscription.Items.Data) == 0 {
		return errors.New("subscription has no items")
	}

	// Validate first item has a price
	if stripeSubscription.Items.Data[0].Price == nil {
		return errors.New("subscription item has no price")
	}

	// Check if already on this plan
	if stripeSubscription.Items.Data[0].Price.ID == newPriceID {
		return errors.New("already subscribed to this plan")
	}

	// Update subscription with proration
	subscriptionItemID := stripeSubscription.Items.Data[0].ID
	params := &stripe.SubscriptionParams{
		Items: []*stripe.SubscriptionItemsParams{
			{
				ID:    stripe.String(subscriptionItemID),
				Price: stripe.String(newPriceID),
			},
		},
		ProrationBehavior: stripe.String("always_invoice"),
	}

	_, err = subscription.Update(*sub.StripeSubscriptionID, params)
	if err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, user.ID, "subscription_plan_changed", map[string]interface{}{
			"old_price_id": stripeSubscription.Items.Data[0].Price.ID,
			"new_price_id": newPriceID,
			"proration":    "always_invoice",
		})
	}

	return nil
}

// HasActiveSubscription checks if user has an active subscription (including grace period)
func (s *SubscriptionService) HasActiveSubscription(ctx context.Context, userID uuid.UUID) bool {
	sub, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return false
	}

	// Active or trialing status
	if sub.Status == "active" || sub.Status == "trialing" {
		return true
	}

	// In grace period for past_due or unpaid subscriptions
	if (sub.Status == "past_due" || sub.Status == "unpaid") && s.isInGracePeriod(sub) {
		return true
	}

	return false
}

// IsProUser checks if user has an active Pro subscription (including grace period)
func (s *SubscriptionService) IsProUser(ctx context.Context, userID uuid.UUID) bool {
	sub, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return false
	}

	// Must be Pro tier
	if sub.Tier != "pro" {
		return false
	}

	// Active or trialing status
	if sub.Status == "active" || sub.Status == "trialing" {
		return true
	}

	// In grace period for past_due or unpaid subscriptions
	if (sub.Status == "past_due" || sub.Status == "unpaid") && s.isInGracePeriod(sub) {
		return true
	}

	return false
}

// isInGracePeriod checks if a subscription is currently in grace period
func (s *SubscriptionService) isInGracePeriod(sub *models.Subscription) bool {
	if sub.GracePeriodEnd == nil {
		return false
	}
	return time.Now().Before(*sub.GracePeriodEnd)
}

// handlePaymentIntentSucceeded processes payment_intent.succeeded events
func (s *SubscriptionService) handlePaymentIntentSucceeded(ctx context.Context, event stripe.Event) error {
	var paymentIntent stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &paymentIntent); err != nil {
		log.Printf("[WEBHOOK] Failed to unmarshal payment_intent.succeeded event %s: %v", event.ID, err)
		return fmt.Errorf("failed to unmarshal payment intent: %w", err)
	}

	log.Printf("[WEBHOOK] Processing payment_intent.succeeded for payment intent: %s, customer: %s, amount: %d %s",
		paymentIntent.ID, paymentIntent.Customer.ID, paymentIntent.Amount, paymentIntent.Currency)

	// Log successful payment
	if s.auditLogSvc != nil {
		metadata := map[string]interface{}{
			"payment_intent_id": paymentIntent.ID,
			"amount_cents":      paymentIntent.Amount,
			"currency":          paymentIntent.Currency,
			"status":            string(paymentIntent.Status),
		}
		if paymentIntent.Customer != nil {
			metadata["stripe_customer_id"] = paymentIntent.Customer.ID
		}

		// Try to get user ID from subscription if available
		if paymentIntent.Invoice != nil && paymentIntent.Invoice.Subscription != nil {
			sub, err := s.repo.GetByStripeSubscriptionID(ctx, paymentIntent.Invoice.Subscription.ID)
			if err == nil {
				_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "payment_intent_succeeded", metadata)
			}
		}
	}

	log.Printf("[WEBHOOK] Successfully processed payment_intent.succeeded for %s", paymentIntent.ID)
	return nil
}

// handlePaymentIntentFailed processes payment_intent.payment_failed events
func (s *SubscriptionService) handlePaymentIntentFailed(ctx context.Context, event stripe.Event) error {
	var paymentIntent stripe.PaymentIntent
	if err := json.Unmarshal(event.Data.Raw, &paymentIntent); err != nil {
		log.Printf("[WEBHOOK] Failed to unmarshal payment_intent.payment_failed event %s: %v", event.ID, err)
		return fmt.Errorf("failed to unmarshal payment intent: %w", err)
	}

	log.Printf("[WEBHOOK] Processing payment_intent.payment_failed for payment intent: %s, customer: %s, amount: %d %s",
		paymentIntent.ID, paymentIntent.Customer.ID, paymentIntent.Amount, paymentIntent.Currency)

	// Log failed payment
	if s.auditLogSvc != nil {
		metadata := map[string]interface{}{
			"payment_intent_id": paymentIntent.ID,
			"amount_cents":      paymentIntent.Amount,
			"currency":          paymentIntent.Currency,
			"status":            string(paymentIntent.Status),
		}
		if paymentIntent.LastPaymentError != nil {
			metadata["error_code"] = paymentIntent.LastPaymentError.Code
			metadata["error_message"] = paymentIntent.LastPaymentError.Msg
		}
		if paymentIntent.Customer != nil {
			metadata["stripe_customer_id"] = paymentIntent.Customer.ID
		}

		// Try to get user ID from subscription if available
		if paymentIntent.Invoice != nil && paymentIntent.Invoice.Subscription != nil {
			sub, err := s.repo.GetByStripeSubscriptionID(ctx, paymentIntent.Invoice.Subscription.ID)
			if err == nil {
				_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "payment_intent_failed", metadata)
			}
		}
	}

	log.Printf("[WEBHOOK] Successfully processed payment_intent.payment_failed for %s", paymentIntent.ID)
	return nil
}

// timePtr returns a pointer to a time.Time
func timePtr(t time.Time) *time.Time {
	return &t
}
