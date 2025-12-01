# Operations: Monitoring

Observability, metrics, and alerting for Clipper.

## Metrics

### Application Metrics (Prometheus)

Tracked via Prometheus:
- HTTP request count, duration, status codes (by endpoint)
- Database query duration
- Cache hit/miss rates
- OpenSearch query latency
- Active connections (DB, Redis, OpenSearch)

### System Metrics

Via Node Exporter:
- CPU, memory, disk usage
- Network I/O
- Container/pod resource utilization

### Business Metrics

- Clip ingestion rate (clips/hour)
- Search queries/second
- User signups/day
- Premium subscriptions (active, churned)
- Comment/vote activity

## Logging

Structured JSON logs:
- Backend: stdout (captured by Kubernetes)
- Frontend: browser errors sent to backend `/api/v1/errors`
- Aggregation: Loki or CloudWatch Logs

Log levels: DEBUG, INFO, WARN, ERROR

## Tracing

Distributed tracing with OpenTelemetry:
- Trace ID propagated across services
- Spans for: HTTP handlers, DB queries, external API calls
- Backend: Jaeger or Tempo

## Dashboards

Grafana dashboards:
- **Overview**: Request rate, error rate, latency (p50, p95, p99)
- **Database**: Connection pool, query duration, slow queries
- **Search**: Query rate, latency, index lag
- **Premium**: Subscriptions, checkout funnel

## Alerts

PagerDuty/OpsGenie alerts for:
- High error rate (>5% for 5 minutes)
- p95 latency > 500ms
- Database connection pool exhaustion
- OpenSearch cluster health red
- Disk usage > 85%

## Health Checks

Endpoints:
- `GET /health` - Overall system health
- `GET /health/db` - Database connectivity
- `GET /health/redis` - Cache connectivity
- `GET /health/search` - OpenSearch status

Used by Kubernetes liveness/readiness probes.

## SLOs (Service Level Objectives)

Target SLOs:
- Availability: 99.9% uptime
- Latency: p95 < 200ms, p99 < 500ms
- Error rate: < 0.1%

## Incident Response

1. Alert fires → on-call engineer paged
2. Check dashboards for root cause
3. Mitigate (scale up, rollback, etc.)
4. Post-incident review and documentation

---

Related: [[infra|Infrastructure]] · [[cicd|CI/CD]] · [[deployment|Deployment]]

[[../index|← Back to Index]]
