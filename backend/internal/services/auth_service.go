package services

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

var (
	// ErrInvalidState is returned when OAuth state validation fails
	ErrInvalidState = errors.New("invalid state parameter")
	// ErrInvalidCode is returned when OAuth code is invalid
	ErrInvalidCode = errors.New("invalid authorization code")
	// ErrUserBanned is returned when a banned user tries to login
	ErrUserBanned = errors.New("user is banned")
)

// TwitchUser represents a Twitch user from the API
type TwitchUser struct {
	ID              string `json:"id"`
	Login           string `json:"login"`
	DisplayName     string `json:"display_name"`
	Email           string `json:"email"`
	ProfileImageURL string `json:"profile_image_url"`
	Description     string `json:"description"`
}

// TwitchTokenResponse represents the Twitch OAuth token response
type TwitchTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	TokenType    string `json:"token_type"`
}

// AuthService handles authentication logic
type AuthService struct {
	cfg              *config.Config
	userRepo         *repository.UserRepository
	refreshTokenRepo *repository.RefreshTokenRepository
	redis            *redispkg.Client
	jwtManager       *jwtpkg.Manager
}

// NewAuthService creates a new auth service
func NewAuthService(
	cfg *config.Config,
	userRepo *repository.UserRepository,
	refreshTokenRepo *repository.RefreshTokenRepository,
	redis *redispkg.Client,
	jwtManager *jwtpkg.Manager,
) *AuthService {
	return &AuthService{
		cfg:              cfg,
		userRepo:         userRepo,
		refreshTokenRepo: refreshTokenRepo,
		redis:            redis,
		jwtManager:       jwtManager,
	}
}

// GenerateAuthURL generates the Twitch OAuth authorization URL
func (s *AuthService) GenerateAuthURL(ctx context.Context) (string, error) {
	// Generate secure random state
	state, err := generateRandomState()
	if err != nil {
		return "", fmt.Errorf("failed to generate state: %w", err)
	}

	// Store state in Redis with 5 minute expiration
	stateKey := fmt.Sprintf("oauth:state:%s", state)
	if err := s.redis.Set(ctx, stateKey, "1", 5*time.Minute); err != nil {
		return "", fmt.Errorf("failed to store state: %w", err)
	}

	// Build authorization URL
	params := url.Values{}
	params.Add("client_id", s.cfg.Twitch.ClientID)
	params.Add("redirect_uri", s.cfg.Twitch.RedirectURI)
	params.Add("response_type", "code")
	params.Add("scope", "user:read:email")
	params.Add("state", state)

	authURL := fmt.Sprintf("https://id.twitch.tv/oauth2/authorize?%s", params.Encode())
	return authURL, nil
}

// HandleCallback handles the OAuth callback
func (s *AuthService) HandleCallback(ctx context.Context, code, state string) (*models.User, string, string, error) {
	// Validate state
	stateKey := fmt.Sprintf("oauth:state:%s", state)
	exists, err := s.redis.Exists(ctx, stateKey)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to check state: %w", err)
	}
	if !exists {
		return nil, "", "", ErrInvalidState
	}

	// Delete state to prevent reuse
	_ = s.redis.Delete(ctx, stateKey)

	// Exchange code for access token
	twitchAccessToken, err := s.exchangeCodeForToken(code)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to exchange code: %w", err)
	}

	// Fetch user profile from Twitch
	twitchUser, err := s.fetchTwitchUser(twitchAccessToken)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to fetch user: %w", err)
	}

	// Create or update user in database
	user, err := s.createOrUpdateUser(ctx, twitchUser)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to create/update user: %w", err)
	}

	// Check if user is banned
	if user.IsBanned {
		return nil, "", "", ErrUserBanned
	}

	// Update last login
	_ = s.userRepo.UpdateLastLogin(ctx, user.ID)

	// Generate JWT tokens
	accessToken, err := s.jwtManager.GenerateAccessToken(user.ID, user.Role)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to generate access token: %w", err)
	}

	refreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID)
	if err != nil {
		return nil, "", "", fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Store refresh token in database
	tokenHash := jwtpkg.HashToken(refreshToken)
	expiresAt := time.Now().Add(7 * 24 * time.Hour)
	if err := s.refreshTokenRepo.Create(ctx, user.ID, tokenHash, expiresAt); err != nil {
		return nil, "", "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return user, accessToken, refreshToken, nil
}

// RefreshAccessToken refreshes an access token using a refresh token
func (s *AuthService) RefreshAccessToken(ctx context.Context, refreshToken string) (string, string, error) {
	// Validate refresh token
	_, err := s.jwtManager.ValidateToken(refreshToken)
	if err != nil {
		return "", "", fmt.Errorf("invalid refresh token: %w", err)
	}

	// Check if token is revoked
	tokenHash := jwtpkg.HashToken(refreshToken)
	userID, expiresAt, isRevoked, err := s.refreshTokenRepo.GetByHash(ctx, tokenHash)
	if err != nil {
		return "", "", fmt.Errorf("refresh token not found: %w", err)
	}

	if isRevoked {
		return "", "", errors.New("refresh token has been revoked")
	}

	if time.Now().After(expiresAt) {
		return "", "", errors.New("refresh token has expired")
	}

	// Get user
	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return "", "", fmt.Errorf("user not found: %w", err)
	}

	if user.IsBanned {
		return "", "", ErrUserBanned
	}

	// Generate new tokens (refresh token rotation)
	newAccessToken, err := s.jwtManager.GenerateAccessToken(user.ID, user.Role)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate access token: %w", err)
	}

	newRefreshToken, err := s.jwtManager.GenerateRefreshToken(user.ID)
	if err != nil {
		return "", "", fmt.Errorf("failed to generate refresh token: %w", err)
	}

	// Revoke old refresh token
	_ = s.refreshTokenRepo.Revoke(ctx, tokenHash)

	// Store new refresh token
	newTokenHash := jwtpkg.HashToken(newRefreshToken)
	newExpiresAt := time.Now().Add(7 * 24 * time.Hour)
	if err := s.refreshTokenRepo.Create(ctx, user.ID, newTokenHash, newExpiresAt); err != nil {
		return "", "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return newAccessToken, newRefreshToken, nil
}

