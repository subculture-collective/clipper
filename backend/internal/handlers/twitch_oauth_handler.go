package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/utils"
)

// TwitchOAuthHandler handles Twitch OAuth for chat integration
type TwitchOAuthHandler struct {
	twitchAuthRepo *repository.TwitchAuthRepository
}

// NewTwitchOAuthHandler creates a new Twitch OAuth handler
func NewTwitchOAuthHandler(twitchAuthRepo *repository.TwitchAuthRepository) *TwitchOAuthHandler {
	return &TwitchOAuthHandler{
		twitchAuthRepo: twitchAuthRepo,
	}
}

// TwitchTokenResponse represents the response from Twitch token endpoint
type TwitchTokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
	Scope        string `json:"scope"`
	TokenType    string `json:"token_type"`
}

// TwitchUserResponse represents the response from Twitch users endpoint
type TwitchUserResponse struct {
	Data []struct {
		ID    string `json:"id"`
		Login string `json:"login"`
	} `json:"data"`
}

// InitiateTwitchOAuth initiates the Twitch OAuth flow for chat
// GET /api/v1/twitch/oauth/authorize
func (h *TwitchOAuthHandler) InitiateTwitchOAuth(c *gin.Context) {
	clientID := os.Getenv("TWITCH_CLIENT_ID")
	redirectURI := os.Getenv("TWITCH_REDIRECT_URI")
	
	// For chat integration, we need chat:read and chat:edit scopes
	scopes := "chat:read chat:edit"
	
	authURL := fmt.Sprintf(
		"https://id.twitch.tv/oauth2/authorize?client_id=%s&redirect_uri=%s&response_type=code&scope=%s",
		clientID,
		url.QueryEscape(redirectURI),
		url.QueryEscape(scopes),
	)
	
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// TwitchOAuthCallback handles the OAuth callback from Twitch
// GET /api/v1/twitch/oauth/callback
func (h *TwitchOAuthHandler) TwitchOAuthCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "authorization code is required"})
		return
	}

	// Get user ID from context (middleware sets this)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		// Redirect to login if not authenticated
		c.Redirect(http.StatusTemporaryRedirect, "/login?error=authentication_required")
		return
	}
	userID := userIDVal.(uuid.UUID)

	ctx := c.Request.Context()

	// Exchange code for tokens
	clientID := os.Getenv("TWITCH_CLIENT_ID")
	clientSecret := os.Getenv("TWITCH_CLIENT_SECRET")
	redirectURI := os.Getenv("TWITCH_REDIRECT_URI")

	tokenResp, err := http.PostForm("https://id.twitch.tv/oauth2/token", url.Values{
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"code":          {code},
		"grant_type":    {"authorization_code"},
		"redirect_uri":  {redirectURI},
	})

	if err != nil {
		utils.GetLogger().Error("Failed to exchange code for tokens", err, map[string]interface{}{
			"user_id": userID.String(),
		})
		c.Redirect(http.StatusTemporaryRedirect, "/streams?error=oauth_failed")
		return
	}
	defer tokenResp.Body.Close()

	if tokenResp.StatusCode != http.StatusOK {
		utils.GetLogger().Error("Twitch token endpoint returned error", nil, map[string]interface{}{
			"status_code": tokenResp.StatusCode,
			"user_id":     userID.String(),
		})
		c.Redirect(http.StatusTemporaryRedirect, "/streams?error=oauth_failed")
		return
	}

	var tokens TwitchTokenResponse
	if err := json.NewDecoder(tokenResp.Body).Decode(&tokens); err != nil {
		utils.GetLogger().Error("Failed to decode token response", err, map[string]interface{}{
			"user_id": userID.String(),
		})
		c.Redirect(http.StatusTemporaryRedirect, "/streams?error=oauth_failed")
		return
	}

	// Get Twitch user info
	req, _ := http.NewRequest("GET", "https://api.twitch.tv/helix/users", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	req.Header.Set("Client-Id", clientID)

	userResp, err := http.DefaultClient.Do(req)
	if err != nil {
		utils.GetLogger().Error("Failed to get Twitch user info", err, map[string]interface{}{
			"user_id": userID.String(),
		})
		c.Redirect(http.StatusTemporaryRedirect, "/streams?error=oauth_failed")
		return
	}
	defer userResp.Body.Close()

	if userResp.StatusCode != http.StatusOK {
		utils.GetLogger().Error("Twitch users endpoint returned error", nil, map[string]interface{}{
			"status_code": userResp.StatusCode,
			"user_id":     userID.String(),
		})
		c.Redirect(http.StatusTemporaryRedirect, "/streams?error=oauth_failed")
		return
	}

	var userData TwitchUserResponse
	if err := json.NewDecoder(userResp.Body).Decode(&userData); err != nil {
		utils.GetLogger().Error("Failed to decode user response", err, map[string]interface{}{
			"user_id": userID.String(),
		})
		c.Redirect(http.StatusTemporaryRedirect, "/streams?error=oauth_failed")
		return
	}

	if len(userData.Data) == 0 {
		utils.GetLogger().Error("No user data returned from Twitch", nil, map[string]interface{}{
			"user_id": userID.String(),
		})
		c.Redirect(http.StatusTemporaryRedirect, "/streams?error=oauth_failed")
		return
	}

	// Store OAuth credentials
	expiresAt := time.Now().Add(time.Duration(tokens.ExpiresIn) * time.Second)
	auth := &models.TwitchAuth{
		UserID:         userID,
		TwitchUserID:   userData.Data[0].ID,
		TwitchUsername: userData.Data[0].Login,
		AccessToken:    tokens.AccessToken,
		RefreshToken:   tokens.RefreshToken,
		ExpiresAt:      expiresAt,
	}

	if err := h.twitchAuthRepo.UpsertTwitchAuth(ctx, auth); err != nil {
		utils.GetLogger().Error("Failed to store Twitch OAuth credentials", err, map[string]interface{}{
			"user_id": userID.String(),
		})
		c.Redirect(http.StatusTemporaryRedirect, "/streams?error=oauth_failed")
		return
	}

	utils.GetLogger().Info("Twitch OAuth completed successfully", map[string]interface{}{
		"user_id":         userID.String(),
		"twitch_username": userData.Data[0].Login,
	})

	// Redirect back to streams page with success message
	c.Redirect(http.StatusFound, "/streams?twitch_connected=true")
}

