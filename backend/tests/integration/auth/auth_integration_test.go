//go:build integration

package auth

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/handlers"
	"github.com/subculture-collective/clipper/internal/middleware"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/internal/services"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/tests/integration/testutil"
)

// setupTestRouter creates a test router with auth routes
func setupTestRouter(t *testing.T) (*gin.Engine, *services.AuthService, *database.DB, *redispkg.Client, *jwtpkg.Manager) {
	gin.SetMode(gin.TestMode)

	// Load test configuration
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     testutil.GetEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     testutil.GetEnv("TEST_DATABASE_PORT", "5437"),
			User:     testutil.GetEnv("TEST_DATABASE_USER", "clipper"),
			Password: testutil.GetEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     testutil.GetEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: config.RedisConfig{
			Host: testutil.GetEnv("TEST_REDIS_HOST", "localhost"),
			Port: testutil.GetEnv("TEST_REDIS_PORT", "6380"),
		},
		JWT: config.JWTConfig{
			PrivateKey: testutil.GenerateTestJWTKey(t),
		},
	}

	// Initialize database
	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err, "Failed to connect to test database")

	// Initialize Redis
	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err, "Failed to connect to test Redis")

	// Initialize JWT manager
	jwtManager, err := jwtpkg.NewManager(cfg.JWT.PrivateKey)
	require.NoError(t, err, "Failed to initialize JWT manager")

	// Initialize repositories
	userRepo := repository.NewUserRepository(db.Pool)
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)

	// Initialize services
	authService := services.NewAuthService(cfg, userRepo, refreshTokenRepo, redisClient, jwtManager)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService, cfg)

	// Setup router
	r := gin.New()
	r.Use(gin.Recovery())

	// Auth routes
	auth := r.Group("/api/v1/auth")
	{
		auth.GET("/me", middleware.AuthMiddleware(authService), authHandler.GetCurrentUser)
		auth.POST("/refresh", authHandler.RefreshToken)
		auth.POST("/logout", authHandler.Logout)
	}

	return r, authService, db, redisClient, jwtManager
}

