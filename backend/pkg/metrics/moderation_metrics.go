package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
)

var (
	// ModerationBanOperationsTotal tracks the total number of ban operations
	ModerationBanOperationsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "moderation_ban_operations_total",
			Help: "Total number of moderation ban operations",
		},
		[]string{"operation", "status", "error_type"}, // operation: ban, unban; status: success, failed
	)

	// ModerationBanOperationDuration tracks the latency of ban operations
	ModerationBanOperationDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "moderation_ban_operation_duration_seconds",
			Help:    "Duration of moderation ban operations in seconds",
			Buckets: []float64{.01, .025, .05, .1, .25, .5, 1, 2.5, 5}, // 10ms to 5 seconds
		},
		[]string{"operation"}, // operation: ban, unban
	)

	// ModerationSyncOperationsTotal tracks the total number of sync operations
	ModerationSyncOperationsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "moderation_sync_operations_total",
			Help: "Total number of moderation sync operations",
		},
		[]string{"status", "error_type"}, // status: success, failed
	)

	// ModerationSyncOperationDuration tracks the latency of sync operations
	ModerationSyncOperationDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "moderation_sync_operation_duration_seconds",
			Help:    "Duration of moderation sync operations in seconds",
			Buckets: []float64{.1, .5, 1, 2, 5, 10, 30, 60}, // 100ms to 60 seconds
		},
		[]string{"sync_type"}, // sync_type: full, incremental
	)

	// ModerationSyncBansProcessed tracks the number of bans processed during sync
	ModerationSyncBansProcessed = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "moderation_sync_bans_processed_total",
			Help: "Total number of bans processed during sync operations",
		},
		[]string{"status"}, // status: new, updated, unchanged
	)

	// ModerationPermissionChecksTotal tracks the total number of permission checks
	ModerationPermissionChecksTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "moderation_permission_checks_total",
			Help: "Total number of moderation permission checks",
		},
		[]string{"permission_type", "result"}, // permission_type: ban, unban, view_bans; result: allowed, denied
	)

	// ModerationPermissionCheckDuration tracks the latency of permission checks
	ModerationPermissionCheckDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "moderation_permission_check_duration_seconds",
			Help:    "Duration of moderation permission checks in seconds",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25}, // 1ms to 250ms
		},
		[]string{"permission_type"},
	)

	// ModerationPermissionDenialsTotal tracks permission denials for monitoring spikes
	ModerationPermissionDenialsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "moderation_permission_denials_total",
			Help: "Total number of moderation permission denials",
		},
		[]string{"permission_type", "reason"}, // reason: insufficient_permissions, not_authorized, scope_error
	)

	// ModerationAuditLogOperationsTotal tracks audit log operations
	ModerationAuditLogOperationsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "moderation_audit_log_operations_total",
			Help: "Total number of moderation audit log operations",
		},
		[]string{"action", "status"}, // action: create, read, list; status: success, failed
	)

	// ModerationAuditLogOperationDuration tracks the latency of audit log operations
	ModerationAuditLogOperationDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "moderation_audit_log_operation_duration_seconds",
			Help:    "Duration of moderation audit log operations in seconds",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5}, // 1ms to 500ms
		},
		[]string{"action"},
	)

	// ModerationAuditLogVolume tracks the volume of audit logs
	ModerationAuditLogVolume = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "moderation_audit_log_volume",
			Help: "Current volume of audit logs by time period",
		},
		[]string{"period"}, // period: hour, day, week
	)

	// ModerationAPIErrorsTotal tracks API errors for moderation endpoints
	ModerationAPIErrorsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "moderation_api_errors_total",
			Help: "Total number of moderation API errors",
		},
		[]string{"endpoint", "error_code"}, // endpoint: /ban, /unban, /sync, etc; error_code: 400, 403, 500, etc
	)

	// ModerationDatabaseQueryDuration tracks database query performance for moderation operations
	ModerationDatabaseQueryDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "moderation_database_query_duration_seconds",
			Help:    "Duration of moderation database queries in seconds",
			Buckets: []float64{.001, .005, .01, .025, .05, .1, .25, .5, 1}, // 1ms to 1 second
		},
		[]string{"query_type"}, // query_type: ban_user, unban_user, list_bans, check_permission, etc
	)

	// ModerationSlowQueriesTotal tracks slow queries (> 1s) for alerting
	ModerationSlowQueriesTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "moderation_slow_queries_total",
			Help: "Total number of slow moderation queries (> 1s)",
		},
		[]string{"query_type"},
	)

	// ModerationActiveBansGauge tracks the current number of active bans
	ModerationActiveBansGauge = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "moderation_active_bans",
			Help: "Current number of active bans",
		},
		[]string{"community_type"}, // community_type: channel, site
	)
)

func registerModerationMetrics() {
	// Helper function to register metrics, ignoring AlreadyRegisteredError
	register := func(c prometheus.Collector) {
		if err := prometheus.Register(c); err != nil {
			if _, ok := err.(prometheus.AlreadyRegisteredError); !ok {
				// Only panic for non-AlreadyRegisteredError errors
				panic(err)
			}
		}
	}

	register(ModerationBanOperationsTotal)
	register(ModerationBanOperationDuration)
	register(ModerationSyncOperationsTotal)
	register(ModerationSyncOperationDuration)
	register(ModerationSyncBansProcessed)
	register(ModerationPermissionChecksTotal)
	register(ModerationPermissionCheckDuration)
	register(ModerationPermissionDenialsTotal)
	register(ModerationAuditLogOperationsTotal)
	register(ModerationAuditLogOperationDuration)
	register(ModerationAuditLogVolume)
	register(ModerationAPIErrorsTotal)
	register(ModerationDatabaseQueryDuration)
	register(ModerationSlowQueriesTotal)
	register(ModerationActiveBansGauge)
}

func init() {
	// Register moderation metrics with Prometheus
	registerModerationMetrics()
}
