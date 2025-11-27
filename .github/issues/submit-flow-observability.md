# [Feature] Production Observability and Monitoring for Submit Flow

## Summary

Implement comprehensive monitoring, logging, alerting, and analytics for the clip submission system to track health, performance, user behavior, and business metrics in production.

## Scope

### Application Performance Monitoring (APM)

- **Metrics collection**: Prometheus exporters for Go backend
- **Trace collection**: OpenTelemetry instrumentation
- **Metrics tracked**:
    - Submission success/failure rates
    - Metadata fetch latency (p50, p95, p99)
    - Submit endpoint latency
    - Moderation queue depth
    - Auto-approval rate
    - Database query performance
    - Cache hit/miss rates

### Logging Infrastructure

- **Structured logging**: JSON format with correlation IDs
- **Log aggregation**: Ship to centralized logging (Loki, CloudWatch, or similar)
- **Log levels**: DEBUG, INFO, WARN, ERROR with appropriate usage
- **Context**: User ID, submission ID, clip ID, request ID on all logs
- **Retention**: 30 days for INFO, 90 days for WARN/ERROR

### Alerting Rules

- **Critical alerts** (PagerDuty/Slack):
    - Submission endpoint error rate > 5%
    - Metadata fetch failure rate > 10%
    - Moderation queue depth > 100 items
    - Database connection pool exhaustion
    - Redis connection failures
- **Warning alerts** (Slack only):
    - Submission latency p95 > 500ms
    - Metadata fetch latency p95 > 1000ms
    - Cache hit rate < 70%
    - Duplicate submission rate > 20%

### Business Metrics Dashboard

- **Submission metrics**:
    - Submissions per hour/day/week
    - Success vs. rejection rates
    - Auto-approval vs. manual moderation split
    - Average time to moderation decision
    - Top rejection reasons
- **User metrics**:
    - Active submitters per day
    - Repeat submission rate
    - Karma distribution of submitters
    - Geographic distribution
- **Content metrics**:
    - Top games/categories submitted
    - NSFW submission rate
    - Average clip duration
    - Popular streamers

### Frontend Analytics

- **User journey tracking**:
    - Submit page visits
    - Form abandonment rate (per step)
    - Time spent on submit page
    - Success vs. error outcomes
- **Error tracking**:
    - Frontend JS errors (Sentry)
    - API error responses shown to users
    - Network failures
    - Retry attempts

### Mobile Analytics

- **App analytics** (PostHog or Firebase):
    - Submit flow starts
    - Step completion rates
    - Step abandonment points
    - Time per step
    - Success/error rates
    - Device/OS distribution

### Cost Monitoring

- **Twitch API usage**: Track calls/day, quota remaining
- **Database costs**: Query volume, storage growth
- **Redis costs**: Memory usage, eviction rate
- **CDN costs**: Thumbnail delivery bandwidth

## Acceptance Criteria

### Metrics & Monitoring

- [ ] Prometheus metrics exposed on `/metrics` endpoint
- [ ] OpenTelemetry traces sent to collector
- [ ] Grafana dashboard showing all key metrics
- [ ] Submission success rate metric (counter)
- [ ] Submission latency histogram (p50, p95, p99)
- [ ] Moderation queue depth gauge
- [ ] Cache hit rate percentage
- [ ] Database connection pool utilization

### Logging

- [ ] All submission requests logged with correlation ID
- [ ] Metadata fetch attempts logged (success/failure)
- [ ] Moderation actions logged with admin user ID
- [ ] Error logs include stack traces and context
- [ ] Logs queryable in centralized system
- [ ] Log volume < 1GB/day at 1000 submissions/day

### Alerting

- [ ] Critical alerts route to on-call rotation
- [ ] Warning alerts route to dev Slack channel
- [ ] Alert runbooks documented for each alert
- [ ] False positive rate < 5%
- [ ] Mean time to acknowledge < 15 minutes
- [ ] Alert fatigue mitigated (grouped, deduplicated)

### Dashboards

- [ ] Executive dashboard (business metrics)
- [ ] Engineering dashboard (performance metrics)
- [ ] On-call dashboard (system health)
- [ ] All dashboards auto-refresh (30s-5min)
- [ ] Dashboards accessible to relevant teams
- [ ] Mobile-friendly dashboard views

### Analytics

- [ ] Submission funnel tracked (visit → start → complete)
- [ ] Error types categorized and counted
- [ ] User cohorts tracked (new vs. returning submitters)
- [ ] A/B test framework ready for submit UI
- [ ] Weekly automated report generation

