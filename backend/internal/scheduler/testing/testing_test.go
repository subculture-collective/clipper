package testing

import (
	"context"
	"testing"
	"time"
)

func TestMockClock_Now(t *testing.T) {
	startTime := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	clock := NewMockClock(startTime)

	if !clock.Now().Equal(startTime) {
		t.Errorf("Now() = %v, want %v", clock.Now(), startTime)
	}
}

func TestMockClock_Advance(t *testing.T) {
	startTime := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	clock := NewMockClock(startTime)

	clock.Advance(1 * time.Hour)

	expected := startTime.Add(1 * time.Hour)
	if !clock.Now().Equal(expected) {
		t.Errorf("After Advance(1h), Now() = %v, want %v", clock.Now(), expected)
	}
}

func TestMockClock_Set(t *testing.T) {
	startTime := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	clock := NewMockClock(startTime)

	newTime := time.Date(2024, 12, 31, 23, 59, 59, 0, time.UTC)
	clock.Set(newTime)

	if !clock.Now().Equal(newTime) {
		t.Errorf("After Set(), Now() = %v, want %v", clock.Now(), newTime)
	}
}

func TestMockClock_NewTicker(t *testing.T) {
	startTime := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	clock := NewMockClock(startTime)

	ticker := clock.NewTicker(1 * time.Second)
	defer ticker.Stop()

	// Advance the clock and check if ticker fires
	clock.Advance(1 * time.Second)

	select {
	case tickTime := <-ticker.C():
		if tickTime.Before(startTime) {
			t.Errorf("Tick time %v is before start time %v", tickTime, startTime)
		}
	case <-time.After(100 * time.Millisecond):
		t.Error("Ticker did not fire after Advance()")
	}
}

func TestMockClock_TickerStop(t *testing.T) {
	startTime := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	clock := NewMockClock(startTime)

	ticker := clock.NewTicker(1 * time.Second)
	ticker.Stop()

	// Advance the clock after stopping - ticker should not fire
	clock.Advance(1 * time.Second)

	select {
	case <-ticker.C():
		t.Error("Ticker fired after being stopped")
	case <-time.After(50 * time.Millisecond):
		// Expected - ticker should not fire
	}
}

func TestRealClock_Now(t *testing.T) {
	clock := RealClock{}
	now := clock.Now()

	// Just verify it returns a time
	if now.IsZero() {
		t.Error("RealClock.Now() returned zero time")
	}
}

func TestRealClock_NewTicker(t *testing.T) {
	clock := RealClock{}
	ticker := clock.NewTicker(50 * time.Millisecond)
	defer ticker.Stop()

	// Wait for at least one tick
	select {
	case <-ticker.C():
		// Success
	case <-time.After(200 * time.Millisecond):
		t.Error("RealClock ticker did not fire")
	}
}

func TestRealClock_Sleep(t *testing.T) {
	clock := RealClock{}
	start := time.Now()
	clock.Sleep(50 * time.Millisecond)
	duration := time.Since(start)

	if duration < 50*time.Millisecond {
		t.Errorf("Sleep duration %v is less than 50ms", duration)
	}
}

func TestJobExecutionHook_RecordEvents(t *testing.T) {
	hook := NewJobExecutionHook()

	hook.OnJobStart("test-job", map[string]interface{}{"key": "value"})
	hook.OnJobEnd("test-job", nil)

	events := hook.GetEvents()
	if len(events) != 2 {
		t.Errorf("Expected 2 events, got %d", len(events))
	}

	if events[0].EventType != "start" {
		t.Errorf("First event type = %s, want 'start'", events[0].EventType)
	}

	if events[1].EventType != "end" {
		t.Errorf("Second event type = %s, want 'end'", events[1].EventType)
	}
}

