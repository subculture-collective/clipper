package metrics

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus"
	dto "github.com/prometheus/client_model/go"
	"github.com/stretchr/testify/assert"
)

func TestModerationBanOperationsTotal(t *testing.T) {
	// Reset metrics
	ModerationBanOperationsTotal.Reset()

	// Record some operations
	ModerationBanOperationsTotal.WithLabelValues("ban", "success", "").Inc()
	ModerationBanOperationsTotal.WithLabelValues("ban", "success", "").Inc()
	ModerationBanOperationsTotal.WithLabelValues("unban", "success", "").Inc()
	ModerationBanOperationsTotal.WithLabelValues("ban", "failed", "permission_denied").Inc()

	// Collect metrics
	metrics := collectMetrics(ModerationBanOperationsTotal)

	// Verify counts
	assert.Equal(t, float64(2), getMetricValue(metrics, map[string]string{"operation": "ban", "status": "success", "error_type": ""}))
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"operation": "unban", "status": "success", "error_type": ""}))
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"operation": "ban", "status": "failed", "error_type": "permission_denied"}))
}

func TestModerationBanOperationDuration(t *testing.T) {
	// Reset metrics
	ModerationBanOperationDuration.Reset()

	// Record some durations
	ModerationBanOperationDuration.WithLabelValues("ban").Observe(0.05)  // 50ms
	ModerationBanOperationDuration.WithLabelValues("ban").Observe(0.15)  // 150ms
	ModerationBanOperationDuration.WithLabelValues("unban").Observe(0.03) // 30ms

	// Collect metrics
	metrics := collectHistogramMetrics(ModerationBanOperationDuration)

	// Verify samples were recorded
	assert.Greater(t, len(metrics), 0, "Should have histogram metrics")
}

func TestModerationSyncOperationsTotal(t *testing.T) {
	// Reset metrics
	ModerationSyncOperationsTotal.Reset()

	// Record sync operations
	ModerationSyncOperationsTotal.WithLabelValues("success", "").Inc()
	ModerationSyncOperationsTotal.WithLabelValues("success", "").Inc()
	ModerationSyncOperationsTotal.WithLabelValues("failed", "api_error").Inc()

	// Collect metrics
	metrics := collectMetrics(ModerationSyncOperationsTotal)

	// Verify counts
	assert.Equal(t, float64(2), getMetricValue(metrics, map[string]string{"status": "success", "error_type": ""}))
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"status": "failed", "error_type": "api_error"}))
}

func TestModerationSyncBansProcessed(t *testing.T) {
	// Reset metrics
	ModerationSyncBansProcessed.Reset()

	// Record processed bans
	ModerationSyncBansProcessed.WithLabelValues("new").Add(5)
	ModerationSyncBansProcessed.WithLabelValues("updated").Add(3)
	ModerationSyncBansProcessed.WithLabelValues("unchanged").Add(10)

	// Collect metrics
	metrics := collectMetrics(ModerationSyncBansProcessed)

	// Verify counts
	assert.Equal(t, float64(5), getMetricValue(metrics, map[string]string{"status": "new"}))
	assert.Equal(t, float64(3), getMetricValue(metrics, map[string]string{"status": "updated"}))
	assert.Equal(t, float64(10), getMetricValue(metrics, map[string]string{"status": "unchanged"}))
}

func TestModerationPermissionChecksTotal(t *testing.T) {
	// Reset metrics
	ModerationPermissionChecksTotal.Reset()

	// Record permission checks
	ModerationPermissionChecksTotal.WithLabelValues("ban", "allowed").Inc()
	ModerationPermissionChecksTotal.WithLabelValues("ban", "allowed").Inc()
	ModerationPermissionChecksTotal.WithLabelValues("ban", "denied").Inc()
	ModerationPermissionChecksTotal.WithLabelValues("view_bans", "allowed").Inc()

	// Collect metrics
	metrics := collectMetrics(ModerationPermissionChecksTotal)

	// Verify counts
	assert.Equal(t, float64(2), getMetricValue(metrics, map[string]string{"permission_type": "ban", "result": "allowed"}))
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"permission_type": "ban", "result": "denied"}))
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"permission_type": "view_bans", "result": "allowed"}))
}

func TestModerationPermissionDenialsTotal(t *testing.T) {
	// Reset metrics
	ModerationPermissionDenialsTotal.Reset()

	// Record permission denials
	ModerationPermissionDenialsTotal.WithLabelValues("ban", "insufficient_permissions").Inc()
	ModerationPermissionDenialsTotal.WithLabelValues("ban", "insufficient_permissions").Inc()
	ModerationPermissionDenialsTotal.WithLabelValues("unban", "not_authorized").Inc()

	// Collect metrics
	metrics := collectMetrics(ModerationPermissionDenialsTotal)

	// Verify counts
	assert.Equal(t, float64(2), getMetricValue(metrics, map[string]string{"permission_type": "ban", "reason": "insufficient_permissions"}))
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"permission_type": "unban", "reason": "not_authorized"}))
}

