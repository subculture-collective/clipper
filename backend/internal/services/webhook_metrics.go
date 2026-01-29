package services

import (
	"github.com/prometheus/client_golang/prometheus"
)

var (
	// webhookDeliveryTotal tracks the total number of webhook delivery attempts
	webhookDeliveryTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webhook_delivery_total",
			Help: "Total number of webhook delivery attempts",
		},
		[]string{"event_type", "status"}, // status: success, failed, retry
	)

	// WebhookDeliveryDuration tracks the time taken to deliver a webhook
	webhookDeliveryDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "webhook_delivery_duration_seconds",
			Help:    "Duration of webhook delivery attempts in seconds",
			Buckets: []float64{.05, .1, .25, .5, 1, 2.5, 5, 10, 30},
		},
		[]string{"event_type", "status"},
	)

	// WebhookRetryQueueSize tracks the current size of the retry queue
	webhookRetryQueueSize = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "webhook_retry_queue_size",
			Help: "Current number of webhooks pending retry",
		},
	)

	// WebhookDeadLetterQueueSize tracks the current size of the dead-letter queue
	webhookDeadLetterQueueSize = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "webhook_dead_letter_queue_size",
			Help: "Current number of webhooks in the dead-letter queue",
		},
	)

	// WebhookSubscriptionsActive tracks the number of active webhook subscriptions
	webhookSubscriptionsActive = prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "webhook_subscriptions_active",
			Help: "Current number of active webhook subscriptions",
		},
	)

	// WebhookRetryAttempts tracks the number of retry attempts per delivery
	webhookRetryAttempts = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "webhook_retry_attempts",
			Help:    "Distribution of retry attempts before success or failure",
			Buckets: []float64{0, 1, 2, 3, 4, 5},
		},
		[]string{"event_type", "final_status"},
	)

	// WebhookHTTPStatusCode tracks the HTTP status codes returned by webhook endpoints
	webhookHTTPStatusCode = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webhook_http_status_code_total",
			Help: "Total number of webhook deliveries by HTTP status code",
		},
		[]string{"event_type", "status_code"},
	)

	// WebhookTimeToSuccess tracks the time from first attempt to successful delivery
	webhookTimeToSuccess = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "webhook_time_to_success_seconds",
			Help:    "Time from first delivery attempt to successful delivery",
			Buckets: []float64{1, 5, 10, 30, 60, 300, 600, 1800, 3600}, // 1s to 1 hour
		},
		[]string{"event_type"},
	)

	// WebhookConsecutiveFailures tracks consecutive failures for the same subscription
	webhookConsecutiveFailures = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "webhook_consecutive_failures_count",
			Help: "Number of consecutive failures for a webhook subscription",
		},
		[]string{"subscription_id", "event_type"},
	)

	// WebhookDLQMovements tracks items moved to dead-letter queue
	webhookDLQMovements = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webhook_dlq_movements_total",
			Help: "Total number of webhook deliveries moved to dead-letter queue",
		},
		[]string{"event_type", "reason"},
	)

	// WebhookRetryRate tracks the rate of retries
	webhookRetryRate = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webhook_retry_total",
			Help: "Total number of webhook retry attempts",
		},
		[]string{"event_type", "retry_number"},
	)

	// WebhookSubscriptionHealth tracks per-subscription delivery success/failure
	webhookSubscriptionHealth = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webhook_subscription_delivery_total",
			Help: "Total webhook deliveries per subscription",
		},
		[]string{"subscription_id", "status"}, // status: success, failed
	)

	// WebhookDLQReplaySuccess tracks successful DLQ replays
	webhookDLQReplaySuccess = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webhook_dlq_replay_success_total",
			Help: "Total number of successful DLQ replay attempts",
		},
		[]string{"event_type"},
	)

	// WebhookDLQReplayFailure tracks failed DLQ replays
	webhookDLQReplayFailure = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webhook_dlq_replay_failure_total",
			Help: "Total number of failed DLQ replay attempts",
		},
		[]string{"event_type", "reason"},
	)

	// WebhookDLQReplayDuration tracks DLQ replay duration
	webhookDLQReplayDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "webhook_dlq_replay_duration_seconds",
			Help:    "Duration of DLQ replay attempts in seconds",
			Buckets: []float64{.1, .5, 1, 2, 5, 10, 30},
		},
		[]string{"event_type", "status"},
	)
)

func init() {
	// Register webhook metrics with Prometheus
	prometheus.MustRegister(webhookDeliveryTotal)
	prometheus.MustRegister(webhookDeliveryDuration)
	prometheus.MustRegister(webhookRetryQueueSize)
	prometheus.MustRegister(webhookDeadLetterQueueSize)
	prometheus.MustRegister(webhookSubscriptionsActive)
	prometheus.MustRegister(webhookRetryAttempts)
	prometheus.MustRegister(webhookHTTPStatusCode)
	prometheus.MustRegister(webhookTimeToSuccess)
	prometheus.MustRegister(webhookConsecutiveFailures)
	prometheus.MustRegister(webhookDLQMovements)
	prometheus.MustRegister(webhookRetryRate)
	prometheus.MustRegister(webhookSubscriptionHealth)
	prometheus.MustRegister(webhookDLQReplaySuccess)
	prometheus.MustRegister(webhookDLQReplayFailure)
	prometheus.MustRegister(webhookDLQReplayDuration)
}