func TestJobExecutionHook_GetEventsByType(t *testing.T) {
	hook := NewJobExecutionHook()

	hook.OnJobStart("job1", nil)
	hook.OnJobEnd("job1", nil)
	hook.OnJobStart("job2", nil)
	hook.OnJobError("job2", nil, nil)

	startEvents := hook.GetEventsByType("start")
	if len(startEvents) != 2 {
		t.Errorf("Expected 2 start events, got %d", len(startEvents))
	}

	errorEvents := hook.GetEventsByType("error")
	if len(errorEvents) != 1 {
		t.Errorf("Expected 1 error event, got %d", len(errorEvents))
	}
}

func TestJobExecutionHook_GetEventsByJob(t *testing.T) {
	hook := NewJobExecutionHook()

	hook.OnJobStart("job1", nil)
	hook.OnJobEnd("job1", nil)
	hook.OnJobStart("job2", nil)

	job1Events := hook.GetEventsByJob("job1")
	if len(job1Events) != 2 {
		t.Errorf("Expected 2 events for job1, got %d", len(job1Events))
	}

	job2Events := hook.GetEventsByJob("job2")
	if len(job2Events) != 1 {
		t.Errorf("Expected 1 event for job2, got %d", len(job2Events))
	}
}

func TestJobExecutionHook_WaitForEvents(t *testing.T) {
	hook := NewJobExecutionHook()
	ctx := context.Background()

	// Record events in background
	go func() {
		time.Sleep(50 * time.Millisecond)
		hook.OnJobStart("test", nil)
		hook.OnJobEnd("test", nil)
	}()

	// Wait for 2 events
	ok := hook.WaitForEvents(ctx, 2, 200*time.Millisecond)
	if !ok {
		t.Error("WaitForEvents returned false, expected true")
	}
}

func TestJobExecutionHook_Clear(t *testing.T) {
	hook := NewJobExecutionHook()

	hook.OnJobStart("test", nil)
	hook.OnJobEnd("test", nil)

	if hook.GetEventCount() != 2 {
		t.Errorf("Expected 2 events before clear, got %d", hook.GetEventCount())
	}

	hook.Clear()

	if hook.GetEventCount() != 0 {
		t.Errorf("Expected 0 events after clear, got %d", hook.GetEventCount())
	}
}

func TestJobMetrics_RecordExecution(t *testing.T) {
	metrics := NewJobMetrics()

	metrics.RecordExecution(100*time.Millisecond, true, 10, 0)
	metrics.RecordExecution(200*time.Millisecond, false, 5, 2)

	if metrics.GetExecutionCount() != 2 {
		t.Errorf("ExecutionCount = %d, want 2", metrics.GetExecutionCount())
	}

	if metrics.GetSuccessCount() != 1 {
		t.Errorf("SuccessCount = %d, want 1", metrics.GetSuccessCount())
	}

	if metrics.GetErrorCount() != 1 {
		t.Errorf("ErrorCount = %d, want 1", metrics.GetErrorCount())
	}

	if metrics.GetItemsProcessed() != 15 {
		t.Errorf("ItemsProcessed = %d, want 15", metrics.GetItemsProcessed())
	}

	if metrics.GetItemsFailed() != 2 {
		t.Errorf("ItemsFailed = %d, want 2", metrics.GetItemsFailed())
	}

	avgDuration := metrics.GetAverageDuration()
	expectedAvg := 150 * time.Millisecond
	if avgDuration != expectedAvg {
		t.Errorf("AverageDuration = %v, want %v", avgDuration, expectedAvg)
	}
}

func TestJobMetrics_Reset(t *testing.T) {
	metrics := NewJobMetrics()

	metrics.RecordExecution(100*time.Millisecond, true, 10, 0)
	metrics.Reset()

	if metrics.GetExecutionCount() != 0 {
		t.Errorf("ExecutionCount after reset = %d, want 0", metrics.GetExecutionCount())
	}
}

