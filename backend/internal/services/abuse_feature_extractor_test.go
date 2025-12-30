package services

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockRedisClient is a mock implementation of Redis client for testing
type MockRedisClient struct {
	mock.Mock
}

func (m *MockRedisClient) Get(ctx context.Context, key string) (string, error) {
	args := m.Called(ctx, key)
	return args.String(0), args.Error(1)
}

func (m *MockRedisClient) Set(ctx context.Context, key string, value string, expiration time.Duration) error {
	args := m.Called(ctx, key, value, expiration)
	return args.Error(0)
}

func (m *MockRedisClient) Increment(ctx context.Context, key string) (int64, error) {
	args := m.Called(ctx, key)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRedisClient) Expire(ctx context.Context, key string, expiration time.Duration) error {
	args := m.Called(ctx, key, expiration)
	return args.Error(0)
}

func (m *MockRedisClient) SetAdd(ctx context.Context, key string, members ...string) error {
	args := m.Called(ctx, key, members)
	return args.Error(0)
}

func (m *MockRedisClient) SetCard(ctx context.Context, key string) (int64, error) {
	args := m.Called(ctx, key)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRedisClient) SetMembers(ctx context.Context, key string) ([]string, error) {
	args := m.Called(ctx, key)
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockRedisClient) SetIsMember(ctx context.Context, key string, member string) (bool, error) {
	args := m.Called(ctx, key, member)
	return args.Bool(0), args.Error(1)
}

func (m *MockRedisClient) ListPush(ctx context.Context, key string, values ...string) error {
	args := m.Called(ctx, key, values)
	return args.Error(0)
}

func (m *MockRedisClient) ListRange(ctx context.Context, key string, start, stop int64) ([]string, error) {
	args := m.Called(ctx, key, start, stop)
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockRedisClient) ListTrim(ctx context.Context, key string, start, stop int64) error {
	args := m.Called(ctx, key, start, stop)
	return args.Error(0)
}

func (m *MockRedisClient) ListLen(ctx context.Context, key string) (int64, error) {
	args := m.Called(ctx, key)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRedisClient) Delete(ctx context.Context, keys ...string) error {
	args := m.Called(ctx, keys)
	return args.Error(0)
}

func (m *MockRedisClient) Exists(ctx context.Context, key string) (bool, error) {
	args := m.Called(ctx, key)
	return args.Bool(0), args.Error(1)
}

func (m *MockRedisClient) TTL(ctx context.Context, key string) (int64, error) {
	args := m.Called(ctx, key)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockRedisClient) Keys(ctx context.Context, pattern string) ([]string, error) {
	args := m.Called(ctx, pattern)
	return args.Get(0).([]string), args.Error(1)
}

func TestAbuseFeatureExtractor_ExtractVoteFeatures(t *testing.T) {
	ctx := context.Background()
	mockRedis := new(MockRedisClient)
	extractor := NewAbuseFeatureExtractor(mockRedis)

	userID := uuid.New()
	clipID := uuid.New()
	ip := "192.168.1.1"
	userAgent := "Mozilla/5.0"
	trustScore := 75
	accountCreatedAt := time.Now().Add(-60 * 24 * time.Hour) // 60 days old

	// Setup mock expectations for velocity tracking
	mockRedis.On("Get", ctx, mock.MatchedBy(func(key string) bool {
		return key == "abuse:velocity:vote:"+userID.String()
	})).Return("2", nil)

	// Setup mock for IP user count
	mockRedis.On("SetCard", ctx, "abuse:ip:"+ip).Return(int64(3), nil)

	// Setup mock for UA user count
	mockRedis.On("SetCard", ctx, mock.AnythingOfType("string")).Return(int64(2), nil)

	// Setup mock for IP history
	mockRedis.On("SetCard", ctx, "abuse:ip:history:"+userID.String()).Return(int64(1), nil)

	// Setup mock for coordinated vote score
	mockRedis.On("SetMembers", ctx, "abuse:clip:voters:"+clipID.String()).Return([]string{}, nil)

	// Setup mock for vote pattern diversity
	mockRedis.On("Get", ctx, "abuse:votes:up:"+userID.String()).Return("5", nil)
	mockRedis.On("Get", ctx, "abuse:votes:down:"+userID.String()).Return("3", nil)

	// Setup mock for timing entropy
	mockRedis.On("ListRange", ctx, "abuse:timing:vote:"+userID.String(), int64(0), int64(9)).Return([]string{}, nil)

	// Setup mock for tracking actions
	mockRedis.On("Increment", ctx, mock.AnythingOfType("string")).Return(int64(1), nil)
	mockRedis.On("Expire", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("time.Duration")).Return(nil)
	mockRedis.On("SetAdd", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil)
	mockRedis.On("Set", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("time.Duration")).Return(nil)
	mockRedis.On("ListPush", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil)
	mockRedis.On("ListTrim", ctx, mock.AnythingOfType("string"), int64(0), int64(19)).Return(nil)

	// Extract features
	features, err := extractor.ExtractVoteFeatures(ctx, userID, clipID, ip, userAgent, trustScore, accountCreatedAt)

	assert.NoError(t, err)
	assert.NotNil(t, features)
	assert.Equal(t, trustScore, features.TrustScore)
	assert.Equal(t, int64(60), features.AccountAge)
	assert.Equal(t, int64(2), features.VotesLastHour)
	assert.Equal(t, int64(3), features.IPSharedUserCount)

	mockRedis.AssertExpectations(t)
}