// GetTwitchAuthStatus returns the Twitch authentication status for the current user
// GET /api/v1/twitch/auth/status
func (h *TwitchOAuthHandler) GetTwitchAuthStatus(c *gin.Context) {
	// Get user ID from context (middleware sets this)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusOK, models.TwitchAuthStatusResponse{
			Authenticated: false,
		})
		return
	}
	userID := userIDVal.(uuid.UUID)

	ctx := c.Request.Context()

	// Get Twitch auth credentials
	auth, err := h.twitchAuthRepo.GetTwitchAuth(ctx, userID)
	if err != nil {
		utils.GetLogger().Error("Failed to get Twitch auth", err, map[string]interface{}{
			"user_id": userID.String(),
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check authentication status"})
		return
	}

	if auth == nil {
		c.JSON(http.StatusOK, models.TwitchAuthStatusResponse{
			Authenticated: false,
		})
		return
	}

	// Check if token needs refresh
	if h.twitchAuthRepo.IsTokenExpired(auth) {
		// Attempt to refresh the token
		if err := h.refreshTwitchToken(ctx, auth); err != nil {
			utils.GetLogger().Error("Failed to refresh Twitch token", err, map[string]interface{}{
				"user_id": userID.String(),
			})
			// Token refresh failed, return not authenticated
			c.JSON(http.StatusOK, models.TwitchAuthStatusResponse{
				Authenticated: false,
			})
			return
		}
	}

	c.JSON(http.StatusOK, models.TwitchAuthStatusResponse{
		Authenticated:  true,
		TwitchUsername: auth.TwitchUsername,
	})
}

// RevokeTwitchAuth revokes Twitch OAuth credentials
// DELETE /api/v1/twitch/auth
func (h *TwitchOAuthHandler) RevokeTwitchAuth(c *gin.Context) {
	// Get user ID from context (middleware sets this)
	userIDVal, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	userID := userIDVal.(uuid.UUID)

	ctx := c.Request.Context()

	// Delete Twitch auth credentials
	if err := h.twitchAuthRepo.DeleteTwitchAuth(ctx, userID); err != nil {
		utils.GetLogger().Error("Failed to revoke Twitch auth", err, map[string]interface{}{
			"user_id": userID.String(),
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke authentication"})
		return
	}

	utils.GetLogger().Info("Twitch OAuth revoked", map[string]interface{}{
		"user_id": userID.String(),
	})

	c.JSON(http.StatusOK, gin.H{"message": "Twitch authentication revoked successfully"})
}

// refreshTwitchToken refreshes an expired Twitch token
func (h *TwitchOAuthHandler) refreshTwitchToken(ctx context.Context, auth *models.TwitchAuth) error {
	clientID := os.Getenv("TWITCH_CLIENT_ID")
	clientSecret := os.Getenv("TWITCH_CLIENT_SECRET")

	tokenResp, err := http.PostForm("https://id.twitch.tv/oauth2/token", url.Values{
		"client_id":     {clientID},
		"client_secret": {clientSecret},
		"refresh_token": {auth.RefreshToken},
		"grant_type":    {"refresh_token"},
	})

	if err != nil {
		return fmt.Errorf("failed to refresh token: %w", err)
	}
	defer tokenResp.Body.Close()

	if tokenResp.StatusCode != http.StatusOK {
		return fmt.Errorf("token refresh failed with status: %d", tokenResp.StatusCode)
	}

	var tokens TwitchTokenResponse
	if err := json.NewDecoder(tokenResp.Body).Decode(&tokens); err != nil {
		return fmt.Errorf("failed to decode token response: %w", err)
	}

	// Update tokens in database
	expiresAt := time.Now().Add(time.Duration(tokens.ExpiresIn) * time.Second)
	if err := h.twitchAuthRepo.RefreshToken(ctx, auth.UserID, tokens.AccessToken, tokens.RefreshToken, expiresAt); err != nil {
		return fmt.Errorf("failed to update tokens: %w", err)
	}

	// Update the auth object with new values
	auth.AccessToken = tokens.AccessToken
	auth.RefreshToken = tokens.RefreshToken
	auth.ExpiresAt = expiresAt

	utils.GetLogger().Info("Twitch token refreshed successfully", map[string]interface{}{
		"user_id": auth.UserID.String(),
	})

	return nil
}
