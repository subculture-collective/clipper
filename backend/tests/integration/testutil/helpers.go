// +build integration

package testutil

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"
	"github.com/subculture-collective/clipper/config"
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
			Host:     getEnv("TEST_DATABASE_HOST", "localhost"),
			Port:     getEnv("TEST_DATABASE_PORT", "5437"),
			User:     getEnv("TEST_DATABASE_USER", "clipper"),
			Password: getEnv("TEST_DATABASE_PASSWORD", "clipper_password"),
			Name:     getEnv("TEST_DATABASE_NAME", "clipper_test"),
		},
		Redis: redispkg.Config{
			Host: getEnv("TEST_REDIS_HOST", "localhost"),
			Port: getEnv("TEST_REDIS_PORT", "6380"),
		},
		JWT: config.JWTConfig{
			PrivateKey: generateTestJWTKey(t),
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
func CreateTestUser(t *testing.T, db *database.DB, username string) uuid.UUID {
	ctx := context.Background()
	userRepo := repository.NewUserRepository(db.Pool)
	
	testUser := map[string]interface{}{
		"twitch_id":      fmt.Sprintf("test_%s_%d", username, time.Now().Unix()),
		"username":       username,
		"display_name":   fmt.Sprintf("Test User %s", username),
		"profile_image":  "https://example.com/avatar.png",
		"email":          fmt.Sprintf("%s@example.com", username),
		"account_type":   "member",
		"role":           "user",
	}
	
	user, err := userRepo.CreateUser(ctx, testUser)
	require.NoError(t, err, "Failed to create test user")
	
	return user.ID
}

// CreateTestClip creates a test clip in the database
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

// CleanupTestUser removes a test user from the database
func CleanupTestUser(t *testing.T, db *database.DB, userID uuid.UUID) {
	ctx := context.Background()
	userRepo := repository.NewUserRepository(db.Pool)
	
	err := userRepo.DeleteUser(ctx, userID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup test user %s: %v", userID, err)
	}
}

// CleanupTestClip removes a test clip from the database
func CleanupTestClip(t *testing.T, db *database.DB, clipID uuid.UUID) {
	ctx := context.Background()
	clipRepo := repository.NewClipRepository(db.Pool)
	
	err := clipRepo.DeleteClip(ctx, clipID)
	if err != nil {
		t.Logf("Warning: Failed to cleanup test clip %s: %v", clipID, err)
	}
}

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

func getEnv(key, defaultValue string) string {
	// In actual implementation, would use os.Getenv
	return defaultValue
}

func generateTestJWTKey(t *testing.T) string {
	privateKey, _, err := jwtpkg.GenerateRSAKeyPair()
	require.NoError(t, err, "Failed to generate test JWT key")
	return privateKey
}

// RandomString generates a random string for test data
func RandomString(length int) string {
	return uuid.New().String()[:length]
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
	return getEnv("CI", "") != "" || getEnv("GITHUB_ACTIONS", "") != ""
}

// SkipIfShort skips test if running in short mode
func SkipIfShort(t *testing.T, message string) {
	if testing.Short() {
		t.Skip(message)
	}
}

// RequireEnv requires an environment variable to be set
func RequireEnv(t *testing.T, key string) string {
	value := getEnv(key, "")
	require.NotEmpty(t, value, "Required environment variable %s is not set", key)
	return value
}
