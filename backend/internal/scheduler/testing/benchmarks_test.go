package testing

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"
)

// BenchmarkMockClock_Now benchmarks the mock clock Now operation
func BenchmarkMockClock_Now(b *testing.B) {
	clock := NewMockClock(time.Now())
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = clock.Now()
	}
}

// BenchmarkMockClock_Advance benchmarks clock advancement
func BenchmarkMockClock_Advance(b *testing.B) {
	clock := NewMockClock(time.Now())
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		clock.Advance(1 * time.Second)
	}
}

// BenchmarkJobExecutionHook_RecordEvent benchmarks event recording
func BenchmarkJobExecutionHook_RecordEvent(b *testing.B) {
	hook := NewJobExecutionHook()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		hook.OnJobStart("test-job", nil)
	}
}

// BenchmarkJobExecutionHook_GetEvents benchmarks retrieving events
func BenchmarkJobExecutionHook_GetEvents(b *testing.B) {
	hook := NewJobExecutionHook()
	
	// Pre-populate with events
	for i := 0; i < 1000; i++ {
		hook.OnJobStart(fmt.Sprintf("job-%d", i), nil)
	}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = hook.GetEvents()
	}
}

// BenchmarkJobMetrics_RecordExecution benchmarks metrics recording
func BenchmarkJobMetrics_RecordExecution(b *testing.B) {
	metrics := NewJobMetrics()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		metrics.RecordExecution(100*time.Millisecond, true, 10, 0)
	}
}

// BenchmarkFaultInjector_ShouldFail benchmarks fault injection checks
func BenchmarkFaultInjector_ShouldFail(b *testing.B) {
	injector := NewFaultInjector()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = injector.ShouldFail()
	}
}

// BenchmarkFaultInjector_ShouldFail_WithFailures benchmarks with active failures
func BenchmarkFaultInjector_ShouldFail_WithFailures(b *testing.B) {
	injector := NewFaultInjector()
	injector.FailNTimes(b.N / 2) // Fail half the time
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = injector.ShouldFail()
	}
}

// BenchmarkWorkerPool_Throughput benchmarks worker pool throughput
func BenchmarkWorkerPool_Throughput(b *testing.B) {
	numWorkers := 10
	pool := NewWorkerPool(numWorkers)
	pool.Start()
	defer pool.Shutdown()
	
	// Consume results in background with proper synchronization
	var resultsWg sync.WaitGroup
	resultsWg.Add(1)
	go func() {
		defer resultsWg.Done()
		for range pool.Results() {
			// Discard results
		}
	}()
	
	workFunc := func(ctx context.Context) error {
		// Simulate minimal work
		return nil
	}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		job := Job{
			ID:       fmt.Sprintf("job-%d", i),
			WorkFunc: workFunc,
		}
		pool.Submit(job)
	}
	
	pool.Stop()
	resultsWg.Wait() // Ensure result consumer completes
}

// BenchmarkWorkerPool_WithWork benchmarks with simulated work
func BenchmarkWorkerPool_WithWork(b *testing.B) {
	numWorkers := 10
	pool := NewWorkerPool(numWorkers)
	pool.Start()
	defer pool.Shutdown()
	
	// Consume results in background with proper synchronization
	var resultsWg sync.WaitGroup
	resultsWg.Add(1)
	go func() {
		defer resultsWg.Done()
		for range pool.Results() {
			// Discard results
		}
	}()
	
	workFunc := func(ctx context.Context) error {
		// Simulate CPU-bound work instead of sleep for reliable benchmarks
		sum := 0
		for i := 0; i < 10000; i++ {
			sum += i
		}
		return nil
	}
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		job := Job{
			ID:       fmt.Sprintf("job-%d", i),
			WorkFunc: workFunc,
		}
		pool.Submit(job)
	}
	
	pool.Stop()
	resultsWg.Wait() // Ensure result consumer completes
}

// BenchmarkQueueMonitor_RecordOperations benchmarks queue monitoring
func BenchmarkQueueMonitor_RecordOperations(b *testing.B) {
	monitor := NewQueueMonitor(100 * time.Millisecond)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		monitor.RecordEnqueue()
		monitor.RecordDequeue()
	}
}

// BenchmarkConcurrencyTester_RecordOperation benchmarks operation recording
func BenchmarkConcurrencyTester_RecordOperation(b *testing.B) {
	tester := NewConcurrencyTester()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tester.RecordOperation("test-op", i, true, nil)
	}
}

// BenchmarkBackoffCalculator_CalculateBackoff benchmarks backoff calculation
func BenchmarkBackoffCalculator_CalculateBackoff(b *testing.B) {
	config := DefaultRetryConfig()
	calc := NewBackoffCalculator(config)
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = calc.CalculateBackoff(i % 10)
	}
}

// BenchmarkRetryTracker_RecordAttempt benchmarks retry tracking
func BenchmarkRetryTracker_RecordAttempt(b *testing.B) {
	tracker := NewRetryTracker()
	
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tracker.RecordAttempt(fmt.Sprintf("op-%d", i%100), 1, nil, 100)
	}
}

// BenchmarkWorkerPool_Parallel benchmarks parallel worker pool operations
func BenchmarkWorkerPool_Parallel(b *testing.B) {
	numWorkers := 10
	pool := NewWorkerPool(numWorkers)
	pool.Start()
	defer pool.Shutdown()
	
	// Consume results in background with proper synchronization
	var resultsWg sync.WaitGroup
	resultsWg.Add(1)
	go func() {
		defer resultsWg.Done()
		for range pool.Results() {
			// Discard results
		}
	}()
	
	workFunc := func(ctx context.Context) error {
		return nil
	}
	
	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			job := Job{
				ID:       fmt.Sprintf("job-%d", i),
				WorkFunc: workFunc,
			}
			pool.Submit(job)
			i++
		}
	})
	
	pool.Stop()
	resultsWg.Wait() // Ensure result consumer completes
}

// BenchmarkConcurrentHookAccess benchmarks concurrent access to hooks
func BenchmarkConcurrentHookAccess(b *testing.B) {
	hook := NewJobExecutionHook()
	
	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			if i%2 == 0 {
				hook.OnJobStart("test", nil)
			} else {
				_ = hook.GetEvents()
			}
			i++
		}
	})
}

// BenchmarkConcurrentMetricsAccess benchmarks concurrent metrics access
func BenchmarkConcurrentMetricsAccess(b *testing.B) {
	metrics := NewJobMetrics()
	
	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		i := 0
		for pb.Next() {
			if i%2 == 0 {
				metrics.RecordExecution(100*time.Millisecond, true, 10, 0)
			} else {
				_ = metrics.GetExecutionCount()
			}
			i++
		}
	})
}
