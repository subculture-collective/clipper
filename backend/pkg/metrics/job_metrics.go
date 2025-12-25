package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
)

var (
	// JobExecutionTotal tracks the total number of background job executions
	JobExecutionTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "job_execution_total",
			Help: "Total number of background job executions",
		},
		[]string{"job_name", "status"}, // status: success, failed
	)

	// JobExecutionDuration tracks the duration of background job executions
	JobExecutionDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "job_execution_duration_seconds",
			Help:    "Duration of background job executions in seconds",
			Buckets: []float64{.1, .5, 1, 5, 10, 30, 60, 120, 300, 600}, // 100ms to 10 minutes
		},
		[]string{"job_name"},
	)

	// JobLastSuccessTimestamp tracks the timestamp of the last successful job execution
	JobLastSuccessTimestamp = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "job_last_success_timestamp_seconds",
			Help: "Timestamp of the last successful job execution in Unix seconds",
		},
		[]string{"job_name"},
	)

	// JobItemsProcessed tracks the number of items processed by a job
	JobItemsProcessed = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "job_items_processed_total",
			Help: "Total number of items processed by background jobs",
		},
		[]string{"job_name", "status"}, // status: success, failed, skipped
	)

	// JobQueueSize tracks the current queue size for jobs that have queues
	JobQueueSize = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "job_queue_size",
			Help: "Current size of job processing queue",
		},
		[]string{"job_name"},
	)
)

func init() {
	// Register job metrics with Prometheus
	prometheus.MustRegister(JobExecutionTotal)
	prometheus.MustRegister(JobExecutionDuration)
	prometheus.MustRegister(JobLastSuccessTimestamp)
	prometheus.MustRegister(JobItemsProcessed)
	prometheus.MustRegister(JobQueueSize)
}
