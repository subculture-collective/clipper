package metrics

import (
	"testing"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/testutil"
	"github.com/stretchr/testify/assert"
)

func TestJobMetricsRegistration(t *testing.T) {
	// Test that metrics are registered and can be used
	tests := []struct {
		name   string
		metric prometheus.Collector
	}{
		{"JobExecutionTotal", JobExecutionTotal},
		{"JobExecutionDuration", JobExecutionDuration},
		{"JobLastSuccessTimestamp", JobLastSuccessTimestamp},
		{"JobItemsProcessed", JobItemsProcessed},
		{"JobQueueSize", JobQueueSize},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.NotNil(t, tt.metric, "Metric should not be nil")
		})
	}
}

func TestJobExecutionMetrics(t *testing.T) {
	// Reset metrics before test
	JobExecutionTotal.Reset()
	JobExecutionDuration.Reset()

	jobName := "test_job"

	// Simulate successful job execution
	JobExecutionTotal.WithLabelValues(jobName, "success").Inc()
	JobExecutionDuration.WithLabelValues(jobName).Observe(1.5)

	// Verify counter increased
	count := testutil.ToFloat64(JobExecutionTotal.WithLabelValues(jobName, "success"))
	assert.Equal(t, float64(1), count, "Job execution count should be 1")

	// Simulate failed job execution
	JobExecutionTotal.WithLabelValues(jobName, "failed").Inc()
	failedCount := testutil.ToFloat64(JobExecutionTotal.WithLabelValues(jobName, "failed"))
	assert.Equal(t, float64(1), failedCount, "Failed job count should be 1")
}

func TestJobLastSuccessTimestamp(t *testing.T) {
	JobLastSuccessTimestamp.Reset()

	jobName := "test_timestamp_job"
	now := float64(time.Now().Unix())

	// Set last success timestamp
	JobLastSuccessTimestamp.WithLabelValues(jobName).Set(now)

	// Verify timestamp was set
	timestamp := testutil.ToFloat64(JobLastSuccessTimestamp.WithLabelValues(jobName))
	assert.InDelta(t, now, timestamp, 1, "Timestamp should be approximately current time")
}

func TestJobItemsProcessed(t *testing.T) {
	JobItemsProcessed.Reset()

	jobName := "test_items_job"

	// Process some items
	JobItemsProcessed.WithLabelValues(jobName, "success").Add(10)
	JobItemsProcessed.WithLabelValues(jobName, "failed").Add(2)
	JobItemsProcessed.WithLabelValues(jobName, "skipped").Add(3)

	// Verify counts
	successCount := testutil.ToFloat64(JobItemsProcessed.WithLabelValues(jobName, "success"))
	assert.Equal(t, float64(10), successCount, "Success items should be 10")

	failedCount := testutil.ToFloat64(JobItemsProcessed.WithLabelValues(jobName, "failed"))
	assert.Equal(t, float64(2), failedCount, "Failed items should be 2")

	skippedCount := testutil.ToFloat64(JobItemsProcessed.WithLabelValues(jobName, "skipped"))
	assert.Equal(t, float64(3), skippedCount, "Skipped items should be 3")
}

func TestJobQueueSize(t *testing.T) {
	JobQueueSize.Reset()

	jobName := "test_queue_job"

	// Set queue size
	JobQueueSize.WithLabelValues(jobName).Set(25)
	queueSize := testutil.ToFloat64(JobQueueSize.WithLabelValues(jobName))
	assert.Equal(t, float64(25), queueSize, "Queue size should be 25")

	// Update queue size
	JobQueueSize.WithLabelValues(jobName).Set(10)
	updatedSize := testutil.ToFloat64(JobQueueSize.WithLabelValues(jobName))
	assert.Equal(t, float64(10), updatedSize, "Updated queue size should be 10")
}
