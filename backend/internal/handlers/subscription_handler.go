package handlers

import (
	"io"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/services"
)

// SubscriptionHandler handles subscription-related HTTP requests
type SubscriptionHandler struct {
	subscriptionService *services.SubscriptionService
}

// NewSubscriptionHandler creates a new subscription handler
func NewSubscriptionHandler(subscriptionService *services.SubscriptionService) *SubscriptionHandler {
	return &SubscriptionHandler{
		subscriptionService: subscriptionService,
	}
}

// CreateCheckoutSession creates a Stripe Checkout session
// @Summary Create checkout session
// @Description Creates a Stripe Checkout session for subscription
// @Tags subscriptions
// @Accept json
// @Produce json
// @Param request body models.CreateCheckoutSessionRequest true "Checkout session request"
// @Success 200 {object} models.CreateCheckoutSessionResponse
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/subscriptions/checkout [post]
func (h *SubscriptionHandler) CreateCheckoutSession(c *gin.Context) {
	// Get authenticated user from context
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	currentUser, ok := user.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user information"})
		return
	}

	// Check if user has email (required for Stripe)
	if currentUser.Email == nil || *currentUser.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Email is required for subscriptions"})
		return
	}

	// Parse request
	var req models.CreateCheckoutSessionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Create checkout session
	response, err := h.subscriptionService.CreateCheckoutSession(c.Request.Context(), currentUser, req.PriceID)
	if err != nil {
		log.Printf("Failed to create checkout session: %v", err)
		if err == services.ErrInvalidPriceID {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid price ID"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create checkout session"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// CreatePortalSession creates a Stripe Customer Portal session
// @Summary Create portal session
// @Description Creates a Stripe Customer Portal session for managing subscription
// @Tags subscriptions
// @Produce json
// @Success 200 {object} models.CreatePortalSessionResponse
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/subscriptions/portal [post]
func (h *SubscriptionHandler) CreatePortalSession(c *gin.Context) {
	// Get authenticated user from context
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	currentUser, ok := user.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user information"})
		return
	}

	// Create portal session
	response, err := h.subscriptionService.CreatePortalSession(c.Request.Context(), currentUser)
	if err != nil {
		log.Printf("Failed to create portal session: %v", err)
		if err == services.ErrSubscriptionNotFound || err == services.ErrStripeCustomerNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "No subscription found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create portal session"})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetSubscription retrieves the current user's subscription
// @Summary Get subscription
// @Description Retrieves the authenticated user's subscription information
// @Tags subscriptions
// @Produce json
// @Success 200 {object} models.Subscription
// @Failure 401 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /api/v1/subscriptions/me [get]
func (h *SubscriptionHandler) GetSubscription(c *gin.Context) {
	// Get authenticated user from context
	user, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	currentUser, ok := user.(*models.User)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user information"})
		return
	}

	// Get subscription
	subscription, err := h.subscriptionService.GetSubscriptionByUserID(c.Request.Context(), currentUser.ID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "No subscription found"})
		return
	}

	c.JSON(http.StatusOK, subscription)
}

// HandleWebhook handles Stripe webhook events
// @Summary Handle Stripe webhook
// @Description Processes Stripe webhook events for subscription lifecycle
// @Tags webhooks
// @Accept json
// @Produce json
// @Success 200 {object} map[string]string
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /api/v1/webhooks/stripe [post]
func (h *SubscriptionHandler) HandleWebhook(c *gin.Context) {
	// Read the request body
	payload, err := io.ReadAll(c.Request.Body)
	if err != nil {
		log.Printf("Failed to read webhook body: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Get the Stripe signature header
	signature := c.GetHeader("Stripe-Signature")
	if signature == "" {
		log.Printf("Missing Stripe-Signature header")
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing signature"})
		return
	}

	// Process webhook
	if err := h.subscriptionService.HandleWebhook(c.Request.Context(), payload, signature); err != nil {
		log.Printf("Failed to process webhook: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}
