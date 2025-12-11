package twitch

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/subculture-collective/clipper/config"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

const (
	baseURL         = "https://api.twitch.tv/helix"
	rateLimitPerMin = 800
)

// Client wraps the Twitch API with authentication, rate limiting, and caching
type Client struct {
	clientID       string
	httpClient     *http.Client
	cache          *RedisCache
	authManager    *AuthManager
	rateLimiter    *RateLimiter
	circuitBreaker *CircuitBreaker
}

// CircuitBreaker implements circuit breaker pattern for API availability
type CircuitBreaker struct {
	mu           sync.RWMutex
	failureCount int
	lastFailure  time.Time
	state        string // "closed", "open", "half-open"
	failureLimit int
	timeout      time.Duration
}

// NewCircuitBreaker creates a new circuit breaker
func NewCircuitBreaker(failureLimit int, timeout time.Duration) *CircuitBreaker {
	return &CircuitBreaker{
		state:        "closed",
		failureLimit: failureLimit,
		timeout:      timeout,
	}
}

// Allow checks if requests should be allowed
func (cb *CircuitBreaker) Allow() error {
	cb.mu.RLock()
	defer cb.mu.RUnlock()

	if cb.state == "open" {
		if time.Since(cb.lastFailure) > cb.timeout {
			return nil // Will transition to half-open
		}
		return &CircuitBreakerError{Message: "circuit breaker is open, API unavailable"}
	}

	return nil
}

// RecordSuccess records a successful request
func (cb *CircuitBreaker) RecordSuccess() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if cb.state == "half-open" {
		cb.state = "closed"
		cb.failureCount = 0
	}
}

// RecordFailure records a failed request
func (cb *CircuitBreaker) RecordFailure() {
	cb.mu.Lock()
	defer cb.mu.Unlock()

	cb.failureCount++
	cb.lastFailure = time.Now()

	if cb.failureCount >= cb.failureLimit {
		cb.state = "open"
		log.Printf("[Circuit Breaker] Opening circuit after %d failures", cb.failureCount)
	}
}

// NewClient creates a new Twitch API client
func NewClient(cfg *config.TwitchConfig, redis *redispkg.Client) (*Client, error) {
	if cfg.ClientID == "" || cfg.ClientSecret == "" {
		return nil, fmt.Errorf("twitch client ID and secret are required")
	}

	httpClient := &http.Client{
		Timeout: 30 * time.Second,
	}

	cache := NewRedisCache(redis)
	authManager := NewAuthManager(cfg.ClientID, cfg.ClientSecret, httpClient, cache)
	rateLimiter := NewRateLimiter(rateLimitPerMin)
	circuitBreaker := NewCircuitBreaker(5, 30*time.Second)

	client := &Client{
		clientID:       cfg.ClientID,
		httpClient:     httpClient,
		cache:          cache,
		authManager:    authManager,
		rateLimiter:    rateLimiter,
		circuitBreaker: circuitBreaker,
	}

	// Try to load token from cache
	if err := authManager.LoadFromCache(context.Background()); err != nil {
		log.Printf("Failed to load token from cache: %v", err)
		// Get a new token
		if err := authManager.RefreshToken(context.Background()); err != nil {
			return nil, fmt.Errorf("failed to get access token: %w", err)
		}
	}

	return client, nil
}