func TestAbuseFeatureExtractor_ExtractFollowFeatures(t *testing.T) {
	ctx := context.Background()
	mockRedis := new(MockRedisClient)
	extractor := NewAbuseFeatureExtractor(mockRedis)

	followerID := uuid.New()
	followingID := uuid.New()
	ip := "192.168.1.1"
	userAgent := "Mozilla/5.0"
	trustScore := 50
	accountCreatedAt := time.Now().Add(-5 * 24 * time.Hour) // 5 days old

	// Setup mock expectations
	mockRedis.On("Get", ctx, mock.MatchedBy(func(key string) bool {
		return key == "abuse:velocity:follow:"+followerID.String()
	})).Return("4", nil)

	mockRedis.On("SetCard", ctx, mock.AnythingOfType("string")).Return(int64(1), nil)
	mockRedis.On("SetIsMember", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("string")).Return(false, nil)
	mockRedis.On("ListRange", ctx, mock.AnythingOfType("string"), int64(0), int64(9)).Return([]string{}, nil)
	
	mockRedis.On("Increment", ctx, mock.AnythingOfType("string")).Return(int64(1), nil)
	mockRedis.On("Expire", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("time.Duration")).Return(nil)
	mockRedis.On("SetAdd", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil)
	mockRedis.On("Set", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("time.Duration")).Return(nil)
	mockRedis.On("ListPush", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil)
	mockRedis.On("ListTrim", ctx, mock.AnythingOfType("string"), int64(0), int64(19)).Return(nil)

	// Extract features
	features, err := extractor.ExtractFollowFeatures(ctx, followerID, followingID, ip, userAgent, trustScore, accountCreatedAt)

	assert.NoError(t, err)
	assert.NotNil(t, features)
	assert.Equal(t, trustScore, features.TrustScore)
	assert.Equal(t, int64(5), features.AccountAge)
	assert.Equal(t, int64(4), features.FollowsLastHour)

	mockRedis.AssertExpectations(t)
}

func TestAbuseFeatureExtractor_CalculateBurstScore(t *testing.T) {
	mockRedis := new(MockRedisClient)
	extractor := NewAbuseFeatureExtractor(mockRedis)

	tests := []struct {
		name      string
		count     int64
		threshold int64
		wantScore float64
	}{
		{
			name:      "below threshold",
			count:     1,
			threshold: 2,
			wantScore: 0.0,
		},
		{
			name:      "at threshold",
			count:     2,
			threshold: 2,
			wantScore: 0.0,
		},
		{
			name:      "slightly above threshold",
			count:     3,
			threshold: 2,
			wantScore: 0.333,
		},
		{
			name:      "well above threshold",
			count:     10,
			threshold: 2,
			wantScore: 0.80,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := extractor.calculateBurstScore(tt.count, tt.threshold)
			assert.InDelta(t, tt.wantScore, score, 0.01, "burst score should be close to expected")
		})
	}
}

func TestNormalizeUserAgent(t *testing.T) {
	tests := []struct {
		name      string
		userAgent string
		want      string
	}{
		{
			name:      "simple user agent",
			userAgent: "Mozilla/5.0",
			want:      "mozilla/5.0",
		},
		{
			name:      "long user agent",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
			want:      "mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/91.0.4472",
		},
		{
			name:      "empty user agent",
			userAgent: "",
			want:      "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := normalizeUserAgent(tt.userAgent)
			assert.Equal(t, tt.want, got)
		})
	}
}
