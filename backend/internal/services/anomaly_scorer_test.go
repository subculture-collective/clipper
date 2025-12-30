package services

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestAnomalyScorer_ScoreVelocity(t *testing.T) {
	mockRedis := new(MockRedisClient)
	featureExtractor := NewAbuseFeatureExtractor(mockRedis)
	scorer := NewAnomalyScorer(mockRedis, featureExtractor, nil)

	tests := []struct {
		name           string
		shortTermCount int64
		longTermCount  int64
		shortThreshold int64
		longThreshold  int64
		wantScore      float64
	}{
		{
			name:           "normal velocity",
			shortTermCount: 1,
			longTermCount:  5,
			shortThreshold: 2,
			longThreshold:  10,
			wantScore:      0.0,
		},
		{
			name:           "high short term velocity",
			shortTermCount: 5,
			longTermCount:  8,
			shortThreshold: 2,
			longThreshold:  10,
			wantScore:      1.05, // weighted: 0.7 * 1.5 = 1.05, capped at 1.0
		},
		{
			name:           "moderate velocity",
			shortTermCount: 3,
			longTermCount:  12,
			shortThreshold: 2,
			longThreshold:  10,
			wantScore:      0.41, // weighted: 0.7 * 0.5 + 0.3 * 0.2 = 0.41
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := scorer.scoreVelocity(tt.shortTermCount, tt.longTermCount, tt.shortThreshold, tt.longThreshold)
			if tt.wantScore > 1.0 {
				assert.LessOrEqual(t, score, 1.0, "score should be capped at 1.0")
			} else {
				assert.InDelta(t, tt.wantScore, score, 0.02, "velocity score should be close to expected")
			}
		})
	}
}

func TestAnomalyScorer_ScoreIPUA(t *testing.T) {
	mockRedis := new(MockRedisClient)
	featureExtractor := NewAbuseFeatureExtractor(mockRedis)
	scorer := NewAnomalyScorer(mockRedis, featureExtractor, nil)

	tests := []struct {
		name         string
		ipUserCount  int64
		uaUserCount  int64
		ipChangeFreq float64
		wantScore    float64
	}{
		{
			name:         "normal IP/UA usage",
			ipUserCount:  2,
			uaUserCount:  1,
			ipChangeFreq: 1.0,
			wantScore:    0.03, // only IP hopping contributes
		},
		{
			name:         "shared IP",
			ipUserCount:  15,
			uaUserCount:  2,
			ipChangeFreq: 1.0,
			wantScore:    0.53, // 0.5 * 1.0 + 0.03 = 0.53
		},
		{
			name:         "IP hopping",
			ipUserCount:  3,
			uaUserCount:  1,
			ipChangeFreq: 8.0,
			wantScore:    0.24, // mainly from IP hopping: 0.3 * 0.8
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := scorer.scoreIPUA(tt.ipUserCount, tt.uaUserCount, tt.ipChangeFreq)
			assert.InDelta(t, tt.wantScore, score, 0.02, "IP/UA score should be close to expected")
		})
	}
}

func TestAnomalyScorer_ScoreTrustScore(t *testing.T) {
	mockRedis := new(MockRedisClient)
	featureExtractor := NewAbuseFeatureExtractor(mockRedis)
	scorer := NewAnomalyScorer(mockRedis, featureExtractor, nil)

	tests := []struct {
		name       string
		trustScore int
		wantScore  float64
	}{
		{
			name:       "high trust",
			trustScore: 85,
			wantScore:  0.0,
		},
		{
			name:       "medium trust",
			trustScore: 60,
			wantScore:  0.3,
		},
		{
			name:       "low trust",
			trustScore: 40,
			wantScore:  0.6,
		},
		{
			name:       "very low trust",
			trustScore: 10,
			wantScore:  0.9,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := scorer.scoreTrustScore(tt.trustScore)
			assert.Equal(t, tt.wantScore, score, "trust score conversion should match expected")
		})
	}
}

func TestAnomalyScorer_DetermineSeverity(t *testing.T) {
	mockRedis := new(MockRedisClient)
	featureExtractor := NewAbuseFeatureExtractor(mockRedis)
	scorer := NewAnomalyScorer(mockRedis, featureExtractor, nil)

	tests := []struct {
		name     string
		score    float64
		expected string
	}{
		{
			name:     "none",
			score:    0.2,
			expected: "none",
		},
		{
			name:     "low",
			score:    0.35,
			expected: "low",
		},
		{
			name:     "medium",
			score:    0.55,
			expected: "medium",
		},
		{
			name:     "high",
			score:    0.75,
			expected: "high",
		},
		{
			name:     "critical",
			score:    0.9,
			expected: "critical",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			severity := scorer.determineSeverity(tt.score)
			assert.Equal(t, tt.expected, severity)
		})
	}
}

func TestAnomalyScorer_CalculateConfidence(t *testing.T) {
	mockRedis := new(MockRedisClient)
	featureExtractor := NewAbuseFeatureExtractor(mockRedis)
	scorer := NewAnomalyScorer(mockRedis, featureExtractor, nil)

	tests := []struct {
		name        string
		features    *AbuseFeatures
		wantMin     float64
		wantMax     float64
	}{
		{
			name: "no data",
			features: &AbuseFeatures{
				AccountAge: 0,
				TrustScore: 0,
			},
			wantMin: 0.0,
			wantMax: 0.2,
		},
		{
			name: "some data",
			features: &AbuseFeatures{
				VotesLastHour:      5,
				IPSharedUserCount:  3,
				AccountAge:         10,
				TrustScore:         50,
			},
			wantMin: 0.6,
			wantMax: 0.9,
		},
		{
			name: "full data with old account",
			features: &AbuseFeatures{
				VotesLastHour:      10,
				IPSharedUserCount:  5,
				AccountAge:         60,
				TimingEntropy:      0.5,
				TrustScore:         75,
			},
			wantMin: 0.9,
			wantMax: 1.0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			confidence := scorer.calculateConfidence(tt.features)
			assert.GreaterOrEqual(t, confidence, tt.wantMin, "confidence should be at least minimum")
			assert.LessOrEqual(t, confidence, tt.wantMax, "confidence should not exceed maximum")
		})
	}
}

