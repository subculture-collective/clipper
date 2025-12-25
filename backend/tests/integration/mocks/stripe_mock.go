//go:build integration

package mocks

import (
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// StripeClientInterface defines the interface for Stripe operations
type StripeClientInterface interface {
	CreateCustomer(email string, metadata map[string]string) (string, error)
	CreateSubscription(customerID string, priceID string) (string, error)
	CancelSubscription(subscriptionID string) error
	GetSubscription(subscriptionID string) (*MockSubscription, error)
	CreateCheckoutSession(customerID string, priceID string, successURL string, cancelURL string) (string, error)
	ConstructWebhookEvent(payload []byte, signature string) (*MockWebhookEvent, error)
}

// MockStripeClient implements StripeClientInterface for testing
type MockStripeClient struct {
	mu sync.RWMutex

	// Mock data stores
	Customers     map[string]*MockCustomer
	Subscriptions map[string]*MockSubscription
	Sessions      map[string]*MockCheckoutSession
	Events        []*MockWebhookEvent

	// Call tracking
	CreateCustomerCalls        int
	CreateSubscriptionCalls    int
	CancelSubscriptionCalls    int
	GetSubscriptionCalls       int
	CreateCheckoutSessionCalls int

	// Error injection
	CreateCustomerError        error
	CreateSubscriptionError    error
	CancelSubscriptionError    error
	GetSubscriptionError       error
	CreateCheckoutSessionError error

	// Latency simulation
	SimulateLatency time.Duration
}

// MockCustomer represents a Stripe customer
type MockCustomer struct {
	ID       string
	Email    string
	Metadata map[string]string
	Created  time.Time
}

// MockSubscription represents a Stripe subscription
type MockSubscription struct {
	ID         string
	CustomerID string
	PriceID    string
	Status     string // active, canceled, past_due, etc.
	Created    time.Time
	CanceledAt *time.Time
}

// MockCheckoutSession represents a Stripe checkout session
type MockCheckoutSession struct {
	ID         string
	CustomerID string
	PriceID    string
	SuccessURL string
	CancelURL  string
	URL        string
	Created    time.Time
}

// MockWebhookEvent represents a Stripe webhook event
type MockWebhookEvent struct {
	ID      string
	Type    string
	Data    interface{}
	Created time.Time
}

// NewMockStripeClient creates a new mock Stripe client
func NewMockStripeClient() *MockStripeClient {
	return &MockStripeClient{
		Customers:     make(map[string]*MockCustomer),
		Subscriptions: make(map[string]*MockSubscription),
		Sessions:      make(map[string]*MockCheckoutSession),
		Events:        make([]*MockWebhookEvent, 0),
	}
}

// CreateCustomer creates a mock Stripe customer
func (m *MockStripeClient) CreateCustomer(email string, metadata map[string]string) (string, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.CreateCustomerCalls++

	if m.CreateCustomerError != nil {
		return "", m.CreateCustomerError
	}

	customerID := "cus_" + uuid.New().String()[:16]
	customer := &MockCustomer{
		ID:       customerID,
		Email:    email,
		Metadata: metadata,
		Created:  time.Now(),
	}

	m.Customers[customerID] = customer
	return customerID, nil
}

// CreateSubscription creates a mock Stripe subscription
func (m *MockStripeClient) CreateSubscription(customerID string, priceID string) (string, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.CreateSubscriptionCalls++

	if m.CreateSubscriptionError != nil {
		return "", m.CreateSubscriptionError
	}

	// Check if customer exists
	if _, exists := m.Customers[customerID]; !exists {
		return "", fmt.Errorf("customer not found: %s", customerID)
	}

	subscriptionID := "sub_" + uuid.New().String()[:16]
	subscription := &MockSubscription{
		ID:         subscriptionID,
		CustomerID: customerID,
		PriceID:    priceID,
		Status:     "active",
		Created:    time.Now(),
	}

	m.Subscriptions[subscriptionID] = subscription
	return subscriptionID, nil
}

// CancelSubscription cancels a mock Stripe subscription
func (m *MockStripeClient) CancelSubscription(subscriptionID string) error {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.CancelSubscriptionCalls++

	if m.CancelSubscriptionError != nil {
		return m.CancelSubscriptionError
	}

	subscription, exists := m.Subscriptions[subscriptionID]
	if !exists {
		return fmt.Errorf("subscription not found: %s", subscriptionID)
	}

	now := time.Now()
	subscription.Status = "canceled"
	subscription.CanceledAt = &now

	return nil
}

// GetSubscription retrieves a mock Stripe subscription
func (m *MockStripeClient) GetSubscription(subscriptionID string) (*MockSubscription, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.GetSubscriptionCalls++

	if m.GetSubscriptionError != nil {
		return nil, m.GetSubscriptionError
	}

	subscription, exists := m.Subscriptions[subscriptionID]
	if !exists {
		return nil, fmt.Errorf("subscription not found: %s", subscriptionID)
	}

	return subscription, nil
}

// CreateCheckoutSession creates a mock Stripe checkout session
func (m *MockStripeClient) CreateCheckoutSession(customerID string, priceID string, successURL string, cancelURL string) (string, error) {
	if m.SimulateLatency > 0 {
		time.Sleep(m.SimulateLatency)
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.CreateCheckoutSessionCalls++

	if m.CreateCheckoutSessionError != nil {
		return "", m.CreateCheckoutSessionError
	}

	// Check if customer exists
	if _, exists := m.Customers[customerID]; !exists {
		return "", fmt.Errorf("customer not found: %s", customerID)
	}

	sessionID := "cs_" + uuid.New().String()[:16]
	session := &MockCheckoutSession{
		ID:         sessionID,
		CustomerID: customerID,
		PriceID:    priceID,
		SuccessURL: successURL,
		CancelURL:  cancelURL,
		URL:        "https://checkout.stripe.com/mock/" + sessionID,
		Created:    time.Now(),
	}

	m.Sessions[sessionID] = session
	return sessionID, nil
}

// ConstructWebhookEvent creates a mock webhook event
func (m *MockStripeClient) ConstructWebhookEvent(payload []byte, signature string) (*MockWebhookEvent, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// In a mock, we just create a simple event
	event := &MockWebhookEvent{
		ID:      "evt_" + uuid.New().String()[:16],
		Type:    "customer.subscription.created",
		Data:    string(payload),
		Created: time.Now(),
	}

	m.Events = append(m.Events, event)
	return event, nil
}

// AddCustomer adds a pre-configured customer to the mock
func (m *MockStripeClient) AddCustomer(customer *MockCustomer) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Customers[customer.ID] = customer
}

// AddSubscription adds a pre-configured subscription to the mock
func (m *MockStripeClient) AddSubscription(subscription *MockSubscription) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.Subscriptions[subscription.ID] = subscription
}

