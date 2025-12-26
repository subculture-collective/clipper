//go:build integration

package testutil

import (
	"context"
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
	"github.com/subculture-collective/clipper/internal/models"
	"github.com/subculture-collective/clipper/internal/repository"
	"github.com/subculture-collective/clipper/pkg/database"
	jwtpkg "github.com/subculture-collective/clipper/pkg/jwt"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
)

// TestConfig holds test configuration
type TestConfig struct {
	DB          *database.DB
	RedisClient *redispkg.Client
	Config      *config.Config
}

// SetupTestEnvironment initializes test database and Redis
func SetupTestEnvironment(t *testing.T) *TestConfig {
	cfg := &config.Config{
		Database: config.DatabaseConfig{
			Host:     GetEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     GetEnv("TEST_DATABASE_PORT", "5437"),
			User:     GetEnv("TEST_DATABASE_USER", "clipper"),
			Password: GetEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     GetEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: config.RedisConfig{
			Host: GetEnv("TEST_REDIS_HOST", "localhost"),
			Port: GetEnv("TEST_REDIS_PORT", "6380"),
		},
		JWT: config.JWTConfig{
			PrivateKey: GenerateTestJWTKey(t),
		},
	}

	db, err := database.NewDB(&cfg.Database)
	require.NoError(t, err, "Failed to connect to test database")

	redisClient, err := redispkg.NewClient(&cfg.Redis)
	require.NoError(t, err, "Failed to connect to test Redis")

	return &TestConfig{
		DB:          db,
		RedisClient: redisClient,
		Config:      cfg,
	}
}

// Cleanup cleans up test resources
func (tc *TestConfig) Cleanup() {
	if tc.DB != nil {
		tc.DB.Close()
	}
	if tc.RedisClient != nil {
		tc.RedisClient.Close()
	}
}

// CreateTestUser creates a test user in the database
func CreateTestUser(t *testing.T, db *database.DB, username string) *models.User {
	ctx := context.Background()
	userRepo := repository.NewUserRepository(db.Pool)

	avatarURL := "https://example.com/avatar.png"
	email := fmt.Sprintf("%s@example.com", username)
	bio := "Test user bio"
	lastLoginAt := time.Now()

	user := &models.User{
		ID:          uuid.New(),
		TwitchID:    fmt.Sprintf("test_%s_%d", username, time.Now().Unix()),
		Username:    username,
		DisplayName: fmt.Sprintf("Test User %s", username),
		AvatarURL:   &avatarURL,
		Email:       &email,
		Bio:         &bio,
		Role:        "user",
		AccountType: "member",
		LastLoginAt: &lastLoginAt,
	}

	err := userRepo.Create(ctx, user)
	require.NoError(t, err, "Failed to create test user")

	return user
}

// CreateTestClip creates a test clip in the database
// Note: This is a placeholder. Implement when needed based on actual repository methods.
/*
func CreateTestClip(t *testing.T, db *database.DB, userID uuid.UUID) uuid.UUID {
	ctx := context.Background()
	clipRepo := repository.NewClipRepository(db.Pool)

	testClip := map[string]interface{}{
		"twitch_clip_id": fmt.Sprintf("clip_%d", time.Now().Unix()),
		"title":          "Test Clip",
		"broadcaster":    "testbroadcaster",
		"url":            "https://clips.twitch.tv/testclip",
		"thumbnail_url":  "https://example.com/thumbnail.jpg",
		"view_count":     100,
		"created_at":     time.Now(),
		"submitter_id":   userID,
	}

	clip, err := clipRepo.CreateClip(ctx, testClip)
	require.NoError(t, err, "Failed to create test clip")

	return clip.ID
}
*/

// CleanupTestUser removes a test user from the database
// Note: This is a placeholder. Implement when needed based on actual repository methods.
/*
func CleanupTestUser(t *testing.T, db *database.DB, userID uuid.UUID) {
	ctx := context.Background()
	userRepo := repository.NewUserRepository(db.Pool)

	err := userRepo.DeleteUser(ctx, userID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup test user %s: %v", userID, err)
	}
}
*/

// CleanupTestClip removes a test clip from the database
// Note: This is a placeholder. Implement when needed based on actual repository methods.
/*
func CleanupTestClip(t *testing.T, db *database.DB, clipID uuid.UUID) {
	ctx := context.Background()
	clipRepo := repository.NewClipRepository(db.Pool)

	err := clipRepo.DeleteClip(ctx, clipID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup test clip %s: %v", clipID, err)
	}
}
*/

// WaitForCondition waits for a condition to become true or timeout
func WaitForCondition(t *testing.T, condition func() bool, timeout time.Duration, message string) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if condition() {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	t.Fatalf("Timeout waiting for condition: %s", message)
}

// AssertEventuallyEqual asserts that a value eventually equals expected value
func AssertEventuallyEqual(t *testing.T, getValue func() interface{}, expected interface{}, timeout time.Duration) {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		if getValue() == expected {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}
	require.Equal(t, expected, getValue(), "Value did not reach expected state within timeout")
}

// Helper functions

// GetEnv reads an environment variable or returns a default value
func GetEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// GenerateTestJWTKey generates a test JWT key pair
func GenerateTestJWTKey(t *testing.T) string {
	privateKey, _, err := jwtpkg.GenerateRSAKeyPair()
	require.NoError(t, err, "Failed to generate test JWT key")
	return privateKey
}

// RandomString generates a random string for test data
func RandomString(length int) string {
	if length <= 0 {
		return ""
	}

	s := uuid.New().String()
	if length > len(s) {
		length = len(s)
	}
	return s[:length]
}

// RandomEmail generates a random email address for testing
func RandomEmail() string {
	return fmt.Sprintf("test_%s@example.com", uuid.New().String()[:8])
}

// RandomUsername generates a random username for testing
func RandomUsername() string {
	return fmt.Sprintf("user_%s", uuid.New().String()[:8])
}

// IsCI returns true if tests are running in CI environment
func IsCI() bool {
	// Check for CI environment variables
	return GetEnv("CI", "") != "" || GetEnv("GITHUB_ACTIONS", "") != ""
}

// SkipIfShort skips test if running in short mode
func SkipIfShort(t *testing.T, message string) {
	if testing.Short() {
		t.Skip(message)
	}
}

// RequireEnv requires an environment variable to be set
func RequireEnv(t *testing.T, key string) string {
	value := GetEnv(key, "")
	require.NotEmpty(t, value, "Required environment variable %s is not set", key)
	return value
}

// GenerateTestTokens generates access and refresh tokens for a user ID
func GenerateTestTokens(t *testing.T, jwtManager *jwtpkg.Manager, userID uuid.UUID, role string) (accessToken, refreshToken string) {
	accessToken, err := jwtManager.GenerateAccessToken(userID, role)
	require.NoError(t, err, "Failed to generate access token")

	refreshToken, err = jwtManager.GenerateRefreshToken(userID)
	require.NoError(t, err, "Failed to generate refresh token")

	return accessToken, refreshToken
}

// WithTestCleanup runs a test with a cleanup function that's guaranteed to execute
// Use this pattern when you need to ensure cleanup of test data
func WithTestCleanup(t *testing.T, setup func() func(), testFn func()) {
	t.Helper()

	cleanup := setup()
	defer func() {
		if cleanup != nil {
			cleanup()
		}
	}()

	testFn()
}

// IsolatedTest runs a test with automatic cleanup of test data
// It tracks created resources and cleans them up after the test completes
// The test function receives a unique prefix to use for Redis key naming
func IsolatedTest(t *testing.T, db *database.DB, redisClient *redispkg.Client, fn func(prefix string)) {
	ctx := context.Background()

	// Generate a unique prefix for this test
	testPrefix := fmt.Sprintf("test_%s_", uuid.New().String()[:8])

	// Clean up Redis test keys after the test
	defer func() {
		if redisClient != nil {
			keys, err := redisClient.Keys(ctx, testPrefix+"*")
			if err == nil {
				for _, key := range keys {
					_ = redisClient.Delete(ctx, key)
				}
			}
		}
	}()

	// Run the test function with the prefix
	fn(testPrefix)
}

// ParallelTest marks a test as safe to run in parallel and sets up isolation
func ParallelTest(t *testing.T) {
	t.Parallel()

	// Additional parallel-safe setup can go here
	// Each parallel test should use its own test data to avoid conflicts
}

// CleanupTestData removes test data created during a test
// This is a fallback for when transactional tests aren't feasible
func CleanupTestData(t *testing.T, db *database.DB, userIDs []uuid.UUID) {
	ctx := context.Background()

	// Clean up users and their related data
	for _, userID := range userIDs {
		// Note: Actual cleanup would depend on your schema's cascade rules
		// This is a simplified version
		_, err := db.Pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
		if err != nil {
			t.Logf("Warning: Failed to cleanup user %s: %v", userID, err)
		}
	}
}

// CreateTestUserWithRole creates a test user with a specific role
func CreateTestUserWithRole(t *testing.T, db *database.DB, username string, role string) *models.User {
	user := CreateTestUser(t, db, username)

	// Update role
	ctx := context.Background()
	userRepo := repository.NewUserRepository(db.Pool)
	err := userRepo.UpdateUserRole(ctx, user.ID, role)
	require.NoError(t, err, "Failed to update user role")

	// Refetch user to get updated role
	updatedUser, err := userRepo.GetByID(ctx, user.ID)
	require.NoError(t, err, "Failed to fetch updated user")

	return updatedUser
}

// CreateTestUserWithAccountType creates a test user with a specific account type
func CreateTestUserWithAccountType(t *testing.T, db *database.DB, username string, accountType string) *models.User {
	ctx := context.Background()
	userRepo := repository.NewUserRepository(db.Pool)

	avatarURL := "https://example.com/avatar.png"
	email := fmt.Sprintf("%s@example.com", username)
	bio := "Test user bio"
	lastLoginAt := time.Now()

	user := &models.User{
		ID:          uuid.New(),
		TwitchID:    fmt.Sprintf("test_%s_%d", username, time.Now().Unix()),
		Username:    username,
		DisplayName: fmt.Sprintf("Test User %s", username),
		AvatarURL:   &avatarURL,
		Email:       &email,
		Bio:         &bio,
		Role:        "user",
		AccountType: accountType,
		LastLoginAt: &lastLoginAt,
	}

	err := userRepo.Create(ctx, user)
	require.NoError(t, err, "Failed to create test user with account type")

	return user
}

// CleanupTestUser removes a test user from the database
func CleanupTestUser(t *testing.T, db *database.DB, userID uuid.UUID) {
	ctx := context.Background()
	_, err := db.Pool.Exec(ctx, "DELETE FROM users WHERE id = $1", userID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup test user %s: %v", userID, err)
	}
}

// MockOAuthState stores a mock OAuth state in Redis for testing
func MockOAuthState(t *testing.T, redisClient *redispkg.Client, state string, codeChallenge string, codeChallengeMethod string) {
	ctx := context.Background()
	stateKey := fmt.Sprintf("oauth:state:%s", state)
	var stateValue string

	if codeChallenge != "" && codeChallengeMethod != "" {
		stateValue = fmt.Sprintf("%s:%s", codeChallenge, codeChallengeMethod)
	} else {
		stateValue = "1"
	}

	err := redisClient.Set(ctx, stateKey, stateValue, 5*time.Minute)
	require.NoError(t, err, "Failed to store mock OAuth state")
}

// GenerateTestRefreshToken stores a refresh token for testing
func GenerateTestRefreshToken(t *testing.T, db *database.DB, userID uuid.UUID, token string) {
	ctx := context.Background()
	refreshTokenRepo := repository.NewRefreshTokenRepository(db.Pool)
	
	// Hash the token before storing (tokens are stored as hashes)
	tokenHash := jwtpkg.HashToken(token)
	expiresAt := time.Now().Add(30 * 24 * time.Hour)
	err := refreshTokenRepo.Create(ctx, userID, tokenHash, expiresAt)
	require.NoError(t, err, "Failed to create test refresh token")
}

// VerifyUserDeleted checks that a user has been deleted from the database
func VerifyUserDeleted(t *testing.T, db *database.DB, userID uuid.UUID) bool {
	ctx := context.Background()
	userRepo := repository.NewUserRepository(db.Pool)

	_, err := userRepo.GetByID(ctx, userID)
	return err != nil && err == repository.ErrUserNotFound
}
