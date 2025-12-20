package services

import (
	"github.com/prometheus/client_golang/prometheus"
)

var (
	// WebhookDeliveryTotal tracks the total number of webhook delivery attempts
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

	// WebhookSignatureVerificationFailures tracks signature verification failures
	webhookSignatureVerificationFailures = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "webhook_signature_verification_failures_total",
			Help: "Total number of webhook signature verification failures",
		},
		[]string{"event_type"},
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
	prometheus.MustRegister(webhookSignatureVerificationFailures)
}
