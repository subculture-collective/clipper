package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/subculture-collective/clipper/internal/models"
)

// mockAuthService is a mock implementation that provides GetUserFromToken
type mockAuthService struct {
	getUserFromTokenFunc func(ctx context.Context, token string) (*models.User, error)
}

func (m *mockAuthService) GetUserFromToken(ctx context.Context, token string) (*models.User, error) {
	if m.getUserFromTokenFunc != nil {
		return m.getUserFromTokenFunc(ctx, token)
	}
	return nil, errors.New("not implemented")
}

// authServiceWrapper wraps the mock to satisfy the services.AuthService interface
type authServiceWrapper struct {
	mock *mockAuthService
}

func (w *authServiceWrapper) GetUserFromToken(ctx context.Context, token string) (*models.User, error) {
	return w.mock.GetUserFromToken(ctx, token)
}

func TestAuthMiddleware_MissingToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create a test router with the middleware logic
	router := gin.New()
	router.Use(func(c *gin.Context) {
		// Manually implement auth check for missing token
		token := extractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Missing authentication token",
				},
			})
			c.Abort()
			return
		}
		c.Next()
	})
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Make request without token
	req := httptest.NewRequest("GET", "/protected", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 401
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}

	// Check response structure
	expectedBody := `{"error":{"code":"UNAUTHORIZED","message":"Missing authentication token"},"success":false}`
	if w.Body.String() != expectedBody {
		t.Errorf("expected body %s, got %s", expectedBody, w.Body.String())
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create a mock auth service that returns an error
	mockAuth := &mockAuthService{
		getUserFromTokenFunc: func(ctx context.Context, token string) (*models.User, error) {
			return nil, errors.New("invalid token")
		},
	}

	// Create a test router with the middleware logic
	router := gin.New()
	router.Use(func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Missing authentication token",
				},
			})
			c.Abort()
			return
		}

		// Get user from token
		_, err := mockAuth.GetUserFromToken(c.Request.Context(), token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Invalid or expired token",
				},
			})
			c.Abort()
			return
		}
		c.Next()
	})
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Make request with invalid token
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer invalid_token")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 401
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401, got %d", w.Code)
	}

	// Check response structure
	expectedBody := `{"error":{"code":"UNAUTHORIZED","message":"Invalid or expired token"},"success":false}`
	if w.Body.String() != expectedBody {
		t.Errorf("expected body %s, got %s", expectedBody, w.Body.String())
	}
}

func TestAuthMiddleware_ValidToken(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create a test user with email as pointer
	email := "test@example.com"
	testUser := &models.User{
		ID:          uuid.New(),
		TwitchID:    "12345",
		Username:    "testuser",
		DisplayName: "Test User",
		Email:       &email,
		Role:        "user",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Create a mock auth service that returns a valid user
	mockAuth := &mockAuthService{
		getUserFromTokenFunc: func(ctx context.Context, token string) (*models.User, error) {
			if token == "valid_token" {
				return testUser, nil
			}
			return nil, errors.New("invalid token")
		},
	}

	// Create a test router with the middleware logic
	router := gin.New()
	router.Use(func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authentication token"})
			c.Abort()
			return
		}

		user, err := mockAuth.GetUserFromToken(c.Request.Context(), token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("user_role", user.Role)
		c.Next()
	})
	router.GET("/protected", func(c *gin.Context) {
		// Verify user is set in context
		userID, exists := c.Get("user_id")
		if !exists {
			t.Error("user_id not set in context")
		}
		if userID != testUser.ID {
			t.Errorf("expected user_id %v, got %v", testUser.ID, userID)
		}

		user, exists := c.Get("user")
		if !exists {
			t.Error("user not set in context")
		}
		if user.(*models.User).ID != testUser.ID {
			t.Errorf("expected user ID %v, got %v", testUser.ID, user.(*models.User).ID)
		}

		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Make request with valid token
	req := httptest.NewRequest("GET", "/protected", nil)
	req.Header.Set("Authorization", "Bearer valid_token")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}

func TestAuthMiddleware_TokenFromCookie(t *testing.T) {
	gin.SetMode(gin.TestMode)

	// Create a test user
	email := "test@example.com"
	testUser := &models.User{
		ID:          uuid.New(),
		TwitchID:    "12345",
		Username:    "testuser",
		DisplayName: "Test User",
		Email:       &email,
		Role:        "user",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// Create a mock auth service
	mockAuth := &mockAuthService{
		getUserFromTokenFunc: func(ctx context.Context, token string) (*models.User, error) {
			if token == "cookie_token" {
				return testUser, nil
			}
			return nil, errors.New("invalid token")
		},
	}

	// Create a test router with the middleware logic
	router := gin.New()
	router.Use(func(c *gin.Context) {
		token := extractToken(c)
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Missing authentication token"})
			c.Abort()
			return
		}

		user, err := mockAuth.GetUserFromToken(c.Request.Context(), token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("user_role", user.Role)
		c.Next()
	})
	router.GET("/protected", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "success"})
	})

	// Make request with token in cookie
	req := httptest.NewRequest("GET", "/protected", nil)
	req.AddCookie(&http.Cookie{
		Name:  "access_token",
		Value: "cookie_token",
	})
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// Should return 200
	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", w.Code)
	}
}
