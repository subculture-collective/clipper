package scheduler

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"
)

// mockTrendingScoreRepository is a mock implementation of TrendingScoreRepositoryInterface
type mockTrendingScoreRepository struct {
	mu           sync.Mutex
	callCount    int
	shouldFail   bool
	rowsAffected int64
}

func (m *mockTrendingScoreRepository) UpdateTrendingScores(ctx context.Context) (int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.callCount++
	
	if m.shouldFail {
		return 0, errors.New("mock error: trending score update failed")
	}
	
	return m.rowsAffected, nil
}

func (m *mockTrendingScoreRepository) getCallCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.callCount
}

func TestNewTrendingScoreScheduler(t *testing.T) {
	mockRepo := &mockTrendingScoreRepository{rowsAffected: 100}
	scheduler := NewTrendingScoreScheduler(mockRepo, 1)
	
	if scheduler == nil {
		t.Fatal("Expected scheduler to be created, got nil")
	}
	
	if scheduler.interval != time.Minute {
		t.Errorf("Expected interval to be 1 minute, got %v", scheduler.interval)
	}
}

func TestTrendingScoreScheduler_Start(t *testing.T) {
	mockRepo := &mockTrendingScoreRepository{rowsAffected: 100}
	scheduler := NewTrendingScoreScheduler(mockRepo, 1) // 1 minute interval
	
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	
	go scheduler.Start(ctx)
	
	// Wait for context to expire
	<-ctx.Done()
	
	// Verify that UpdateTrendingScores was called at least once (initial run)
	callCount := mockRepo.getCallCount()
	if callCount < 1 {
		t.Errorf("Expected at least 1 call to UpdateTrendingScores, got %d", callCount)
	}
}

func TestTrendingScoreScheduler_Stop(t *testing.T) {
	mockRepo := &mockTrendingScoreRepository{rowsAffected: 100}
	scheduler := NewTrendingScoreScheduler(mockRepo, 60) // 60 minute interval
	
	go scheduler.Start(context.Background())
	
	// Wait a bit for scheduler to start
	time.Sleep(50 * time.Millisecond)
	
	// Stop the scheduler
	scheduler.Stop()
	
	// Give it time to stop
	time.Sleep(50 * time.Millisecond)
	
	// Verify that the scheduler is stopped by checking call count doesn't increase
	initialCount := mockRepo.getCallCount()
	time.Sleep(100 * time.Millisecond)
	finalCount := mockRepo.getCallCount()
	
	if finalCount != initialCount {
		t.Errorf("Expected scheduler to be stopped, but call count increased from %d to %d", initialCount, finalCount)
	}
}

func TestTrendingScoreScheduler_ErrorHandling(t *testing.T) {
	mockRepo := &mockTrendingScoreRepository{
		shouldFail:   true,
		rowsAffected: 0,
	}
	scheduler := NewTrendingScoreScheduler(mockRepo, 1)
	
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()
	
	// This should not panic even when UpdateTrendingScores fails
	go scheduler.Start(ctx)
	
	// Wait for context to expire
	<-ctx.Done()
	
	// Verify that UpdateTrendingScores was still called despite failures
	callCount := mockRepo.getCallCount()
	if callCount < 1 {
		t.Errorf("Expected at least 1 call to UpdateTrendingScores, got %d", callCount)
	}
}
