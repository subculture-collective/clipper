package twitch

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/subculture-collective/clipper/config"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/pkg/utils"
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
	cb.mu.Lock()
	defer cb.mu.Unlock()

	if cb.state == "open" {
		if time.Since(cb.lastFailure) > cb.timeout {
			// Transition to half-open state
			cb.state = "half-open"
			return nil
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
	} else if cb.state == "closed" {
		// Reset failure count on success in closed state
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
		logger := utils.GetLogger()
		logger.Warn("Circuit breaker opening", map[string]interface{}{
			"failure_count": cb.failureCount,
			"component":     "twitch_client",
		})
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

		logger := utils.GetLogger()
		logger.Debug("Twitch API request", map[string]interface{}{
			"method":   method,
			"endpoint": endpoint,
		})

		resp, err = c.httpClient.Do(req)
		if err != nil {
			c.circuitBreaker.RecordFailure()
			if attempt < maxRetries-1 {
				delay := baseDelay * time.Duration(1<<uint(attempt))
				logger := utils.GetLogger()
				logger.Warn("Request failed, retrying", map[string]interface{}{
					"attempt": attempt + 1,
					"max":     maxRetries,
					"delay":   delay.String(),
					"error":   err.Error(),
				})
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
			token, err = c.authManager.GetToken(ctx)
			if err != nil {
				c.circuitBreaker.RecordFailure()
				return nil, &AuthError{Message: "failed to get token after refresh", Err: err}
			}
			if attempt < maxRetries-1 {
				logger := utils.GetLogger()
				logger.Info("Token refreshed, retrying request", map[string]interface{}{
					"attempt": attempt + 1,
					"max":     maxRetries,
				})
				continue
			}
		case http.StatusTooManyRequests:
			resp.Body.Close()
			// Rate limited by Twitch, back off
			delay := baseDelay * time.Duration(1<<uint(attempt))
			if attempt < maxRetries-1 {
				logger := utils.GetLogger()
				logger.Warn("Rate limited by Twitch", map[string]interface{}{
					"attempt": attempt + 1,
					"max":     maxRetries,
					"delay":   delay.String(),
				})
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
				logger := utils.GetLogger()
				logger.Warn("Twitch service unavailable", map[string]interface{}{
					"attempt":     attempt + 1,
					"max":         maxRetries,
					"delay":       delay.String(),
					"status_code": resp.StatusCode,
				})
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
