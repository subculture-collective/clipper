package services

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	"github.com/stretchr/testify/assert"
)

// TestWebhookMetricsRegistered verifies that all webhook metrics are registered
func TestWebhookMetricsRegistered(t *testing.T) {
	// Test that metrics can be collected without panic
	assert.NotPanics(t, func() {
		// Attempt to register metrics again should fail if already registered
		err := prometheus.Register(webhookDeliveryTotal)
		assert.Error(t, err, "webhookDeliveryTotal should already be registered")

		err = prometheus.Register(webhookDeliveryDuration)
		assert.Error(t, err, "webhookDeliveryDuration should already be registered")

		err = prometheus.Register(webhookRetryQueueSize)
		assert.Error(t, err, "webhookRetryQueueSize should already be registered")

		err = prometheus.Register(webhookDeadLetterQueueSize)
		assert.Error(t, err, "webhookDeadLetterQueueSize should already be registered")

		err = prometheus.Register(webhookSubscriptionsActive)
		assert.Error(t, err, "webhookSubscriptionsActive should already be registered")

		err = prometheus.Register(webhookRetryAttempts)
		assert.Error(t, err, "webhookRetryAttempts should already be registered")

		err = prometheus.Register(webhookHTTPStatusCode)
		assert.Error(t, err, "webhookHTTPStatusCode should already be registered")
	})
}

// TestWebhookDeliveryMetrics tests webhook delivery metric recording
func TestWebhookDeliveryMetrics(t *testing.T) {
	// Record some test metrics
	eventType := "clip.submitted"

	// Test counter increment
	webhookDeliveryTotal.WithLabelValues(eventType, "success").Inc()
	webhookDeliveryTotal.WithLabelValues(eventType, "failed").Inc()
	webhookDeliveryTotal.WithLabelValues(eventType, "retry").Inc()

	// Test histogram observation
	webhookDeliveryDuration.WithLabelValues(eventType, "success").Observe(0.5)
	webhookDeliveryDuration.WithLabelValues(eventType, "failed").Observe(1.2)

	// Test retry attempts
	webhookRetryAttempts.WithLabelValues(eventType, "success").Observe(2)
	webhookRetryAttempts.WithLabelValues(eventType, "failed").Observe(5)

	// Test HTTP status codes
	webhookHTTPStatusCode.WithLabelValues(eventType, "200").Inc()
	webhookHTTPStatusCode.WithLabelValues(eventType, "500").Inc()

	// Verify metrics can be collected
	assert.NotPanics(t, func() {
		metricFamilies, err := prometheus.DefaultGatherer.Gather()
		assert.NoError(t, err)
		assert.NotEmpty(t, metricFamilies)

		// Verify our webhook metrics are present
		foundMetrics := make(map[string]bool)
		for _, mf := range metricFamilies {
			if mf.GetName() == "webhook_delivery_total" {
				foundMetrics["webhook_delivery_total"] = true
				assert.NotEmpty(t, mf.GetMetric())
			}
			if mf.GetName() == "webhook_delivery_duration_seconds" {
				foundMetrics["webhook_delivery_duration_seconds"] = true
			}
			if mf.GetName() == "webhook_retry_attempts" {
				foundMetrics["webhook_retry_attempts"] = true
			}
			if mf.GetName() == "webhook_http_status_code_total" {
				foundMetrics["webhook_http_status_code_total"] = true
			}
		}

		assert.True(t, foundMetrics["webhook_delivery_total"], "webhook_delivery_total metric should be present")
		assert.True(t, foundMetrics["webhook_delivery_duration_seconds"], "webhook_delivery_duration_seconds metric should be present")
	})
}

// TestWebhookQueueSizeMetrics tests webhook queue size gauge metrics
func TestWebhookQueueSizeMetrics(t *testing.T) {
	// Set gauge values
	webhookRetryQueueSize.Set(10)
	webhookDeadLetterQueueSize.Set(2)
	webhookSubscriptionsActive.Set(5)

	// Verify gauges can be read
	assert.NotPanics(t, func() {
		// Get the metric value
		metric := &dto.Metric{}
		err := webhookRetryQueueSize.Write(metric)
		assert.NoError(t, err)
		assert.Equal(t, float64(10), metric.GetGauge().GetValue())

		err = webhookDeadLetterQueueSize.Write(metric)
		assert.NoError(t, err)
		assert.Equal(t, float64(2), metric.GetGauge().GetValue())

		err = webhookSubscriptionsActive.Write(metric)
		assert.NoError(t, err)
		assert.Equal(t, float64(5), metric.GetGauge().GetValue())
	})

	// Test that gauge values can be updated
	webhookRetryQueueSize.Set(15)
	metric := &dto.Metric{}
	err := webhookRetryQueueSize.Write(metric)
	assert.NoError(t, err)
	assert.Equal(t, float64(15), metric.GetGauge().GetValue())
}

// TestWebhookMetricLabels tests that metrics accept the expected labels
func TestWebhookMetricLabels(t *testing.T) {
	// Test various event types and statuses
	eventTypes := []string{"clip.submitted", "clip.approved", "clip.rejected"}
	statuses := []string{"success", "failed", "retry"}

	for _, eventType := range eventTypes {
		for _, status := range statuses {
			assert.NotPanics(t, func() {
				webhookDeliveryTotal.WithLabelValues(eventType, status).Inc()
				webhookDeliveryDuration.WithLabelValues(eventType, status).Observe(0.1)
			})
		}
	}

	// Test HTTP status codes
	statusCodes := []string{"200", "201", "400", "401", "500", "502", "503"}
	for _, eventType := range eventTypes {
		for _, statusCode := range statusCodes {
			assert.NotPanics(t, func() {
				webhookHTTPStatusCode.WithLabelValues(eventType, statusCode).Inc()
			})
		}
	}
}
