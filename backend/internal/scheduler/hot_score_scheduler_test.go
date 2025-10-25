package scheduler

import (
	"context"
	"errors"
	"testing"
	"time"
)

// MockClipRepository is a mock implementation of ClipRepositoryInterface
type MockClipRepository struct {
	RefreshHotScoresCalled bool
	RefreshHotScoresError  error
}

func (m *MockClipRepository) RefreshHotScores(ctx context.Context) error {
	m.RefreshHotScoresCalled = true
	return m.RefreshHotScoresError
}

func TestNewHotScoreScheduler(t *testing.T) {
	mockRepo := &MockClipRepository{}
	scheduler := NewHotScoreScheduler(mockRepo, 10)

	if scheduler == nil {
		t.Fatal("NewHotScoreScheduler returned nil")
	}

	if scheduler.interval != 10*time.Minute {
		t.Errorf("Expected interval of 10 minutes, got %v", scheduler.interval)
	}
}

func TestHotScoreScheduler_RefreshHotScores(t *testing.T) {
	tests := []struct {
		name          string
		repoError     error
		expectSuccess bool
	}{
		{
			name:          "Successful refresh",
			repoError:     nil,
			expectSuccess: true,
		},
		{
			name:          "Failed refresh",
			repoError:     errors.New("database error"),
			expectSuccess: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockClipRepository{
				RefreshHotScoresError: tt.repoError,
			}
			scheduler := NewHotScoreScheduler(mockRepo, 10)

			ctx := context.Background()
			scheduler.refreshHotScores(ctx)

			if !mockRepo.RefreshHotScoresCalled {
				t.Error("RefreshHotScores was not called")
			}
		})
	}
}

func TestHotScoreScheduler_StartStop(t *testing.T) {
	mockRepo := &MockClipRepository{}
	scheduler := NewHotScoreScheduler(mockRepo, 1) // 1 minute interval for testing

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start scheduler in goroutine
	done := make(chan bool)
	go func() {
		scheduler.Start(ctx)
		done <- true
	}()

	// Wait a bit to ensure scheduler is running
	time.Sleep(100 * time.Millisecond)

	// Stop the scheduler
	scheduler.Stop()

	// Wait for scheduler to stop
	select {
	case <-done:
		// Success
	case <-time.After(2 * time.Second):
		t.Fatal("Scheduler did not stop in time")
	}

	// Verify that RefreshHotScores was called at least once (initial run)
	if !mockRepo.RefreshHotScoresCalled {
		t.Error("RefreshHotScores was not called during scheduler run")
	}
}

func TestHotScoreScheduler_ContextCancellation(t *testing.T) {
	mockRepo := &MockClipRepository{}
	scheduler := NewHotScoreScheduler(mockRepo, 1) // 1 minute interval for testing

	ctx, cancel := context.WithCancel(context.Background())

	// Start scheduler in goroutine
	done := make(chan bool)
	go func() {
		scheduler.Start(ctx)
		done <- true
	}()

	// Wait a bit to ensure scheduler is running
	time.Sleep(100 * time.Millisecond)

	// Cancel the context
	cancel()

	// Wait for scheduler to stop
	select {
	case <-done:
		// Success
	case <-time.After(2 * time.Second):
		t.Fatal("Scheduler did not stop after context cancellation")
	}
}
