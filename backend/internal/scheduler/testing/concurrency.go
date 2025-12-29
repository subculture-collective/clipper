package testing

import (
	"context"
	"sync"
	"sync/atomic"
	"time"
)

// WorkerPool manages concurrent execution of jobs for testing
type WorkerPool struct {
	numWorkers    int
	jobQueue      chan Job
	results       chan JobResult
	wg            sync.WaitGroup
	ctx           context.Context
	cancel        context.CancelFunc
	activeWorkers int32
	completedJobs int64
	failedJobs    int64
	totalDuration int64 // nanoseconds
	stopped       int32 // atomic flag to prevent double close
}

// Job represents a unit of work to be executed
type Job struct {
	ID       string
	WorkFunc func(ctx context.Context) error
	Metadata map[string]interface{}
}

// JobResult represents the result of a job execution
type JobResult struct {
	JobID    string
	Success  bool
	Error    error
	Duration time.Duration
	Metadata map[string]interface{}
}

// NewWorkerPool creates a new worker pool with the specified number of workers
func NewWorkerPool(numWorkers int) *WorkerPool {
	ctx, cancel := context.WithCancel(context.Background())
	return &WorkerPool{
		numWorkers: numWorkers,
		jobQueue:   make(chan Job, numWorkers*2),
		results:    make(chan JobResult, numWorkers*2),
		ctx:        ctx,
		cancel:     cancel,
	}
}

// Start starts the worker pool
func (wp *WorkerPool) Start() {
	for i := 0; i < wp.numWorkers; i++ {
		wp.wg.Add(1)
		go wp.worker()
	}
}

// worker is the worker goroutine that processes jobs
func (wp *WorkerPool) worker() {
	defer wp.wg.Done()
	atomic.AddInt32(&wp.activeWorkers, 1)
	defer atomic.AddInt32(&wp.activeWorkers, -1)

	for {
		select {
		case job, ok := <-wp.jobQueue:
			if !ok {
				return
			}
			wp.executeJob(job)
		case <-wp.ctx.Done():
			return
		}
	}
}

// executeJob executes a single job and records the result
func (wp *WorkerPool) executeJob(job Job) {
	start := time.Now()
	err := job.WorkFunc(wp.ctx)
	duration := time.Since(start)

	result := JobResult{
		JobID:    job.ID,
		Success:  err == nil,
		Error:    err,
		Duration: duration,
		Metadata: job.Metadata,
	}

	atomic.AddInt64(&wp.totalDuration, int64(duration))

	if err == nil {
		atomic.AddInt64(&wp.completedJobs, 1)
	} else {
		atomic.AddInt64(&wp.failedJobs, 1)
	}

	// Deliver results unless the pool has been cancelled
	select {
	case wp.results <- result:
	case <-wp.ctx.Done():
	}
}

// Submit submits a job to the worker pool
func (wp *WorkerPool) Submit(job Job) bool {
	select {
	case wp.jobQueue <- job:
		return true
	case <-wp.ctx.Done():
		return false
	}
}

// Stop stops the worker pool and waits for all workers to finish
func (wp *WorkerPool) Stop() {
	if atomic.CompareAndSwapInt32(&wp.stopped, 0, 1) {
		close(wp.jobQueue)
		wp.wg.Wait()
		// Small delay to ensure workers finish sending results
		time.Sleep(10 * time.Millisecond)
		close(wp.results)
	}
}

// Shutdown cancels the context and stops all workers immediately
func (wp *WorkerPool) Shutdown() {
	if atomic.CompareAndSwapInt32(&wp.stopped, 0, 1) {
		wp.cancel()
		close(wp.jobQueue)
		wp.wg.Wait()
		// Small delay to ensure workers finish sending results
		time.Sleep(10 * time.Millisecond)
		close(wp.results)
	}
}

// Results returns the results channel
func (wp *WorkerPool) Results() <-chan JobResult {
	return wp.results
}

// GetStats returns statistics about the worker pool
func (wp *WorkerPool) GetStats() WorkerPoolStats {
	return WorkerPoolStats{
		ActiveWorkers:   int(atomic.LoadInt32(&wp.activeWorkers)),
		CompletedJobs:   atomic.LoadInt64(&wp.completedJobs),
		FailedJobs:      atomic.LoadInt64(&wp.failedJobs),
		TotalDuration:   time.Duration(atomic.LoadInt64(&wp.totalDuration)),
		AverageDuration: wp.calculateAverageDuration(),
	}
}

func (wp *WorkerPool) calculateAverageDuration() time.Duration {
	completed := atomic.LoadInt64(&wp.completedJobs)
	failed := atomic.LoadInt64(&wp.failedJobs)
	total := completed + failed

	if total == 0 {
		return 0
	}

	totalDuration := atomic.LoadInt64(&wp.totalDuration)
	return time.Duration(totalDuration / total)
}

// WorkerPoolStats contains statistics about worker pool execution
type WorkerPoolStats struct {
	ActiveWorkers   int
	CompletedJobs   int64
	FailedJobs      int64
	TotalDuration   time.Duration
	AverageDuration time.Duration
}

// QueueMonitor monitors a job queue for testing
type QueueMonitor struct {
	mu             sync.RWMutex
	queueLength    int
	maxQueueLength int
	enqueuedCount  int64
	dequeuedCount  int64
	droppedCount   int64
	samples        []QueueSample
	sampleInterval time.Duration
	stopChan       chan struct{}
}

// QueueSample represents a snapshot of queue state
type QueueSample struct {
	Timestamp   time.Time
	QueueLength int
	Enqueued    int64
	Dequeued    int64
	Dropped     int64
}