func TestAnomalyScorer_ScoreVoteAction_HighAnomaly(t *testing.T) {
	ctx := context.Background()
	mockRedis := new(MockRedisClient)
	featureExtractor := NewAbuseFeatureExtractor(mockRedis)
	scorer := NewAnomalyScorer(mockRedis, featureExtractor, nil)

	userID := uuid.New()
	clipID := uuid.New()
	ip := "192.168.1.1"
	userAgent := "Mozilla/5.0"
	trustScore := 20 // low trust
	accountCreatedAt := time.Now().Add(-2 * 24 * time.Hour) // new account

	// Setup mock for high velocity
	mockRedis.On("Get", ctx, mock.MatchedBy(func(key string) bool {
		return key == "abuse:velocity:vote:"+userID.String()
	})).Return("15", nil) // high velocity

	// Setup mocks for other features
	mockRedis.On("SetCard", ctx, mock.AnythingOfType("string")).Return(int64(12), nil) // shared IP
	mockRedis.On("SetMembers", ctx, mock.AnythingOfType("string")).Return([]string{userID.String(), uuid.New().String()}, nil)
	mockRedis.On("Get", ctx, "abuse:user:last_ip:"+userID.String()).Return(ip, nil)
	mockRedis.On("Get", ctx, mock.MatchedBy(func(key string) bool {
		return key != "abuse:velocity:vote:"+userID.String() && key != "abuse:user:last_ip:"+userID.String()
	})).Return("10", nil)
	mockRedis.On("ListRange", ctx, mock.AnythingOfType("string"), int64(0), int64(9)).Return([]string{}, nil)
	mockRedis.On("Increment", ctx, mock.AnythingOfType("string")).Return(int64(1), nil)
	mockRedis.On("Expire", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("time.Duration")).Return(nil)
	mockRedis.On("SetAdd", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil)
	mockRedis.On("Set", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("time.Duration")).Return(nil)
	mockRedis.On("ListPush", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil)
	mockRedis.On("ListTrim", ctx, mock.AnythingOfType("string"), int64(0), int64(19)).Return(nil)

	// Score the action
	score, err := scorer.ScoreVoteAction(ctx, userID, clipID, 1, ip, userAgent, trustScore, accountCreatedAt)

	assert.NoError(t, err)
	assert.NotNil(t, score)
	assert.True(t, score.IsAnomaly, "should be detected as anomaly")
	assert.GreaterOrEqual(t, score.OverallScore, 0.5, "score should be high for suspicious activity")
	assert.Contains(t, []string{"high", "critical"}, score.Severity, "severity should be high or critical")
	assert.Greater(t, len(score.ReasonCodes), 0, "should have reason codes")

	mockRedis.AssertExpectations(t)
}

func TestAnomalyScorer_ScoreVoteAction_Normal(t *testing.T) {
	ctx := context.Background()
	mockRedis := new(MockRedisClient)
	featureExtractor := NewAbuseFeatureExtractor(mockRedis)
	scorer := NewAnomalyScorer(mockRedis, featureExtractor, nil)

	userID := uuid.New()
	clipID := uuid.New()
	ip := "192.168.1.1"
	userAgent := "Mozilla/5.0"
	trustScore := 80 // high trust
	accountCreatedAt := time.Now().Add(-180 * 24 * time.Hour) // old account

	// Setup mock for normal activity
	mockRedis.On("Get", ctx, mock.AnythingOfType("string")).Return("1", nil) // low velocity
	mockRedis.On("SetCard", ctx, mock.AnythingOfType("string")).Return(int64(1), nil) // unique IP
	mockRedis.On("SetMembers", ctx, mock.AnythingOfType("string")).Return([]string{}, nil)
	mockRedis.On("ListRange", ctx, mock.AnythingOfType("string"), int64(0), int64(9)).Return([]string{
		"1000", "2000", "3500", "5200", // varied timing
	}, nil)
	mockRedis.On("Increment", ctx, mock.AnythingOfType("string")).Return(int64(1), nil)
	mockRedis.On("Expire", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("time.Duration")).Return(nil)
	mockRedis.On("SetAdd", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil)
	mockRedis.On("Set", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("string"), mock.AnythingOfType("time.Duration")).Return(nil)
	mockRedis.On("ListPush", ctx, mock.AnythingOfType("string"), mock.Anything).Return(nil)
	mockRedis.On("ListTrim", ctx, mock.AnythingOfType("string"), int64(0), int64(19)).Return(nil)

	// Score the action
	score, err := scorer.ScoreVoteAction(ctx, userID, clipID, 1, ip, userAgent, trustScore, accountCreatedAt)

	assert.NoError(t, err)
	assert.NotNil(t, score)
	assert.False(t, score.ShouldAutoFlag, "normal activity should not be auto-flagged")
	assert.Less(t, score.OverallScore, 0.5, "score should be low for normal activity")

	mockRedis.AssertExpectations(t)
}
