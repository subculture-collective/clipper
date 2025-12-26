package testing

import (
	"context"
	"sync"
	"time"
)

// JobEvent represents an event in the job execution lifecycle
type JobEvent struct {
	JobName   string
	EventType string // "start", "end", "error"
	Timestamp time.Time
	Error     error
	Metadata  map[string]interface{}
}

// JobExecutionHook provides hooks to capture job execution events for testing
type JobExecutionHook struct {
	mu     sync.RWMutex
	events []JobEvent
}

// NewJobExecutionHook creates a new job execution hook
func NewJobExecutionHook() *JobExecutionHook {
	return &JobExecutionHook{
		events: make([]JobEvent, 0),
	}
}

// OnJobStart records when a job starts
func (h *JobExecutionHook) OnJobStart(jobName string, metadata map[string]interface{}) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	h.events = append(h.events, JobEvent{
		JobName:   jobName,
		EventType: "start",
		Timestamp: time.Now(),
		Metadata:  metadata,
	})
}

// OnJobEnd records when a job completes successfully
func (h *JobExecutionHook) OnJobEnd(jobName string, metadata map[string]interface{}) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	h.events = append(h.events, JobEvent{
		JobName:   jobName,
		EventType: "end",
		Timestamp: time.Now(),
		Metadata:  metadata,
	})
}

// OnJobError records when a job encounters an error
func (h *JobExecutionHook) OnJobError(jobName string, err error, metadata map[string]interface{}) {
	h.mu.Lock()
	defer h.mu.Unlock()
	
	h.events = append(h.events, JobEvent{
		JobName:   jobName,
		EventType: "error",
		Timestamp: time.Now(),
		Error:     err,
		Metadata:  metadata,
	})
}

// GetEvents returns all recorded events
func (h *JobExecutionHook) GetEvents() []JobEvent {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	// Return a copy to prevent external modification
	eventsCopy := make([]JobEvent, len(h.events))
	copy(eventsCopy, h.events)
	return eventsCopy
}

// GetEventsByType returns events filtered by type
func (h *JobExecutionHook) GetEventsByType(eventType string) []JobEvent {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	filtered := make([]JobEvent, 0)
	for _, event := range h.events {
		if event.EventType == eventType {
			filtered = append(filtered, event)
		}
	}
	return filtered
}

// GetEventsByJob returns events for a specific job
func (h *JobExecutionHook) GetEventsByJob(jobName string) []JobEvent {
	h.mu.RLock()
	defer h.mu.RUnlock()
	
	filtered := make([]JobEvent, 0)
	for _, event := range h.events {
		if event.JobName == jobName {
			filtered = append(filtered, event)
		}
	}
	return filtered
}

// GetEventCount returns the total number of recorded events
func (h *JobExecutionHook) GetEventCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.events)
}

// Clear removes all recorded events
func (h *JobExecutionHook) Clear() {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.events = make([]JobEvent, 0)
}

// WaitForEvents waits until at least n events have been recorded or timeout occurs
func (h *JobExecutionHook) WaitForEvents(ctx context.Context, n int, timeout time.Duration) bool {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	
	ticker := time.NewTicker(10 * time.Millisecond)
	defer ticker.Stop()
	
	for {
		select {
		case <-ctx.Done():
			return false
		case <-ticker.C:
			if h.GetEventCount() >= n {
				return true
			}
		}
	}
}

// JobMetrics tracks metrics for job execution
type JobMetrics struct {
	mu               sync.RWMutex
	executionCount   int
	successCount     int
	errorCount       int
	totalDuration    time.Duration
	lastExecutionAt  time.Time
	itemsProcessed   int
	itemsFailed      int
}

// NewJobMetrics creates a new job metrics tracker
func NewJobMetrics() *JobMetrics {
	return &JobMetrics{}
}

// RecordExecution records a job execution
func (m *JobMetrics) RecordExecution(duration time.Duration, success bool, itemsProcessed, itemsFailed int) {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.executionCount++
	m.totalDuration += duration
	m.lastExecutionAt = time.Now()
	m.itemsProcessed += itemsProcessed
	m.itemsFailed += itemsFailed
	
	if success {
		m.successCount++
	} else {
		m.errorCount++
	}
}

// GetExecutionCount returns the total number of executions
func (m *JobMetrics) GetExecutionCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.executionCount
}

// GetSuccessCount returns the number of successful executions
func (m *JobMetrics) GetSuccessCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.successCount
}

// GetErrorCount returns the number of failed executions
func (m *JobMetrics) GetErrorCount() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.errorCount
}

// GetAverageDuration returns the average execution duration
func (m *JobMetrics) GetAverageDuration() time.Duration {
	m.mu.RLock()
	defer m.mu.RUnlock()
	
	if m.executionCount == 0 {
		return 0
	}
	return m.totalDuration / time.Duration(m.executionCount)
}

// GetItemsProcessed returns the total number of items processed
func (m *JobMetrics) GetItemsProcessed() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.itemsProcessed
}

// GetItemsFailed returns the total number of items that failed
func (m *JobMetrics) GetItemsFailed() int {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.itemsFailed
}

// GetLastExecutionAt returns the timestamp of the last execution
func (m *JobMetrics) GetLastExecutionAt() time.Time {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.lastExecutionAt
}

// Reset clears all metrics
func (m *JobMetrics) Reset() {
	m.mu.Lock()
	defer m.mu.Unlock()
	
	m.executionCount = 0
	m.successCount = 0
	m.errorCount = 0
	m.totalDuration = 0
	m.lastExecutionAt = time.Time{}
	m.itemsProcessed = 0
	m.itemsFailed = 0
}