// Logout revokes a refresh token
func (s *AuthService) Logout(ctx context.Context, refreshToken string) error {
	tokenHash := jwtpkg.HashToken(refreshToken)
	return s.refreshTokenRepo.Revoke(ctx, tokenHash)
}

// GetUserFromToken retrieves a user from an access token
func (s *AuthService) GetUserFromToken(ctx context.Context, token string) (*models.User, error) {
	claims, err := s.jwtManager.ValidateToken(token)
	if err != nil {
		return nil, err
	}

	user, err := s.userRepo.GetByID(ctx, claims.UserID)
	if err != nil {
		return nil, err
	}

	if user.IsBanned {
		return nil, ErrUserBanned
	}

	return user, nil
}

// exchangeCodeForToken exchanges an authorization code for an access token
func (s *AuthService) exchangeCodeForToken(code string) (string, error) {
	data := url.Values{}
	data.Set("client_id", s.cfg.Twitch.ClientID)
	data.Set("client_secret", s.cfg.Twitch.ClientSecret)
	data.Set("code", code)
	data.Set("grant_type", "authorization_code")
	data.Set("redirect_uri", s.cfg.Twitch.RedirectURI)

	req, err := http.NewRequest("POST", "https://id.twitch.tv/oauth2/token", strings.NewReader(data.Encode()))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("twitch token exchange failed: %s", string(body))
	}

	var tokenResp TwitchTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return "", err
	}

	return tokenResp.AccessToken, nil
}

// fetchTwitchUser fetches user information from Twitch API
func (s *AuthService) fetchTwitchUser(accessToken string) (*TwitchUser, error) {
	req, err := http.NewRequest("GET", "https://api.twitch.tv/helix/users", nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Client-Id", s.cfg.Twitch.ClientID)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("twitch user fetch failed: %s", string(body))
	}

	var result struct {
		Data []TwitchUser `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if len(result.Data) == 0 {
		return nil, errors.New("no user data returned from Twitch")
	}

	return &result.Data[0], nil
}

// createOrUpdateUser creates a new user or updates an existing one
func (s *AuthService) createOrUpdateUser(ctx context.Context, twitchUser *TwitchUser) (*models.User, error) {
	// Try to get existing user
	existingUser, err := s.userRepo.GetByTwitchID(ctx, twitchUser.ID)
	if err == nil {
		// Update existing user
		now := time.Now()
		existingUser.Username = twitchUser.Login
		existingUser.DisplayName = twitchUser.DisplayName
		existingUser.Email = &twitchUser.Email
		existingUser.AvatarURL = &twitchUser.ProfileImageURL
		if twitchUser.Description != "" {
			existingUser.Bio = &twitchUser.Description
		}
		existingUser.LastLoginAt = &now

		if err := s.userRepo.Update(ctx, existingUser); err != nil {
			return nil, err
		}

		return existingUser, nil
	}

	// Create new user
	now := time.Now()
	user := &models.User{
		ID:          uuid.New(),
		TwitchID:    twitchUser.ID,
		Username:    twitchUser.Login,
		DisplayName: twitchUser.DisplayName,
		Email:       &twitchUser.Email,
		AvatarURL:   &twitchUser.ProfileImageURL,
		Role:        "user",
		KarmaPoints: 0,
		IsBanned:    false,
		LastLoginAt: &now,
	}

	if twitchUser.Description != "" {
		user.Bio = &twitchUser.Description
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

// generateRandomState generates a cryptographically secure random state
func generateRandomState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(b), nil
}