// NewQueueMonitor creates a new queue monitor
func NewQueueMonitor(sampleInterval time.Duration) *QueueMonitor {
	return &QueueMonitor{
		samples:        make([]QueueSample, 0),
		sampleInterval: sampleInterval,
		stopChan:       make(chan struct{}),
	}
}

// RecordEnqueue records an item being added to the queue
func (qm *QueueMonitor) RecordEnqueue() {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	qm.queueLength++
	atomic.AddInt64(&qm.enqueuedCount, 1)

	if qm.queueLength > qm.maxQueueLength {
		qm.maxQueueLength = qm.queueLength
	}
}

// RecordDequeue records an item being removed from the queue
func (qm *QueueMonitor) RecordDequeue() {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	// Only record a dequeue when the monitor's view of the queue
	// indicates that an item is available. This keeps queueLength
	// and dequeuedCount consistent even if RecordDequeue is called
	// more times than RecordEnqueue.
	if qm.queueLength == 0 {
		return
	}

	qm.queueLength--
	atomic.AddInt64(&qm.dequeuedCount, 1)
}

// RecordDrop records an item being dropped from the queue
func (qm *QueueMonitor) RecordDrop() {
	atomic.AddInt64(&qm.droppedCount, 1)
}

// StartSampling starts periodic sampling of queue state
func (qm *QueueMonitor) StartSampling(ctx context.Context) {
	ticker := time.NewTicker(qm.sampleInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			qm.takeSample()
		case <-qm.stopChan:
			return
		case <-ctx.Done():
			return
		}
	}
}

func (qm *QueueMonitor) takeSample() {
	qm.mu.Lock()
	defer qm.mu.Unlock()

	sample := QueueSample{
		Timestamp:   time.Now(),
		QueueLength: qm.queueLength,
		Enqueued:    atomic.LoadInt64(&qm.enqueuedCount),
		Dequeued:    atomic.LoadInt64(&qm.dequeuedCount),
		Dropped:     atomic.LoadInt64(&qm.droppedCount),
	}

	qm.samples = append(qm.samples, sample)
}

// Stop stops the queue monitor
func (qm *QueueMonitor) Stop() {
	close(qm.stopChan)
}

// GetSamples returns all recorded samples
func (qm *QueueMonitor) GetSamples() []QueueSample {
	qm.mu.RLock()
	defer qm.mu.RUnlock()

	samplesCopy := make([]QueueSample, len(qm.samples))
	copy(samplesCopy, qm.samples)
	return samplesCopy
}

// GetMaxQueueLength returns the maximum queue length observed
func (qm *QueueMonitor) GetMaxQueueLength() int {
	qm.mu.RLock()
	defer qm.mu.RUnlock()
	return qm.maxQueueLength
}

// ConcurrencyTester helps test concurrent behavior
type ConcurrencyTester struct {
	mu            sync.Mutex
	operations    []Operation
	racesDetected int
	deadlocks     int
}

// Operation represents a concurrent operation
type Operation struct {
	Name      string
	Timestamp time.Time
	ThreadID  int
	Success   bool
	Error     error
}

// NewConcurrencyTester creates a new concurrency tester
func NewConcurrencyTester() *ConcurrencyTester {
	return &ConcurrencyTester{
		operations: make([]Operation, 0),
	}
}

// RecordOperation records an operation for analysis
func (ct *ConcurrencyTester) RecordOperation(name string, threadID int, success bool, err error) {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	ct.operations = append(ct.operations, Operation{
		Name:      name,
		Timestamp: time.Now(),
		ThreadID:  threadID,
		Success:   success,
		Error:     err,
	})
}

// GetOperations returns all recorded operations
func (ct *ConcurrencyTester) GetOperations() []Operation {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	ops := make([]Operation, len(ct.operations))
	copy(ops, ct.operations)
	return ops
}

// ExecuteConcurrent executes a function concurrently with N goroutines
func (ct *ConcurrencyTester) ExecuteConcurrent(n int, fn func(threadID int) error) []error {
	var wg sync.WaitGroup
	errors := make([]error, n)

	for i := 0; i < n; i++ {
		wg.Add(1)
		go func(threadID int) {
			defer wg.Done()
			err := fn(threadID)
			errors[threadID] = err
			ct.RecordOperation("concurrent_exec", threadID, err == nil, err)
		}(i)
	}

	wg.Wait()
	return errors
}

// StressTest executes a function repeatedly under high concurrency
func (ct *ConcurrencyTester) StressTest(duration time.Duration, numGoroutines int, fn func() error) *StressTestResult {
	ctx, cancel := context.WithTimeout(context.Background(), duration)
	defer cancel()

	var wg sync.WaitGroup
	successCount := int64(0)
	errorCount := int64(0)
	totalOps := int64(0)

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()

			for {
				select {
				case <-ctx.Done():
					return
				default:
					err := fn()
					atomic.AddInt64(&totalOps, 1)

					if err == nil {
						atomic.AddInt64(&successCount, 1)
					} else {
						atomic.AddInt64(&errorCount, 1)
					}
				}
			}
		}(i)
	}

	wg.Wait()

	return &StressTestResult{
		Duration:     duration,
		Goroutines:   numGoroutines,
		TotalOps:     totalOps,
		SuccessCount: successCount,
		ErrorCount:   errorCount,
		OpsPerSecond: float64(totalOps) / duration.Seconds(),
	}
}

// StressTestResult contains the results of a stress test
type StressTestResult struct {
	Duration     time.Duration
	Goroutines   int
	TotalOps     int64
	SuccessCount int64
	ErrorCount   int64
	OpsPerSecond float64
}
