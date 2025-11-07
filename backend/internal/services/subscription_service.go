package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
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
	repo        *repository.SubscriptionRepository
	userRepo    *repository.UserRepository
	cfg         *config.Config
	auditLogSvc *AuditLogService
}

// NewSubscriptionService creates a new subscription service
func NewSubscriptionService(
	repo *repository.SubscriptionRepository,
	userRepo *repository.UserRepository,
	cfg *config.Config,
	auditLogSvc *AuditLogService,
) *SubscriptionService {
	// Initialize Stripe with secret key
	stripe.Key = cfg.Stripe.SecretKey

	return &SubscriptionService{
		repo:        repo,
		userRepo:    userRepo,
		cfg:         cfg,
		auditLogSvc: auditLogSvc,
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
	// Verify webhook signature
	event, err := webhook.ConstructEvent(payload, signature, s.cfg.Stripe.WebhookSecret)
	if err != nil {
		return fmt.Errorf("webhook signature verification failed: %w", err)
	}

	// Check for duplicate event (idempotency)
	existingEvent, err := s.repo.GetEventByStripeEventID(ctx, event.ID)
	if err == nil && existingEvent != nil {
		log.Printf("Duplicate webhook event %s, skipping", event.ID)
		return nil
	}

	log.Printf("Processing webhook event: %s (type: %s)", event.ID, event.Type)

	// Handle different event types
	switch event.Type {
	case "customer.subscription.created":
		return s.handleSubscriptionCreated(ctx, event)
	case "customer.subscription.updated":
		return s.handleSubscriptionUpdated(ctx, event)
	case "customer.subscription.deleted":
		return s.handleSubscriptionDeleted(ctx, event)
	case "invoice.paid":
		return s.handleInvoicePaid(ctx, event)
	case "invoice.payment_failed":
		return s.handleInvoicePaymentFailed(ctx, event)
	default:
		log.Printf("Unhandled webhook event type: %s", event.Type)
		return nil
	}
}

// handleSubscriptionCreated processes subscription.created events
func (s *SubscriptionService) handleSubscriptionCreated(ctx context.Context, event stripe.Event) error {
	var stripeSubscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &stripeSubscription); err != nil {
		return fmt.Errorf("failed to unmarshal subscription: %w", err)
	}

	// Get subscription by customer ID
	sub, err := s.repo.GetByStripeCustomerID(ctx, stripeSubscription.Customer.ID)
	if err != nil {
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
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// Log event
	if err := s.repo.LogSubscriptionEvent(ctx, &sub.ID, "subscription_created", &event.ID, stripeSubscription); err != nil {
		log.Printf("Failed to log subscription event: %v", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "subscription_created", map[string]interface{}{
			"subscription_id": stripeSubscription.ID,
			"tier":            tier,
			"status":          string(stripeSubscription.Status),
		})
	}

	return nil
}

// handleSubscriptionUpdated processes subscription.updated events
func (s *SubscriptionService) handleSubscriptionUpdated(ctx context.Context, event stripe.Event) error {
	var stripeSubscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &stripeSubscription); err != nil {
		return fmt.Errorf("failed to unmarshal subscription: %w", err)
	}

	// Get subscription by Stripe subscription ID
	sub, err := s.repo.GetByStripeSubscriptionID(ctx, stripeSubscription.ID)
	if err != nil {
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
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// Log event
	if err := s.repo.LogSubscriptionEvent(ctx, &sub.ID, "subscription_updated", &event.ID, stripeSubscription); err != nil {
		log.Printf("Failed to log subscription event: %v", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "subscription_updated", map[string]interface{}{
			"subscription_id": stripeSubscription.ID,
			"tier":            tier,
			"status":          string(stripeSubscription.Status),
		})
	}

	return nil
}

// handleSubscriptionDeleted processes subscription.deleted events
func (s *SubscriptionService) handleSubscriptionDeleted(ctx context.Context, event stripe.Event) error {
	var stripeSubscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &stripeSubscription); err != nil {
		return fmt.Errorf("failed to unmarshal subscription: %w", err)
	}

	// Get subscription by Stripe subscription ID
	sub, err := s.repo.GetByStripeSubscriptionID(ctx, stripeSubscription.ID)
	if err != nil {
		return fmt.Errorf("failed to find subscription: %w", err)
	}

	// Update subscription to canceled/inactive
	sub.Status = "canceled"
	sub.Tier = "free"
	sub.CanceledAt = timePtr(time.Now())

	if err := s.repo.Update(ctx, sub); err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// Log event
	if err := s.repo.LogSubscriptionEvent(ctx, &sub.ID, "subscription_deleted", &event.ID, stripeSubscription); err != nil {
		log.Printf("Failed to log subscription event: %v", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "subscription_deleted", map[string]interface{}{
			"subscription_id": stripeSubscription.ID,
		})
	}

	return nil
}