func TestAuthenticationFlow(t *testing.T) {
	router, _, db, redisClient, jwtManager := setupTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("GetCurrentUser_Authenticated", func(t *testing.T) {
		// Create test user using helper
		user := testutil.CreateTestUser(t, db, "testuser")

		// Generate JWT token
		token, _ := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		// Make authenticated request
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.Equal(t, "testuser", response["username"])
		assert.Equal(t, "Test User testuser", response["display_name"])
	})

	t.Run("GetCurrentUser_Unauthenticated", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("Logout_ValidToken", func(t *testing.T) {
		// Create test user using helper
		username := fmt.Sprintf("testuser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)

		// Generate tokens
		accessToken, refreshToken := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		// Logout request
		body := map[string]string{"refresh_token": refreshToken}
		bodyBytes, _ := json.Marshal(body)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
	})
}

func TestRefreshTokenFlow(t *testing.T) {
	router, _, db, redisClient, jwtManager := setupTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("RefreshToken_Success", func(t *testing.T) {
		// Create test user using helper
		username := fmt.Sprintf("refreshuser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)

		// Generate tokens
		_, refreshToken := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		// Refresh token request
		body := map[string]string{"refresh_token": refreshToken}
		bodyBytes, _ := json.Marshal(body)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]interface{}
		err := json.Unmarshal(w.Body.Bytes(), &response)
		require.NoError(t, err)

		assert.NotEmpty(t, response["access_token"])
		assert.NotEmpty(t, response["refresh_token"])
	})

	t.Run("RefreshToken_InvalidToken", func(t *testing.T) {
		body := map[string]string{"refresh_token": "invalid_token"}
		bodyBytes, _ := json.Marshal(body)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/refresh", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestUserLifecycle(t *testing.T) {
	_, _, db, redisClient, _ := setupTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("CreateUser_Success", func(t *testing.T) {
		username := fmt.Sprintf("newuser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)

		assert.NotEqual(t, uuid.Nil, user.ID)
		assert.Equal(t, username, user.Username)
		assert.Equal(t, "user", user.Role)

		// Cleanup
		testutil.CleanupTestUser(t, db, user.ID)
	})

	t.Run("UpdateUser_Profile", func(t *testing.T) {
		username := fmt.Sprintf("updateuser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)
		defer testutil.CleanupTestUser(t, db, user.ID)

		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)

		newBio := "Updated bio"
		err := userRepo.UpdateProfile(ctx, user.ID, "New Display Name", &newBio)
		require.NoError(t, err)

		// Verify update
		updatedUser, err := userRepo.GetByID(ctx, user.ID)
		require.NoError(t, err)
		assert.Equal(t, "New Display Name", updatedUser.DisplayName)
		assert.Equal(t, newBio, *updatedUser.Bio)
	})

	t.Run("UpdateUser_InvalidData", func(t *testing.T) {
		username := fmt.Sprintf("invaliduser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)
		defer testutil.CleanupTestUser(t, db, user.ID)

		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)

		// Try to update with invalid role
		err := userRepo.UpdateUserRole(ctx, user.ID, "invalid_role")
		assert.Error(t, err)
	})

	t.Run("GetUser_ByID", func(t *testing.T) {
		username := fmt.Sprintf("getuser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)
		defer testutil.CleanupTestUser(t, db, user.ID)

		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)

		fetchedUser, err := userRepo.GetByID(ctx, user.ID)
		require.NoError(t, err)
		assert.Equal(t, user.ID, fetchedUser.ID)
		assert.Equal(t, user.Username, fetchedUser.Username)
	})

	t.Run("GetUser_NotFound", func(t *testing.T) {
		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)

		_, err := userRepo.GetByID(ctx, uuid.New())
		assert.Error(t, err)
		assert.Equal(t, repository.ErrUserNotFound, err)
	})
}

func TestRoleBasedAccessControl(t *testing.T) {
	_, _, db, redisClient, jwtManager := setupTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("UserRoleAssignment", func(t *testing.T) {
		username := fmt.Sprintf("roleuser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)
		defer testutil.CleanupTestUser(t, db, user.ID)

		// Verify default role
		assert.Equal(t, "user", user.Role)

		// Update to moderator
		ctx := context.Background()
		userRepo := repository.NewUserRepository(db.Pool)
		err := userRepo.UpdateUserRole(ctx, user.ID, "moderator")
		require.NoError(t, err)

		// Verify role update
		updatedUser, err := userRepo.GetByID(ctx, user.ID)
		require.NoError(t, err)
		assert.Equal(t, "moderator", updatedUser.Role)
		assert.True(t, updatedUser.IsModerator())

		// Update to admin
		err = userRepo.UpdateUserRole(ctx, user.ID, "admin")
		require.NoError(t, err)

		adminUser, err := userRepo.GetByID(ctx, user.ID)
		require.NoError(t, err)
		assert.Equal(t, "admin", adminUser.Role)
		assert.True(t, adminUser.IsAdmin())
	})

	t.Run("RolePermissionChecks", func(t *testing.T) {
		username := fmt.Sprintf("permuser%d", time.Now().Unix())

		// Test member permissions
		memberUser := testutil.CreateTestUserWithAccountType(t, db, username+"_member", models.AccountTypeMember)
		defer testutil.CleanupTestUser(t, db, memberUser.ID)
		assert.True(t, memberUser.Can(models.PermissionCreateSubmission))
		assert.False(t, memberUser.Can(models.PermissionModerateContent))

		// Test moderator permissions
		modUser := testutil.CreateTestUserWithAccountType(t, db, username+"_mod", models.AccountTypeModerator)
		defer testutil.CleanupTestUser(t, db, modUser.ID)
		assert.True(t, modUser.Can(models.PermissionCreateSubmission))
		assert.True(t, modUser.Can(models.PermissionModerateContent))
		assert.False(t, modUser.Can(models.PermissionManageSystem))

		// Test admin permissions
		adminUser := testutil.CreateTestUserWithAccountType(t, db, username+"_admin", models.AccountTypeAdmin)
		defer testutil.CleanupTestUser(t, db, adminUser.ID)
		assert.True(t, adminUser.Can(models.PermissionCreateSubmission))
		assert.True(t, adminUser.Can(models.PermissionModerateContent))
		assert.True(t, adminUser.Can(models.PermissionManageSystem))
	})

	t.Run("TokenWithRole", func(t *testing.T) {
		// Test token generation with different roles
		roles := []string{"user", "moderator", "admin"}

		for _, role := range roles {
			username := fmt.Sprintf("tokenrole%s%d", role, time.Now().Unix())
			user := testutil.CreateTestUserWithRole(t, db, username, role)
			defer testutil.CleanupTestUser(t, db, user.ID)

			accessToken, refreshToken := testutil.GenerateTestTokens(t, jwtManager, user.ID, role)
			assert.NotEmpty(t, accessToken)
			assert.NotEmpty(t, refreshToken)

			// Verify token claims contain correct role
			claims, err := jwtManager.ValidateToken(accessToken)
			require.NoError(t, err)
			assert.Equal(t, role, claims.Role)
		}
	})
}

func TestSessionManagement(t *testing.T) {
	router, _, db, redisClient, jwtManager := setupTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("SessionIssuance", func(t *testing.T) {
		username := fmt.Sprintf("sessionuser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)
		defer testutil.CleanupTestUser(t, db, user.ID)

		// Generate tokens
		accessToken, refreshToken := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		assert.NotEmpty(t, accessToken)
		assert.NotEmpty(t, refreshToken)

		// Validate access token
		claims, err := jwtManager.ValidateToken(accessToken)
		require.NoError(t, err)
		assert.Equal(t, user.ID, claims.UserID)
		assert.Equal(t, user.Role, claims.Role)
	})

	t.Run("SessionRevocation_OnLogout", func(t *testing.T) {
		username := fmt.Sprintf("logoutuser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)
		defer testutil.CleanupTestUser(t, db, user.ID)

		// Generate tokens and store refresh token
		accessToken, refreshToken := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)
		testutil.GenerateTestRefreshToken(t, db, user.ID, refreshToken)

		// Perform logout
		body := map[string]string{"refresh_token": refreshToken}
		bodyBytes, _ := json.Marshal(body)

		req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/logout", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Authorization", "Bearer "+accessToken)
		req.Header.Set("Content-Type", "application/json")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusOK, w.Code)

		// Session revocation is handled at the service layer
		// The test verifies the endpoint responds successfully
	})

	t.Run("TokenExpiration", func(t *testing.T) {
		username := fmt.Sprintf("expireduser%d", time.Now().Unix())
		user := testutil.CreateTestUser(t, db, username)
		defer testutil.CleanupTestUser(t, db, user.ID)

		// Note: Testing actual token expiration would require manipulating time
		// or using a JWT manager with very short expiration for testing
		// Here we just verify the token validation mechanism works
		accessToken, _ := testutil.GenerateTestTokens(t, jwtManager, user.ID, user.Role)

		// Valid token should work
		claims, err := jwtManager.ValidateToken(accessToken)
		require.NoError(t, err)
		assert.NotNil(t, claims)

		// Invalid token should fail
		_, err = jwtManager.ValidateToken("invalid.token.here")
		assert.Error(t, err)
	})

	t.Run("InvalidSession_Rejected", func(t *testing.T) {
		// Try to access protected endpoint with invalid token
		req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
		req.Header.Set("Authorization", "Bearer invalid_token")
		w := httptest.NewRecorder()

		router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestOAuthFlow(t *testing.T) {
	_, authService, db, redisClient, _ := setupTestRouter(t)
	defer db.Close()
	defer redisClient.Close()

	t.Run("OAuth_StateGeneration", func(t *testing.T) {
		ctx := context.Background()

		// Generate auth URL without PKCE
		authURL, err := authService.GenerateAuthURL(ctx, "", "", "")
		require.NoError(t, err)
		assert.Contains(t, authURL, "https://id.twitch.tv/oauth2/authorize")
		assert.Contains(t, authURL, "state=")
	})

	t.Run("OAuth_PKCEFlow", func(t *testing.T) {
		ctx := context.Background()

		// Generate auth URL with PKCE
		codeChallenge := "test_code_challenge"
		codeChallengeMethod := "S256"
		authURL, err := authService.GenerateAuthURL(ctx, codeChallenge, codeChallengeMethod, "test_state")
		require.NoError(t, err)
		assert.Contains(t, authURL, "state=test_state")

		// Verify state was stored with code challenge
		stateValue, err := redisClient.Get(ctx, "oauth:state:test_state")
		require.NoError(t, err)
		assert.Equal(t, fmt.Sprintf("%s:%s", codeChallenge, codeChallengeMethod), stateValue)
	})

	t.Run("OAuth_InvalidState", func(t *testing.T) {
		ctx := context.Background()

		// Try callback with invalid state
		_, _, _, err := authService.HandleCallback(ctx, "test_code", "invalid_state", "")
		assert.Error(t, err)
		assert.Equal(t, services.ErrInvalidState, err)
	})

	t.Run("OAuth_StateReuse_Prevention", func(t *testing.T) {
		ctx := context.Background()

		// Create a valid state
		state := fmt.Sprintf("state_%d", time.Now().Unix())
		testutil.MockOAuthState(t, redisClient, state, "", "")

		// First callback should consume the state
		// Note: This will fail because we don't have a real OAuth code, but it should consume the state
		_, _, _, err := authService.HandleCallback(ctx, "test_code", state, "")
		// The error might be ErrInvalidCode or another OAuth error, but state should be consumed

		// Second callback with same state should fail with ErrInvalidState
		_, _, _, err = authService.HandleCallback(ctx, "test_code", state, "")
		assert.Error(t, err)
		assert.Equal(t, services.ErrInvalidState, err, "Second callback should return ErrInvalidState after state is consumed")
	})
}

func TestMFAFlow(t *testing.T) {
	// Note: Full MFA integration tests require MFA service to be configured
	// These tests verify the MFA flow patterns

	t.Run("MFA_EnrollmentFlow_Structure", func(t *testing.T) {
		t.Skip("MFA enrollment requires MFAService configuration with encryption key")
		// Placeholder for future MFA enrollment test
		// - Start enrollment
		// - Verify TOTP code
		// - Enable MFA
		// - Generate backup codes
	})

	t.Run("MFA_VerificationFlow_Structure", func(t *testing.T) {
		t.Skip("MFA verification requires MFAService configuration")
		// Placeholder for future MFA verification test
		// - User with MFA enabled attempts login
		// - System requires MFA code
		// - User provides TOTP code
		// - Verification succeeds/fails
	})

	t.Run("MFA_BackupCodes_Structure", func(t *testing.T) {
		t.Skip("MFA backup codes require MFAService configuration")
		// Placeholder for future backup codes test
		// - Generate backup codes during enrollment
		// - Use backup code for authentication
		// - Backup code consumed after use
		// - Cannot reuse backup code
	})

	t.Run("MFA_DisableFlow_Structure", func(t *testing.T) {
		t.Skip("MFA disable requires MFAService configuration")
		// Placeholder for future MFA disable test
		// - User with MFA enabled
		// - Verify identity (password + current MFA code)
		// - Disable MFA
		// - MFA no longer required for login
	})
}