### Documentation

- [ ] Monitoring architecture documented
- [ ] Alert runbook for each alert type
- [ ] Dashboard usage guide
- [ ] Metric definitions and SLIs documented
- [ ] On-call playbook updated

## Priority

**P1 (High priority)**

Required before production launch but not blocking MVP development.

## Milestone

**Beta** (core UX completeness, reliability, admin)

## Tech Notes

### Metrics Stack

**Prometheus** for metrics collection:

```go
// Example instrumentation
var (
    submissionsTotal = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "submissions_total",
            Help: "Total number of clip submissions",
        },
        []string{"status", "auto_approved"},
    )

    submissionDuration = promauto.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "submission_duration_seconds",
            Help: "Submission processing duration",
            Buckets: prometheus.DefBuckets,
        },
        []string{"endpoint"},
    )
)
```

**Grafana** for visualization:

- Pre-built dashboards in `monitoring/grafana/dashboards/`
- Variables for time range, environment, user cohort
- Drill-down links to logs and traces

### Logging Implementation

Use structured logging with `zap`:

```go
logger.Info("submission created",
    zap.String("submission_id", submission.ID),
    zap.String("user_id", userID),
    zap.String("clip_id", clipID),
    zap.String("request_id", requestID),
    zap.Bool("auto_approved", autoApproved),
)
```

### Tracing with OpenTelemetry

```go
ctx, span := tracer.Start(ctx, "SubmitClip")
defer span.End()

span.SetAttributes(
    attribute.String("user.id", userID),
    attribute.String("clip.id", clipID),
)
```

### Alerting Configuration

**Prometheus Alertmanager** rules:

```yaml
groups:
    - name: submissions
      rules:
          - alert: HighSubmissionErrorRate
            expr: rate(submissions_total{status="error"}[5m]) > 0.05
            for: 5m
            labels:
                severity: critical
            annotations:
                summary: 'High submission error rate'

          - alert: ModerationQueueBacklog
            expr: moderation_queue_depth > 100
            for: 10m
            labels:
                severity: warning
```

### Business Metrics Queries

**Daily submissions growth**:

```promql
sum(increase(submissions_total[1d]))
```

**Auto-approval rate**:

```promql
sum(rate(submissions_total{auto_approved="true"}[1h]))
/
sum(rate(submissions_total[1h]))
```

### Frontend Error Tracking

**Sentry integration**:

```typescript
Sentry.init({
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    beforeSend(event) {
        // Add submission context
        if (event.contexts?.submission) {
            event.tags = {
                ...event.tags,
                submission_step: event.contexts.submission.step,
            };
        }
        return event;
    },
});
```

### Mobile Analytics

**PostHog events**:

```typescript
posthog.capture('submit_flow_started', {
    user_karma: user.karma_points,
    source: 'mobile_app',
});

posthog.capture('submit_step_completed', {
    step: 2,
    time_spent_ms: 15000,
});
```

### Cost Tracking

Monitor and alert on:

- Twitch API calls (limit: 800/minute)
- Database storage growth (alert at 80% capacity)
- Redis memory usage (alert at 90% capacity)
- CDN bandwidth (alert at 90% monthly quota)

### Performance SLIs/SLOs

| Metric                  | SLI          | SLO      | Alert Threshold |
| ----------------------- | ------------ | -------- | --------------- |
| Submission success rate | % successful | >95%     | <93%            |
| Submission latency      | p95          | <500ms   | >700ms          |
| Metadata fetch latency  | p95          | <800ms   | >1200ms         |
| Moderation queue time   | median       | <2 hours | >6 hours        |
| Cache hit rate          | % hits       | >80%     | <70%            |

### Runbook Examples

**High Submission Error Rate**:

1. Check Grafana dashboard for error breakdown
2. Query logs for recent errors: `grep "submission.*error"`
3. Check Twitch API status page
4. Verify database connectivity
5. Escalate to backend team if unresolved in 30min

**Moderation Queue Backlog**:

1. Check current queue depth in dashboard
2. Notify moderation team in Slack
3. Check if auto-approval is working correctly
4. Consider temporarily lowering auto-approval threshold
5. Monitor queue depth trend

## Related Issues

- Depends on: #[Backend Metadata Integration]
- Depends on: #[Submit Flow E2E Testing]
- Related: Infrastructure setup (Prometheus, Grafana, Alertmanager)
- Enables: Production launch with confidence
- Enables: Data-driven optimization of submit flow