func TestFaultInjector_FailNTimes(t *testing.T) {
	injector := NewFaultInjector()
	injector.FailNTimes(3)

	// First 3 calls should fail
	for i := 0; i < 3; i++ {
		shouldFail, err := injector.ShouldFail()
		if !shouldFail || err == nil {
			t.Errorf("Call %d: expected failure, got success", i+1)
		}
	}

	// 4th call should succeed
	shouldFail, err := injector.ShouldFail()
	if shouldFail {
		t.Errorf("Call 4: expected success, got failure: %v", err)
	}
}

func TestFaultInjector_FailAfterN(t *testing.T) {
	injector := NewFaultInjector()
	injector.FailAfterN(2)

	// First 2 calls should succeed
	for i := 0; i < 2; i++ {
		shouldFail, _ := injector.ShouldFail()
		if shouldFail {
			t.Errorf("Call %d: expected success, got failure", i+1)
		}
	}

	// 3rd call should fail (the (N+1)th call)
	shouldFail, err := injector.ShouldFail()
	if !shouldFail || err == nil {
		t.Error("Call 3: expected failure, got success")
	}

	// 4th call should succeed again
	shouldFail, _ = injector.ShouldFail()
	if shouldFail {
		t.Error("Call 4: expected success after single failure, got failure")
	}
}

func TestFaultInjector_Reset(t *testing.T) {
	injector := NewFaultInjector()
	injector.FailNTimes(5)

	// Trigger one failure
	injector.ShouldFail()

	// Reset
	injector.Reset()

	// Should not fail after reset
	shouldFail, _ := injector.ShouldFail()
	if shouldFail {
		t.Error("Expected no failure after reset")
	}
}

func TestBackoffCalculator_CalculateBackoff(t *testing.T) {
	config := RetryConfig{
		MaxAttempts:     5,
		InitialBackoff:  100,
		MaxBackoff:      5000,
		BackoffMultiple: 2.0,
	}

	calc := NewBackoffCalculator(config)

	tests := []struct {
		attempt  int
		expected int64
	}{
		{1, 100},
		{2, 200},
		{3, 400},
		{4, 800},
		{5, 1600},
	}

	for _, tt := range tests {
		backoff := calc.CalculateBackoff(tt.attempt)
		if backoff != tt.expected {
			t.Errorf("CalculateBackoff(%d) = %d, want %d", tt.attempt, backoff, tt.expected)
		}
	}
}

func TestBackoffCalculator_MaxBackoff(t *testing.T) {
	config := RetryConfig{
		MaxAttempts:     10,
		InitialBackoff:  100,
		MaxBackoff:      500,
		BackoffMultiple: 2.0,
	}

	calc := NewBackoffCalculator(config)

	// At attempt 5, backoff would be 1600 but should be capped at 500
	backoff := calc.CalculateBackoff(5)
	if backoff > config.MaxBackoff {
		t.Errorf("CalculateBackoff(5) = %d, exceeds max backoff %d", backoff, config.MaxBackoff)
	}
}

func TestRetryTracker_RecordAndGet(t *testing.T) {
	tracker := NewRetryTracker()

	tracker.RecordAttempt("op1", 1, nil, 100)
	tracker.RecordAttempt("op1", 2, nil, 200)
	tracker.RecordAttempt("op2", 1, nil, 100)

	if tracker.GetAttemptCount("op1") != 2 {
		t.Errorf("AttemptCount for op1 = %d, want 2", tracker.GetAttemptCount("op1"))
	}

	if tracker.GetAttemptCount("op2") != 1 {
		t.Errorf("AttemptCount for op2 = %d, want 1", tracker.GetAttemptCount("op2"))
	}
}

func TestRetryTracker_Clear(t *testing.T) {
	tracker := NewRetryTracker()

	tracker.RecordAttempt("op1", 1, nil, 100)
	tracker.Clear()

	if tracker.GetAttemptCount("op1") != 0 {
		t.Errorf("AttemptCount after clear = %d, want 0", tracker.GetAttemptCount("op1"))
	}
}
