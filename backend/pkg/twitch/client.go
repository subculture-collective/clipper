package twitch

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"sync"
	"time"

	"github.com/subculture-collective/clipper/config"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

const (
	baseURL = "https://api.twitch.tv/helix"
	tokenURL = "https://id.twitch.tv/oauth2/token" // #nosec G101 -- not a credential, just OAuth endpoint URL
	rateLimitPerMin = 800
	cacheKeyPrefix  = "twitch:"
)

// Client wraps the Twitch API with authentication, rate limiting, and caching
type Client struct {
	clientID     string
	clientSecret string
	httpClient   *http.Client
	redis        *redispkg.Client
	mu           sync.RWMutex
	accessToken  string
	tokenExpiry  time.Time
	rateLimiter  *RateLimiter
}

// RateLimiter implements token bucket rate limiting
type RateLimiter struct {
	tokens    int
	maxTokens int
	refillAt  time.Time
	mu        sync.Mutex
}

// NewClient creates a new Twitch API client
func NewClient(cfg *config.TwitchConfig, redis *redispkg.Client) (*Client, error) {
	if cfg.ClientID == "" || cfg.ClientSecret == "" {
		return nil, fmt.Errorf("twitch client ID and secret are required")
	}

	client := &Client{
		clientID:     cfg.ClientID,
		clientSecret: cfg.ClientSecret,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		redis: redis,
		rateLimiter: &RateLimiter{
			tokens:    rateLimitPerMin,
			maxTokens: rateLimitPerMin,
			refillAt:  time.Now().Add(time.Minute),
		},
	}

	// Try to load token from cache
	if err := client.loadTokenFromCache(context.Background()); err != nil {
		log.Printf("Failed to load token from cache: %v", err)
	}

	// If no cached token, get a new one
	if client.accessToken == "" || time.Now().After(client.tokenExpiry) {
		if err := client.refreshAccessToken(context.Background()); err != nil {
			return nil, fmt.Errorf("failed to get access token: %w", err)
		}
	}

	return client, nil
}

// loadTokenFromCache loads the access token from Redis cache
func (c *Client) loadTokenFromCache(ctx context.Context) error {
	token, err := c.redis.Get(ctx, cacheKeyPrefix+"access_token")
	if err != nil {
		return err
	}

	expiryStr, err := c.redis.Get(ctx, cacheKeyPrefix+"token_expiry")
	if err != nil {
		return err
	}

	expiry, err := time.Parse(time.RFC3339, expiryStr)
	if err != nil {
		return err
	}

	c.mu.Lock()
	c.accessToken = token
	c.tokenExpiry = expiry
	c.mu.Unlock()

	return nil
}

// saveTokenToCache saves the access token to Redis cache
func (c *Client) saveTokenToCache(ctx context.Context) error {
	c.mu.RLock()
	defer c.mu.RUnlock()

	ttl := time.Until(c.tokenExpiry)
	if ttl <= 0 {
		return nil
	}

	if err := c.redis.Set(ctx, cacheKeyPrefix+"access_token", c.accessToken, ttl); err != nil {
		return err
	}

	if err := c.redis.Set(ctx, cacheKeyPrefix+"token_expiry", c.tokenExpiry.Format(time.RFC3339), ttl); err != nil {
		return err
	}

	return nil
}

