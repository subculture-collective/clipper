package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/services"
)

// AuthHandler handles authentication endpoints
type AuthHandler struct {
	authService *services.AuthService
	cfg         *config.Config
}

// NewAuthHandler creates a new auth handler
func NewAuthHandler(authService *services.AuthService, cfg *config.Config) *AuthHandler {
	return &AuthHandler{
		authService: authService,
		cfg:         cfg,
	}
}

// InitiateOAuth handles GET /auth/twitch
func (h *AuthHandler) InitiateOAuth(c *gin.Context) {
	authURL, err := h.authService.GenerateAuthURL(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate auth URL",
		})
		return
	}

	// Redirect to Twitch authorization page
	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// HandleCallback handles GET /auth/twitch/callback
func (h *AuthHandler) HandleCallback(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")

	if code == "" || state == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing code or state parameter",
		})
		return
	}

	// Handle OAuth callback
	_, accessToken, refreshToken, err := h.authService.HandleCallback(c.Request.Context(), code, state)
	if err != nil {
		if err == services.ErrInvalidState {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid state parameter",
			})
			return
		}
		if err == services.ErrUserBanned {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Your account has been banned",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Authentication failed",
		})
		return
	}

	// Set HTTP-only secure cookies
	h.setAuthCookies(c, accessToken, refreshToken)

	// Get frontend URL from allowed origins (first one)
	frontendURL := "http://localhost:3000"
	origins := strings.Split(h.cfg.CORS.AllowedOrigins, ",")
	if len(origins) > 0 {
		frontendURL = origins[0]
	}

	// Redirect to frontend with success
	c.Redirect(http.StatusTemporaryRedirect, frontendURL+"/auth/success")
}

// RefreshToken handles POST /auth/refresh
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// Get refresh token from cookie or body
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		var body struct {
			RefreshToken string `json:"refresh_token"`
		}
		if err := c.ShouldBindJSON(&body); err != nil || body.RefreshToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Missing refresh token",
			})
			return
		}
		refreshToken = body.RefreshToken
	}

	// Refresh tokens
	newAccessToken, newRefreshToken, err := h.authService.RefreshAccessToken(c.Request.Context(), refreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Failed to refresh token",
		})
		return
	}

	// Set new cookies
	h.setAuthCookies(c, newAccessToken, newRefreshToken)

	c.JSON(http.StatusOK, gin.H{
		"access_token":  newAccessToken,
		"refresh_token": newRefreshToken,
	})
}

// Logout handles POST /auth/logout
func (h *AuthHandler) Logout(c *gin.Context) {
	// Get refresh token from cookie or body
	refreshToken, err := c.Cookie("refresh_token")
	if err != nil {
		var body struct {
			RefreshToken string `json:"refresh_token"`
		}
		if err := c.ShouldBindJSON(&body); err == nil && body.RefreshToken != "" {
			refreshToken = body.RefreshToken
		}
	}

	// Revoke refresh token
	if refreshToken != "" {
		_ = h.authService.Logout(c.Request.Context(), refreshToken)
	}

	// Clear cookies
	h.clearAuthCookies(c)

	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

// GetCurrentUser handles GET /auth/me
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	// Get user from context (set by auth middleware)
	userInterface, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Not authenticated",
		})
		return
	}

	c.JSON(http.StatusOK, userInterface)
}

// ReauthorizeTwitch handles POST /auth/twitch/reauthorize
// Initiates a new OAuth flow to refresh Twitch profile metadata
func (h *AuthHandler) ReauthorizeTwitch(c *gin.Context) {
	// Get user from context (set by auth middleware) - just verify they're authenticated
	_, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Not authenticated",
		})
		return
	}

	// Generate new auth URL
	authURL, err := h.authService.GenerateAuthURL(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate auth URL",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"auth_url": authURL,
	})
}

// setAuthCookies sets authentication cookies
func (h *AuthHandler) setAuthCookies(c *gin.Context, accessToken, refreshToken string) {
	isProduction := h.cfg.Server.GinMode == "release"

	// Access token cookie (15 minutes)
	c.SetCookie(
		"access_token",
		accessToken,
		900, // 15 minutes
		"/",
		"",
		isProduction, // Secure only in production
		true,         // HttpOnly
	)

	// Refresh token cookie (7 days)
	c.SetCookie(
		"refresh_token",
		refreshToken,
		604800, // 7 days
		"/",
		"",
		isProduction, // Secure only in production
		true,         // HttpOnly
	)
}

// clearAuthCookies clears authentication cookies
func (h *AuthHandler) clearAuthCookies(c *gin.Context) {
	c.SetCookie("access_token", "", -1, "/", "", false, true)
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)
}