// handleInvoicePaid processes invoice.paid events
func (s *SubscriptionService) handleInvoicePaid(ctx context.Context, event stripe.Event) error {
	var invoice stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		return fmt.Errorf("failed to unmarshal invoice: %w", err)
	}

	if invoice.Subscription == nil {
		return nil // Not a subscription invoice
	}

	// Get subscription by Stripe subscription ID
	sub, err := s.repo.GetByStripeSubscriptionID(ctx, invoice.Subscription.ID)
	if err != nil {
		log.Printf("Failed to find subscription for invoice: %v", err)
		return nil // Not critical
	}

	// Log event
	if err := s.repo.LogSubscriptionEvent(ctx, &sub.ID, "invoice_paid", &event.ID, invoice); err != nil {
		log.Printf("Failed to log subscription event: %v", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "invoice_paid", map[string]interface{}{
			"invoice_id":      invoice.ID,
			"amount_paid":     invoice.AmountPaid,
			"subscription_id": invoice.Subscription.ID,
		})
	}

	return nil
}

// handleInvoicePaymentFailed processes invoice.payment_failed events
func (s *SubscriptionService) handleInvoicePaymentFailed(ctx context.Context, event stripe.Event) error {
	var invoice stripe.Invoice
	if err := json.Unmarshal(event.Data.Raw, &invoice); err != nil {
		return fmt.Errorf("failed to unmarshal invoice: %w", err)
	}

	if invoice.Subscription == nil {
		return nil // Not a subscription invoice
	}

	// Get subscription by Stripe subscription ID
	sub, err := s.repo.GetByStripeSubscriptionID(ctx, invoice.Subscription.ID)
	if err != nil {
		log.Printf("Failed to find subscription for invoice: %v", err)
		return nil // Not critical
	}

	// Update subscription status if needed
	if sub.Status != "past_due" && sub.Status != "unpaid" {
		sub.Status = "past_due"
		if err := s.repo.Update(ctx, sub); err != nil {
			log.Printf("Failed to update subscription status: %v", err)
		}
	}

	// Log event
	if err := s.repo.LogSubscriptionEvent(ctx, &sub.ID, "invoice_payment_failed", &event.ID, invoice); err != nil {
		log.Printf("Failed to log subscription event: %v", err)
	}

	// Log audit event
	if s.auditLogSvc != nil {
		_ = s.auditLogSvc.LogSubscriptionEvent(ctx, sub.UserID, "invoice_payment_failed", map[string]interface{}{
			"invoice_id":      invoice.ID,
			"amount_due":      invoice.AmountDue,
			"subscription_id": invoice.Subscription.ID,
		})
	}

	return nil
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

// HasActiveSubscription checks if user has an active subscription
func (s *SubscriptionService) HasActiveSubscription(ctx context.Context, userID uuid.UUID) bool {
	sub, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return false
	}

	return sub.Status == "active" || sub.Status == "trialing"
}

// IsProUser checks if user has an active Pro subscription
func (s *SubscriptionService) IsProUser(ctx context.Context, userID uuid.UUID) bool {
	sub, err := s.repo.GetByUserID(ctx, userID)
	if err != nil {
		return false
	}

	return (sub.Status == "active" || sub.Status == "trialing") && sub.Tier == "pro"
}

// timePtr returns a pointer to a time.Time
func timePtr(t time.Time) *time.Time {
	return &t
}