// refreshAccessToken obtains a new app access token
func (c *Client) refreshAccessToken(ctx context.Context) error {
	data := url.Values{}
	data.Set("client_id", c.clientID)
	data.Set("client_secret", c.clientSecret)
	data.Set("grant_type", "client_credentials")

	req, err := http.NewRequestWithContext(ctx, "POST", tokenURL, http.NoBody)
	if err != nil {
		return fmt.Errorf("failed to create token request: %w", err)
	}

	req.URL.RawQuery = data.Encode()
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to request token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("token request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var tokenResp struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
		TokenType   string `json:"token_type"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return fmt.Errorf("failed to decode token response: %w", err)
	}

	c.mu.Lock()
	c.accessToken = tokenResp.AccessToken
	// Refresh 5 minutes before actual expiry to be safe
	c.tokenExpiry = time.Now().Add(time.Duration(tokenResp.ExpiresIn-300) * time.Second)
	c.mu.Unlock()

	// Save to cache
	if err := c.saveTokenToCache(ctx); err != nil {
		log.Printf("Failed to cache token: %v", err)
	}

	log.Printf("Successfully obtained new Twitch access token (expires in %d seconds)", tokenResp.ExpiresIn)
	return nil
}

// ensureValidToken checks if the token is valid and refreshes if needed
func (c *Client) ensureValidToken(ctx context.Context) error {
	c.mu.RLock()
	needsRefresh := time.Now().After(c.tokenExpiry)
	c.mu.RUnlock()

	if needsRefresh {
		return c.refreshAccessToken(ctx)
	}

	return nil
}

// waitForRateLimit implements rate limiting with token bucket algorithm
func (c *Client) waitForRateLimit(ctx context.Context) error {
	c.rateLimiter.mu.Lock()
	defer c.rateLimiter.mu.Unlock()

	// Refill tokens if minute has passed
	if time.Now().After(c.rateLimiter.refillAt) {
		c.rateLimiter.tokens = c.rateLimiter.maxTokens
		c.rateLimiter.refillAt = time.Now().Add(time.Minute)
	}

	// Wait if no tokens available
	if c.rateLimiter.tokens <= 0 {
		waitTime := time.Until(c.rateLimiter.refillAt)
		if waitTime > 0 {
			log.Printf("Rate limit reached, waiting %v", waitTime)
			timer := time.NewTimer(waitTime)
			defer timer.Stop()

			select {
			case <-timer.C:
				c.rateLimiter.tokens = c.rateLimiter.maxTokens
				c.rateLimiter.refillAt = time.Now().Add(time.Minute)
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}

	c.rateLimiter.tokens--
	return nil
}

// doRequest performs an HTTP request with authentication, rate limiting, and retry logic
// nolint:gocyclo // Complexity stems from retry and status handling; kept readable.
func (c *Client) doRequest(ctx context.Context, method, endpoint string, params url.Values) (*http.Response, error) {
	// Ensure token is valid
	if err := c.ensureValidToken(ctx); err != nil {
		return nil, fmt.Errorf("failed to ensure valid token: %w", err)
	}

	// Apply rate limiting
	if err := c.waitForRateLimit(ctx); err != nil {
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

		c.mu.RLock()
		req.Header.Set("Authorization", "Bearer "+c.accessToken) // #nosec G101 (value is an OAuth token, not hardcoded secret)
		c.mu.RUnlock()
		req.Header.Set("Client-Id", c.clientID)

		log.Printf("[Twitch API] %s %s", method, endpoint)

		var err error
		resp, err = c.httpClient.Do(req)
		if err != nil {
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
			return resp, nil
		case http.StatusUnauthorized:
			resp.Body.Close()
			// Token might be invalid, refresh and retry
			if err := c.refreshAccessToken(ctx); err != nil {
				return nil, fmt.Errorf("failed to refresh token: %w", err)
			}
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
		case http.StatusServiceUnavailable:
			resp.Body.Close()
			// Twitch is down, retry with backoff
			delay := baseDelay * time.Duration(1<<uint(attempt))
			if attempt < maxRetries-1 {
				log.Printf("Twitch service unavailable (attempt %d/%d), retrying in %v", attempt+1, maxRetries, delay)
				time.Sleep(delay)
				continue
			}
		case http.StatusNotFound:
			// Don't retry on 404
			return resp, nil
		default:
			// Other errors, don't retry
			return resp, nil
		}
	}

	return resp, fmt.Errorf("request failed after %d attempts", maxRetries)
}

// GetClips fetches clips from Twitch API
func (c *Client) GetClips(ctx context.Context, params *ClipParams) (*ClipsResponse, error) {
	urlParams := url.Values{}

	if params.BroadcasterID != "" {
		urlParams.Set("broadcaster_id", params.BroadcasterID)
	}
	if params.GameID != "" {
		urlParams.Set("game_id", params.GameID)
	}
	if len(params.ClipIDs) > 0 {
		for _, id := range params.ClipIDs {
			urlParams.Add("id", id)
		}
	}
	if !params.StartedAt.IsZero() {
		urlParams.Set("started_at", params.StartedAt.Format(time.RFC3339))
	}
	if !params.EndedAt.IsZero() {
		urlParams.Set("ended_at", params.EndedAt.Format(time.RFC3339))
	}
	if params.First > 0 {
		urlParams.Set("first", fmt.Sprintf("%d", params.First))
	}
	if params.After != "" {
		urlParams.Set("after", params.After)
	}
	if params.Before != "" {
		urlParams.Set("before", params.Before)
	}

	resp, err := c.doRequest(ctx, "GET", "/clips", urlParams)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("clips request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var clipsResp ClipsResponse
	if err := json.NewDecoder(resp.Body).Decode(&clipsResp); err != nil {
		return nil, fmt.Errorf("failed to decode clips response: %w", err)
	}

	log.Printf("[Twitch API] Fetched %d clips", len(clipsResp.Data))
	return &clipsResp, nil
}

// GetUsers fetches user information from Twitch API
func (c *Client) GetUsers(ctx context.Context, userIDs, logins []string) (*UsersResponse, error) {
	urlParams := url.Values{}

	for _, id := range userIDs {
		urlParams.Add("id", id)
	}
	for _, login := range logins {
		urlParams.Add("login", login)
	}

	resp, err := c.doRequest(ctx, "GET", "/users", urlParams)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("users request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var usersResp UsersResponse
	if err := json.NewDecoder(resp.Body).Decode(&usersResp); err != nil {
		return nil, fmt.Errorf("failed to decode users response: %w", err)
	}

	// Cache user data
	for i := range usersResp.Data {
		user := &usersResp.Data[i]
		cacheKey := fmt.Sprintf("%suser:%s", cacheKeyPrefix, user.ID)
		userData, err := json.Marshal(user)
		if err != nil {
			log.Printf("Failed to marshal user data for user ID %s: %v", user.ID, err)
			continue
		}
		if err := c.redis.Set(ctx, cacheKey, string(userData), time.Hour); err != nil {
			log.Printf("Failed to cache user data for user ID %s: %v", user.ID, err)
		}
	}

	log.Printf("[Twitch API] Fetched %d users", len(usersResp.Data))
	return &usersResp, nil
}

// GetGames fetches game information from Twitch API
func (c *Client) GetGames(ctx context.Context, gameIDs, names []string) (*GamesResponse, error) {
	urlParams := url.Values{}

	for _, id := range gameIDs {
		urlParams.Add("id", id)
	}
	for _, name := range names {
		urlParams.Add("name", name)
	}

	resp, err := c.doRequest(ctx, "GET", "/games", urlParams)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("games request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var gamesResp GamesResponse
	if err := json.NewDecoder(resp.Body).Decode(&gamesResp); err != nil {
		return nil, fmt.Errorf("failed to decode games response: %w", err)
	}

	// Cache game data
	for i := range gamesResp.Data {
		game := &gamesResp.Data[i]
		cacheKey := fmt.Sprintf("%sgame:%s", cacheKeyPrefix, game.ID)
		gameData, err := json.Marshal(game)
		if err != nil {
			log.Printf("Failed to marshal game data for game ID %s: %v", game.ID, err)
			continue
		}
		if err := c.redis.Set(ctx, cacheKey, string(gameData), time.Hour); err != nil {
			log.Printf("Failed to cache game data: %v", err)
		}
	}

	log.Printf("[Twitch API] Fetched %d games", len(gamesResp.Data))
	return &gamesResp, nil
}

// GetCachedUser retrieves user data from cache
func (c *Client) GetCachedUser(ctx context.Context, userID string) (*User, error) {
	cacheKey := fmt.Sprintf("%suser:%s", cacheKeyPrefix, userID)
	userData, err := c.redis.Get(ctx, cacheKey)
	if err != nil {
		return nil, err
	}

	var user User
	if err := json.Unmarshal([]byte(userData), &user); err != nil {
		return nil, err
	}

	return &user, nil
}

// GetCachedGame retrieves game data from cache
func (c *Client) GetCachedGame(ctx context.Context, gameID string) (*Game, error) {
	cacheKey := fmt.Sprintf("%sgame:%s", cacheKeyPrefix, gameID)
	gameData, err := c.redis.Get(ctx, cacheKey)
	if err != nil {
		return nil, err
	}

	var game Game
	if err := json.Unmarshal([]byte(gameData), &game); err != nil {
		return nil, err
	}

	return &game, nil
}