// doRequest performs an HTTP request with authentication, rate limiting, retry logic, and circuit breaker
// nolint:gocyclo // Complexity stems from retry and status handling; kept readable.
func (c *Client) doRequest(ctx context.Context, method, endpoint string, params url.Values) (*http.Response, error) {
	// Check circuit breaker
	if err := c.circuitBreaker.Allow(); err != nil {
		return nil, err
	}

	// Get valid token
	token, err := c.authManager.GetToken(ctx)
	if err != nil {
		c.circuitBreaker.RecordFailure()
		return nil, err
	}

	// Apply rate limiting
	if err := c.rateLimiter.Wait(ctx); err != nil {
		return nil, fmt.Errorf("rate limit wait cancelled: %w", err)
	}

	// Build URL
	reqURL := baseURL + endpoint
	if len(params) > 0 {
		reqURL += "?" + params.Encode()
	}

	// Retry logic with exponential backoff
	var resp *http.Response
	maxRetries := 3
	baseDelay := time.Second

	for attempt := 0; attempt < maxRetries; attempt++ {
		req, reqErr := http.NewRequestWithContext(ctx, method, reqURL, http.NoBody)
		if reqErr != nil {
			return nil, fmt.Errorf("failed to create request: %w", reqErr)
		}

		req.Header.Set("Authorization", "Bearer "+token) // #nosec G101 (value is an OAuth token, not hardcoded secret)
		req.Header.Set("Client-Id", c.clientID)

		log.Printf("[Twitch API] %s %s", method, endpoint)

		resp, err = c.httpClient.Do(req)
		if err != nil {
			c.circuitBreaker.RecordFailure()
			if attempt < maxRetries-1 {
				delay := baseDelay * time.Duration(1<<uint(attempt))
				log.Printf("Request failed (attempt %d/%d): %v, retrying in %v", attempt+1, maxRetries, err, delay)
				time.Sleep(delay)
				continue
			}
			return nil, fmt.Errorf("request failed after %d attempts: %w", maxRetries, err)
		}

		// Handle specific status codes
		switch resp.StatusCode {
		case http.StatusOK:
			c.circuitBreaker.RecordSuccess()
			return resp, nil
		case http.StatusUnauthorized:
			resp.Body.Close()
			// Token might be invalid, refresh and retry
			if err := c.authManager.RefreshToken(ctx); err != nil {
				c.circuitBreaker.RecordFailure()
				return nil, &AuthError{Message: "failed to refresh token", Err: err}
			}
			// Get new token for retry
			token, _ = c.authManager.GetToken(ctx)
			if attempt < maxRetries-1 {
				log.Printf("Token refreshed, retrying request (attempt %d/%d)", attempt+1, maxRetries)
				continue
			}
		case http.StatusTooManyRequests:
			resp.Body.Close()
			// Rate limited by Twitch, back off
			delay := baseDelay * time.Duration(1<<uint(attempt))
			if attempt < maxRetries-1 {
				log.Printf("Rate limited by Twitch (attempt %d/%d), backing off for %v", attempt+1, maxRetries, delay)
				time.Sleep(delay)
				continue
			}
			return nil, &RateLimitError{Message: "rate limited by Twitch", RetryAfter: int(delay.Seconds())}
		case http.StatusServiceUnavailable, http.StatusBadGateway, http.StatusGatewayTimeout:
			resp.Body.Close()
			// Twitch is down, retry with backoff
			c.circuitBreaker.RecordFailure()
			delay := baseDelay * time.Duration(1<<uint(attempt))
			if attempt < maxRetries-1 {
				log.Printf("Twitch service unavailable (attempt %d/%d), retrying in %v", attempt+1, maxRetries, delay)
				time.Sleep(delay)
				continue
			}
		case http.StatusNotFound:
			// Don't retry on 404, don't count as failure
			c.circuitBreaker.RecordSuccess()
			return resp, nil
		default:
			// Other errors, don't retry but don't count as circuit breaker failure
			c.circuitBreaker.RecordSuccess()
			return resp, nil
		}
	}

	c.circuitBreaker.RecordFailure()
	return resp, fmt.Errorf("request failed after %d attempts", maxRetries)
}

// GetCachedUser retrieves user data from cache
func (c *Client) GetCachedUser(ctx context.Context, userID string) (*User, error) {
	return c.cache.CachedUser(ctx, userID)
}

// GetCachedGame retrieves game data from cache
func (c *Client) GetCachedGame(ctx context.Context, gameID string) (*Game, error) {
	return c.cache.CachedGame(ctx, gameID)
}
