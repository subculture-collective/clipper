package services

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestCalculateNextRetry(t *testing.T) {
	tests := []struct {
		name       string
		retryCount int
		minDelay   time.Duration
		maxDelay   time.Duration
	}{
		{
			name:       "First retry - 30 seconds",
			retryCount: 0,
			minDelay:   29 * time.Second,
			maxDelay:   35 * time.Second,
		},
		{
			name:       "Second retry - 1 minute",
			retryCount: 1,
			minDelay:   55 * time.Second,
			maxDelay:   65 * time.Second,
		},
		{
			name:       "Third retry - 2 minutes",
			retryCount: 2,
			minDelay:   115 * time.Second,
			maxDelay:   125 * time.Second,
		},
		{
			name:       "High retry count caps at 1 hour",
			retryCount: 10,
			minDelay:   time.Hour - time.Second,
			maxDelay:   time.Hour + time.Second,
		},
	}

	service := &WebhookRetryService{}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			nextRetry := service.calculateNextRetry(tt.retryCount)
			delay := nextRetry.Sub(time.Now())

			assert.True(t, delay >= tt.minDelay,
				"Expected delay >= %v, got %v", tt.minDelay, delay)
			assert.True(t, delay <= tt.maxDelay,
				"Expected delay <= %v, got %v", tt.maxDelay, delay)
		})
	}
}
