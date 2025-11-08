package scheduler

import (
	"context"
	"testing"
	"time"
)

// MockWebhookRetryService is a mock for testing
type MockWebhookRetryService struct {
	processCallCount int
	processError     error
}

func (m *MockWebhookRetryService) ProcessPendingRetries(ctx context.Context, batchSize int) error {
	m.processCallCount++
	return m.processError
}

func TestWebhookRetrySchedulerStartsAndStops(t *testing.T) {
	mockService := &MockWebhookRetryService{}
	scheduler := NewWebhookRetryScheduler(mockService, 1, 100)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start scheduler in goroutine
	go scheduler.Start(ctx)

	// Wait a bit for initial processing
	time.Sleep(100 * time.Millisecond)

	// Stop the scheduler
	scheduler.Stop()

	// Wait a bit for cleanup
	time.Sleep(100 * time.Millisecond)

	// Verify it was called at least once (initial run)
	if mockService.processCallCount < 1 {
		t.Errorf("Expected at least 1 call to ProcessPendingRetries, got %d", mockService.processCallCount)
	}
}

func TestWebhookRetrySchedulerProcessesMultipleTimes(t *testing.T) {
	mockService := &MockWebhookRetryService{}
	// Use very short interval for testing (0.1 seconds)
	scheduler := &WebhookRetryScheduler{
		webhookRetryService: mockService,
		interval:            100 * time.Millisecond,
		batchSize:           100,
		stopChan:            make(chan struct{}),
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start scheduler in goroutine
	go scheduler.Start(ctx)

	// Wait for multiple processing cycles (initial + 2-3 ticks)
	time.Sleep(400 * time.Millisecond)

	// Stop the scheduler
	scheduler.Stop()

	// Wait for cleanup
	time.Sleep(100 * time.Millisecond)

	// Should have been called multiple times (at least 3: initial + 2 ticks)
	if mockService.processCallCount < 3 {
		t.Errorf("Expected at least 3 calls to ProcessPendingRetries, got %d", mockService.processCallCount)
	}
}

func TestWebhookRetrySchedulerContextCancellation(t *testing.T) {
	mockService := &MockWebhookRetryService{}
	scheduler := NewWebhookRetryScheduler(mockService, 1, 100)

	ctx, cancel := context.WithCancel(context.Background())

	// Start scheduler in goroutine
	done := make(chan struct{})
	go func() {
		scheduler.Start(ctx)
		close(done)
	}()

	// Wait a bit
	time.Sleep(100 * time.Millisecond)

	// Cancel context
	cancel()

	// Wait for scheduler to stop
	select {
	case <-done:
		// Success - scheduler stopped
	case <-time.After(1 * time.Second):
		t.Error("Scheduler did not stop after context cancellation")
	}
}