func TestModerationAuditLogOperationsTotal(t *testing.T) {
	// Reset metrics
	ModerationAuditLogOperationsTotal.Reset()

	// Record audit log operations
	ModerationAuditLogOperationsTotal.WithLabelValues("create", "success").Inc()
	ModerationAuditLogOperationsTotal.WithLabelValues("create", "success").Inc()
	ModerationAuditLogOperationsTotal.WithLabelValues("list", "success").Inc()
	ModerationAuditLogOperationsTotal.WithLabelValues("create", "failed").Inc()

	// Collect metrics
	metrics := collectMetrics(ModerationAuditLogOperationsTotal)

	// Verify counts
	assert.Equal(t, float64(2), getMetricValue(metrics, map[string]string{"action": "create", "status": "success"}))
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"action": "list", "status": "success"}))
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"action": "create", "status": "failed"}))
}

func TestModerationAPIErrorsTotal(t *testing.T) {
	// Reset metrics
	ModerationAPIErrorsTotal.Reset()

	// Record API errors
	ModerationAPIErrorsTotal.WithLabelValues("/ban", "403").Inc()
	ModerationAPIErrorsTotal.WithLabelValues("/ban", "500").Inc()
	ModerationAPIErrorsTotal.WithLabelValues("/sync", "429").Inc()

	// Collect metrics
	metrics := collectMetrics(ModerationAPIErrorsTotal)

	// Verify counts
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"endpoint": "/ban", "error_code": "403"}))
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"endpoint": "/ban", "error_code": "500"}))
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"endpoint": "/sync", "error_code": "429"}))
}

func TestModerationSlowQueriesTotal(t *testing.T) {
	// Reset metrics
	ModerationSlowQueriesTotal.Reset()

	// Record slow queries
	ModerationSlowQueriesTotal.WithLabelValues("ban_user").Inc()
	ModerationSlowQueriesTotal.WithLabelValues("list_bans").Inc()
	ModerationSlowQueriesTotal.WithLabelValues("list_bans").Inc()

	// Collect metrics
	metrics := collectMetrics(ModerationSlowQueriesTotal)

	// Verify counts
	assert.Equal(t, float64(1), getMetricValue(metrics, map[string]string{"query_type": "ban_user"}))
	assert.Equal(t, float64(2), getMetricValue(metrics, map[string]string{"query_type": "list_bans"}))
}

func TestModerationActiveBansGauge(t *testing.T) {
	// Reset metrics
	ModerationActiveBansGauge.Reset()

	// Set active bans
	ModerationActiveBansGauge.WithLabelValues("channel").Set(42)
	ModerationActiveBansGauge.WithLabelValues("site").Set(7)

	// Collect metrics
	ch := make(chan prometheus.Metric, 10)
	ModerationActiveBansGauge.Collect(ch)
	close(ch)

	foundChannel := false
	foundSite := false

	for m := range ch {
		dtoMetric := &dto.Metric{}
		m.Write(dtoMetric)

		labels := make(map[string]string)
		for _, label := range dtoMetric.Label {
			labels[*label.Name] = *label.Value
		}

		if labels["community_type"] == "channel" {
			assert.Equal(t, float64(42), *dtoMetric.Gauge.Value)
			foundChannel = true
		}
		if labels["community_type"] == "site" {
			assert.Equal(t, float64(7), *dtoMetric.Gauge.Value)
			foundSite = true
		}
	}

	assert.True(t, foundChannel, "Should find channel gauge")
	assert.True(t, foundSite, "Should find site gauge")
}

// Helper function to collect metrics from a counter vector
func collectMetrics(vec *prometheus.CounterVec) []*dto.Metric {
	ch := make(chan prometheus.Metric, 100)
	vec.Collect(ch)
	close(ch)

	var metrics []*dto.Metric
	for m := range ch {
		dtoMetric := &dto.Metric{}
		m.Write(dtoMetric)
		metrics = append(metrics, dtoMetric)
	}
	return metrics
}

// Helper function to collect metrics from a histogram vector
func collectHistogramMetrics(vec *prometheus.HistogramVec) []*dto.Metric {
	ch := make(chan prometheus.Metric, 100)
	vec.Collect(ch)
	close(ch)

	var metrics []*dto.Metric
	for m := range ch {
		dtoMetric := &dto.Metric{}
		m.Write(dtoMetric)
		metrics = append(metrics, dtoMetric)
	}
	return metrics
}

// Helper function to get metric value by labels
func getMetricValue(metrics []*dto.Metric, targetLabels map[string]string) float64 {
	for _, m := range metrics {
		labels := make(map[string]string)
		for _, label := range m.Label {
			labels[*label.Name] = *label.Value
		}

		match := true
		for k, v := range targetLabels {
			if labels[k] != v {
				match = false
				break
			}
		}

		if match && m.Counter != nil {
			return *m.Counter.Value
		}
	}
	return 0
}
