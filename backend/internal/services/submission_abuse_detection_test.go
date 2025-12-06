package services

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	redispkg "github.com/subculture-collective/clipper/pkg/redis"
	"github.com/subculture-collective/clipper/config"
)

func setupTestRedis(t *testing.T) *redispkg.Client {
	// Create a test Redis client
	cfg := &config.RedisConfig{
		Host:     "localhost",
		Port:     "6379",
		Password: "",
		DB:       15, // Use a test database
	}
	
	client, err := redispkg.NewClient(cfg)
	if err != nil {
		t.Skip("Redis not available for testing")
		return nil
	}
	
	// Clear test database
	ctx := context.Background()
	_ = client.GetClient().FlushDB(ctx)
	
	return client
}

func TestSubmissionAbuseDetector_CheckSubmissionAbuse_AllowsNormalSubmission(t *testing.T) {
	redisClient := setupTestRedis(t)
	if redisClient == nil {
		return
	}
	defer redisClient.Close()
	
	detector := NewSubmissionAbuseDetector(redisClient)
	ctx := context.Background()
	userID := uuid.New()
	ip := "192.168.1.1"
	deviceFingerprint := "test-browser"
	
	result, err := detector.CheckSubmissionAbuse(ctx, userID, ip, deviceFingerprint)
	
	require.NoError(t, err)
	assert.True(t, result.Allowed)
	assert.Empty(t, result.Reason)
	assert.Empty(t, result.Severity)
}

func TestSubmissionAbuseDetector_CheckSubmissionAbuse_BlocksBurstViolation(t *testing.T) {
	redisClient := setupTestRedis(t)
	if redisClient == nil {
		return
	}
	defer redisClient.Close()
	
	detector := NewSubmissionAbuseDetector(redisClient)
	ctx := context.Background()
	userID := uuid.New()
	ip := "192.168.1.1"
	deviceFingerprint := "test-browser"
	
	// Make burst threshold + 1 submissions
	for i := 0; i < burstThreshold; i++ {
		result, err := detector.CheckSubmissionAbuse(ctx, userID, ip, deviceFingerprint)
		require.NoError(t, err)
		assert.True(t, result.Allowed)
	}
	
	// Next submission should be blocked
	result, err := detector.CheckSubmissionAbuse(ctx, userID, ip, deviceFingerprint)
	require.NoError(t, err)
	assert.False(t, result.Allowed)
	assert.Contains(t, result.Reason, "too quickly")
	assert.Equal(t, "throttle", result.Severity)
	assert.NotNil(t, result.CooldownUntil)
}

func TestSubmissionAbuseDetector_CheckSubmissionAbuse_BlocksVelocityViolation(t *testing.T) {
	redisClient := setupTestRedis(t)
	if redisClient == nil {
		return
	}
	defer redisClient.Close()
	
	detector := NewSubmissionAbuseDetector(redisClient)
	ctx := context.Background()
	userID := uuid.New()
	ip := "192.168.1.1"
	deviceFingerprint := "test-browser"
	
	// Make velocity threshold submissions with delays to avoid burst detection
	for i := 0; i < velocityThreshold; i++ {
		result, err := detector.CheckSubmissionAbuse(ctx, userID, ip, deviceFingerprint)
		require.NoError(t, err)
		assert.True(t, result.Allowed)
		time.Sleep(100 * time.Millisecond) // Avoid burst detection with minimal delay
	}
	
	// Next submission should be blocked by velocity
	result, err := detector.CheckSubmissionAbuse(ctx, userID, ip, deviceFingerprint)
	require.NoError(t, err)
	assert.False(t, result.Allowed)
	assert.Contains(t, result.Reason, "rapidly")
	assert.Equal(t, "throttle", result.Severity)
}

func TestSubmissionAbuseDetector_CheckSubmissionAbuse_DetectsIPSharing(t *testing.T) {
	redisClient := setupTestRedis(t)
	if redisClient == nil {
		return
	}
	defer redisClient.Close()
	
	detector := NewSubmissionAbuseDetector(redisClient)
	ctx := context.Background()
	ip := "192.168.1.1"
	deviceFingerprint := "test-browser"
	
	// Make submissions from multiple users on same IP
	for i := 0; i < ipSharedThreshold; i++ {
		userID := uuid.New()
		result, err := detector.CheckSubmissionAbuse(ctx, userID, ip, deviceFingerprint)
		require.NoError(t, err)
		assert.True(t, result.Allowed)
	}
	
	// Next user from same IP should get a warning
	userID := uuid.New()
	result, err := detector.CheckSubmissionAbuse(ctx, userID, ip, deviceFingerprint)
	require.NoError(t, err)
	assert.True(t, result.Allowed) // Still allowed but flagged
	assert.Equal(t, "warning", result.Severity)
}

func TestSubmissionAbuseDetector_TrackDuplicateAttempt(t *testing.T) {
	redisClient := setupTestRedis(t)
	if redisClient == nil {
		return
	}
	defer redisClient.Close()
	
	detector := NewSubmissionAbuseDetector(redisClient)
	ctx := context.Background()
	userID := uuid.New()
	ip := "192.168.1.1"
	clipID := "TestClipID123"
	
	// Track multiple duplicate attempts
	for i := 0; i < duplicateThreshold; i++ {
		err := detector.TrackDuplicateAttempt(ctx, userID, ip, clipID)
		require.NoError(t, err)
	}
	
	// User should now be in cooldown
	inCooldown, _ := detector.checkCooldown(ctx, userID)
	assert.True(t, inCooldown)
}

func TestSubmissionAbuseDetector_GetAbuseStats(t *testing.T) {
	redisClient := setupTestRedis(t)
	if redisClient == nil {
		return
	}
	defer redisClient.Close()
	
	detector := NewSubmissionAbuseDetector(redisClient)
	ctx := context.Background()
	userID := uuid.New()
	ip := "192.168.1.1"
	deviceFingerprint := "test-browser"
	
	// Make a submission to generate stats
	_, _ = detector.CheckSubmissionAbuse(ctx, userID, ip, deviceFingerprint)
	
	stats, err := detector.GetAbuseStats(ctx, userID)
	require.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Contains(t, stats, "in_cooldown")
}
