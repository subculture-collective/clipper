package metrics

import (
	"testing"

	"github.com/prometheus/client_golang/prometheus/testutil"
)

func TestTwitchBanMetricsRegistration(t *testing.T) {
	// Test that metrics are properly registered and accessible
	// We can't directly test registration without causing conflicts,
	// but we can verify the metrics are usable

	// Just verify metrics can be incremented/observed without panicking
	TwitchBanActionTotal.WithLabelValues("ban", "success", "none").Inc()
	TwitchBanActionDuration.WithLabelValues("ban").Observe(1.0)
	TwitchBanRateLimitHits.WithLabelValues("ban").Inc()
	TwitchBanHTTPStatus.WithLabelValues("ban", "200", "2xx").Inc()
	TwitchBanPermissionErrors.WithLabelValues("ban", "insufficient_scope").Inc()
	TwitchBanServerErrors.WithLabelValues("ban", "500").Inc()
}

func TestTwitchBanActionTotal(t *testing.T) {
	// Reset counter before testing
	TwitchBanActionTotal.Reset()

	// Increment counter with labels
	TwitchBanActionTotal.WithLabelValues("ban", "success", "none").Inc()
	TwitchBanActionTotal.WithLabelValues("ban", "failed", "rate_limited").Inc()
	TwitchBanActionTotal.WithLabelValues("unban", "success", "none").Inc()

	// Verify counts
	if count := testutil.ToFloat64(TwitchBanActionTotal.WithLabelValues("ban", "success", "none")); count != 1 {
		t.Errorf("Expected 1 successful ban, got %f", count)
	}

	if count := testutil.ToFloat64(TwitchBanActionTotal.WithLabelValues("ban", "failed", "rate_limited")); count != 1 {
		t.Errorf("Expected 1 failed ban due to rate limit, got %f", count)
	}

	if count := testutil.ToFloat64(TwitchBanActionTotal.WithLabelValues("unban", "success", "none")); count != 1 {
		t.Errorf("Expected 1 successful unban, got %f", count)
	}
}

func TestTwitchBanRateLimitHits(t *testing.T) {
	// Reset counter before testing
	TwitchBanRateLimitHits.Reset()

	// Record rate limit hits
	TwitchBanRateLimitHits.WithLabelValues("ban").Inc()
	TwitchBanRateLimitHits.WithLabelValues("ban").Inc()
	TwitchBanRateLimitHits.WithLabelValues("unban").Inc()

	// Verify counts
	if count := testutil.ToFloat64(TwitchBanRateLimitHits.WithLabelValues("ban")); count != 2 {
		t.Errorf("Expected 2 ban rate limit hits, got %f", count)
	}

	if count := testutil.ToFloat64(TwitchBanRateLimitHits.WithLabelValues("unban")); count != 1 {
		t.Errorf("Expected 1 unban rate limit hit, got %f", count)
	}
}

func TestTwitchBanHTTPStatus(t *testing.T) {
	// Reset counter before testing
	TwitchBanHTTPStatus.Reset()

	// Record HTTP statuses
	TwitchBanHTTPStatus.WithLabelValues("ban", "200", "2xx").Inc()
	TwitchBanHTTPStatus.WithLabelValues("ban", "429", "4xx").Inc()
	TwitchBanHTTPStatus.WithLabelValues("ban", "500", "5xx").Inc()
	TwitchBanHTTPStatus.WithLabelValues("unban", "200", "2xx").Inc()

	// Verify counts
	if count := testutil.ToFloat64(TwitchBanHTTPStatus.WithLabelValues("ban", "200", "2xx")); count != 1 {
		t.Errorf("Expected 1 ban with 200 status, got %f", count)
	}

	if count := testutil.ToFloat64(TwitchBanHTTPStatus.WithLabelValues("ban", "429", "4xx")); count != 1 {
		t.Errorf("Expected 1 ban with 429 status, got %f", count)
	}

	if count := testutil.ToFloat64(TwitchBanHTTPStatus.WithLabelValues("ban", "500", "5xx")); count != 1 {
		t.Errorf("Expected 1 ban with 500 status, got %f", count)
	}
}

func TestTwitchBanPermissionErrors(t *testing.T) {
	// Reset counter before testing
	TwitchBanPermissionErrors.Reset()

	// Record permission errors
	TwitchBanPermissionErrors.WithLabelValues("ban", "insufficient_scope").Inc()
	TwitchBanPermissionErrors.WithLabelValues("ban", "not_broadcaster").Inc()
	TwitchBanPermissionErrors.WithLabelValues("unban", "not_authenticated").Inc()

	// Verify counts
	if count := testutil.ToFloat64(TwitchBanPermissionErrors.WithLabelValues("ban", "insufficient_scope")); count != 1 {
		t.Errorf("Expected 1 insufficient_scope error for ban, got %f", count)
	}

	if count := testutil.ToFloat64(TwitchBanPermissionErrors.WithLabelValues("ban", "not_broadcaster")); count != 1 {
		t.Errorf("Expected 1 not_broadcaster error for ban, got %f", count)
	}

	if count := testutil.ToFloat64(TwitchBanPermissionErrors.WithLabelValues("unban", "not_authenticated")); count != 1 {
		t.Errorf("Expected 1 not_authenticated error for unban, got %f", count)
	}
}

func TestTwitchBanServerErrors(t *testing.T) {
	// Reset counter before testing
	TwitchBanServerErrors.Reset()

	// Record server errors
	TwitchBanServerErrors.WithLabelValues("ban", "500").Inc()
	TwitchBanServerErrors.WithLabelValues("ban", "502").Inc()
	TwitchBanServerErrors.WithLabelValues("unban", "503").Inc()

	// Verify counts
	if count := testutil.ToFloat64(TwitchBanServerErrors.WithLabelValues("ban", "500")); count != 1 {
		t.Errorf("Expected 1 ban with 500 error, got %f", count)
	}

	if count := testutil.ToFloat64(TwitchBanServerErrors.WithLabelValues("ban", "502")); count != 1 {
		t.Errorf("Expected 1 ban with 502 error, got %f", count)
	}

	if count := testutil.ToFloat64(TwitchBanServerErrors.WithLabelValues("unban", "503")); count != 1 {
		t.Errorf("Expected 1 unban with 503 error, got %f", count)
	}
}
