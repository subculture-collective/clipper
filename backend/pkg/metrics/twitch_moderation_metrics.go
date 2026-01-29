package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
)

var (
	// TwitchBanActionTotal tracks the total number of Twitch ban/unban attempts
	TwitchBanActionTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "twitch_ban_action_total",
			Help: "Total number of Twitch ban/unban action attempts",
		},
		[]string{"action", "status", "error_code"}, // action: ban, unban; status: success, failed; error_code: rate_limited, insufficient_scope, etc.
	)

	// TwitchBanActionDuration tracks the latency of Twitch ban/unban operations
	TwitchBanActionDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "twitch_ban_action_duration_seconds",
			Help:    "Duration of Twitch ban/unban operations in seconds",
			Buckets: []float64{.05, .1, .25, .5, 1, 2.5, 5, 10}, // 50ms to 10 seconds
		},
		[]string{"action"}, // action: ban, unban
	)

	// TwitchBanRateLimitHits tracks rate limit hits from Twitch API
	TwitchBanRateLimitHits = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "twitch_ban_rate_limit_hits_total",
			Help: "Total number of Twitch API rate limit hits for ban/unban operations",
		},
		[]string{"action"}, // action: ban, unban
	)

	// TwitchBanHTTPStatus tracks HTTP status codes from Twitch API
	TwitchBanHTTPStatus = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "twitch_ban_http_status_total",
			Help: "Total count of HTTP status codes from Twitch ban/unban API calls",
		},
		[]string{"action", "status_code", "status_class"}, // action: ban, unban; status_code: 200, 401, 429, 500, etc.; status_class: 2xx, 4xx, 5xx
	)

	// TwitchBanPermissionErrors tracks permission/scope-related errors
	TwitchBanPermissionErrors = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "twitch_ban_permission_errors_total",
			Help: "Total number of permission/scope errors for Twitch ban/unban operations",
		},
		[]string{"action", "error_type"}, // action: ban, unban; error_type: insufficient_scope, not_broadcaster, not_authenticated, etc.
	)

	// TwitchBanServerErrors tracks server-side errors from Twitch API
	TwitchBanServerErrors = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "twitch_ban_server_errors_total",
			Help: "Total number of server errors (5xx) from Twitch ban/unban API",
		},
		[]string{"action", "status_code"}, // action: ban, unban; status_code: 500, 502, 503, 504
	)
)

func registerTwitchModerationMetrics() {
	// Helper function to register metrics, ignoring AlreadyRegisteredError
	register := func(c prometheus.Collector) {
		if err := prometheus.Register(c); err != nil {
			if _, ok := err.(prometheus.AlreadyRegisteredError); !ok {
				// Only panic for non-AlreadyRegisteredError errors
				panic(err)
			}
		}
	}

	register(TwitchBanActionTotal)
	register(TwitchBanActionDuration)
	register(TwitchBanRateLimitHits)
	register(TwitchBanHTTPStatus)
	register(TwitchBanPermissionErrors)
	register(TwitchBanServerErrors)
}

func init() {
	// Register Twitch moderation metrics with Prometheus
	registerTwitchModerationMetrics()
}