// GetCustomer retrieves a customer by ID
func (m *MockStripeClient) GetCustomer(customerID string) (*MockCustomer, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	customer, exists := m.Customers[customerID]
	if !exists {
		return nil, fmt.Errorf("customer not found: %s", customerID)
	}
	return customer, nil
}

// GetAllSubscriptionsForCustomer returns all subscriptions for a customer
func (m *MockStripeClient) GetAllSubscriptionsForCustomer(customerID string) []*MockSubscription {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var subs []*MockSubscription
	for _, sub := range m.Subscriptions {
		if sub.CustomerID == customerID {
			subs = append(subs, sub)
		}
	}
	return subs
}

// Reset clears all mock data and call counts
func (m *MockStripeClient) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.Customers = make(map[string]*MockCustomer)
	m.Subscriptions = make(map[string]*MockSubscription)
	m.Sessions = make(map[string]*MockCheckoutSession)
	m.Events = make([]*MockWebhookEvent, 0)

	m.CreateCustomerCalls = 0
	m.CreateSubscriptionCalls = 0
	m.CancelSubscriptionCalls = 0
	m.GetSubscriptionCalls = 0
	m.CreateCheckoutSessionCalls = 0

	m.CreateCustomerError = nil
	m.CreateSubscriptionError = nil
	m.CancelSubscriptionError = nil
	m.GetSubscriptionError = nil
	m.CreateCheckoutSessionError = nil
}
