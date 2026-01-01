# Grafana Dashboards

This directory contains Grafana dashboard configurations for monitoring Clipper.

**Part of:** [Roadmap 5.0 Phase 5.3 - Observability](https://github.com/subculture-collective/clipper/issues/805)

All dashboards are:
- ✅ Version-controlled as JSON in this repository
- ✅ Parameterized with template variables for filtering
- ✅ Aligned with Prometheus metrics from [prometheus.yml](../prometheus.yml)
- ✅ Integrated with alerting rules in [alerts.yml](../alerts.yml)
- ✅ Linked from operational runbooks

## Available Dashboards

### 1. System Health Dashboard (`system-health.json`) 🆕

Monitors system-level infrastructure metrics for servers and containers.

**Panels:**

- CPU Usage (%) - Per instance with thresholds at 70%/80%
- Memory Usage (%) - Per instance with thresholds at 70%/80%
- Disk Usage (%) - Per mountpoint with thresholds at 80%/90%
- Disk I/O - Read/write rates
- Network Traffic - Receive/transmit rates
- System Load Average - 1m, 5m, 15m load
- Current CPU/Memory/Disk stats
- System Uptime

**Use Cases:**
- Monitor server resource utilization
- Identify capacity issues before they impact performance
- Track infrastructure health trends

### 2. API Performance Dashboard (`api-performance.json`) 🆕

Comprehensive API monitoring for request performance, throughput, and errors.

**Panels:**

- Request Rate - Requests per second by HTTP method
- Error Rate (%) - With thresholds at 0.5%/1%
- Latency (P50, P95, P99) - Response time percentiles
- Throughput by Endpoint - Top 10 busiest endpoints
- Status Code Distribution - 2xx, 4xx, 5xx breakdown
- In-Flight Requests - Current concurrent requests
- Request/Response Size - Data transfer metrics
- Current stats - Request rate, error rate, P95 latency, active requests

**Use Cases:**
- Monitor API health and performance
- Identify slow endpoints
- Track error patterns
- Capacity planning

### 3. Database Dashboard (`database.json`) 🆕

PostgreSQL database performance monitoring with query and connection metrics.

**Panels:**

- Active Connections - Connection pool usage with threshold at 80
- Database Size - Storage growth over time
- Query Rate - Queries per second
- Transaction Rate - Commits and rollbacks
- Query Duration (P95) - Query performance with threshold at 1s
- Slow Queries - Queries taking > 1 second
- Cache Hit Ratio - Buffer cache effectiveness (target: >95%)
- Deadlocks - Database deadlock rate
- Tuple Operations - Inserts, updates, deletes
- Connection Pool Status - Active connections by database
- Current stats - Connections, cache hit ratio, size, query rate

**Use Cases:**
- Optimize database query performance
- Monitor connection pool health
- Identify slow queries
- Track database growth

**Note:** Some advanced metrics require the `pg_stat_statements` extension to be enabled in PostgreSQL. The dashboard will gracefully handle missing metrics.

### 3A. PgBouncer Connection Pool Dashboard (`pgbouncer-pool.json`) 🆕

Comprehensive PgBouncer connection pooling metrics for monitoring database connection efficiency.

**Panels:**

- Active Client Connections - Client connections to PgBouncer
- Server Connections to PostgreSQL - Active, idle, and used server connections
- Pool Size vs Limits - Current pool size against configured limits
- Query Rate - Queries per second and pooled query rate
- Average Query Duration - Query execution time monitoring
- Connection Wait Time - Time clients wait for available connections
- Total Client Connections (stat) - Current total clients
- Pool Utilization % (stat) - Percentage of pool capacity used
- Waiting Clients Queue (stat) - Number of clients waiting
- Connection Errors (stat) - Error rate per second

**Alerts:**

- Client connections approaching limit (>45)
- High connection wait time (>50ms)

**Use Cases:**

- Monitor connection pool health and efficiency
- Detect connection exhaustion before it impacts performance
- Optimize pool size configuration
- Track connection reuse and pooling effectiveness

**Related Documentation:**

- [PgBouncer Configuration Guide](../../backend/k8s/PGBOUNCER.md)
- [Load Test Validation](../../backend/tests/load/validate_pgbouncer.sh)

**Configuration Note:**

⚠️ The dashboard uses a hardcoded value of 50 for the max pool size in the "Pool Utilization %" panel calculation. If you change `max_db_connections` in the PgBouncer ConfigMap, you must also update:
- Dashboard JSON line 284: `(pgbouncer_pools_sv_active{database="clipper_db"} / 50) * 100`
- Update the divisor (50) to match your new max_db_connections value

### 4. User Experience Dashboard (`user-experience.json`) 🆕

Frontend and user-facing metrics for monitoring end-user experience.

**Panels:**

- Page Load Times - P50, P95, P99 latencies with thresholds
- Error Rate by Status Code - 4xx and 5xx errors
- Active Users - Current concurrent users
- Request Success Rate - Target: >99.5%
- API Response Time by Endpoint - P95 for top endpoints
- Errors by Endpoint - Error rates by path
- User Session Duration - P50 and P95 session lengths
- Client Errors (4xx) - Breakdown by specific status codes
- Current stats - Frontend load time, error rate, active users, success rate

**Use Cases:**
- Monitor end-user experience
- Track page performance
- Identify UX issues
- Monitor user engagement

**Note:** Some metrics like `active_users_current` and `user_session_duration_seconds` require additional instrumentation in the application. The dashboard will show 0 if these metrics are not exposed.

### 5. Application Overview (`app-overview.json`)

Provides a high-level view of application health and SLO compliance.

**Panels:**

- SLO: Availability (99.5% target)
- SLO: Error Rate (< 0.5% target)
- SLO: P95 Latency (< 100ms target)
- Error Budget Remaining
- Request Rate over time
- Response Time Distribution (P50, P95, P99)
- Status Code Distribution
- Top Endpoints by Traffic
- Database Connection Pool
- Cache Hit Rate

### 6. Search Quality Metrics (`search-quality.json`)

Tracks semantic search quality metrics and performance over time.

**Offline Metrics Panels:**

- nDCG@5 (target: 0.75) - Ranking quality for top 5 results
- nDCG@10 (target: 0.80) - Ranking quality for top 10 results
- MRR (target: 0.70) - Mean Reciprocal Rank
- Precision@5 (target: 0.60) - Fraction of top 5 that are relevant
- Search Quality Metrics Trend - Historical view with targets

**Performance Panels:**

- Search Query Latency (P95) - By search type (hybrid, BM25, vector)
- Search Query Rate - Queries per second by type
- Embedding Cache Hit Rate
- Embedding Generation Rate
- Embedding Coverage

**Online Metrics Panels:**

- Click-Through Rate (CTR)
- Zero Result Rate
- Average Click Position
- Session Success Rate

### 7. Engagement Metrics (`engagement-metrics.json`)

Tracks user engagement, platform health, and content performance metrics.

**Platform Health Panels:**

- Active Users (DAU/WAU/MAU) - Daily, weekly, and monthly active users
- Platform Stickiness (DAU/MAU) - User retention indicator with thresholds
- Retention Rates - Day 1, Day 7, and Day 30 retention percentages
- Churn Rate - Monthly churn rate with alert threshold
- Week-over-Week Changes - Trending metrics comparing to previous periods

**User Engagement Panels:**

- User Engagement Score Distribution - P50, P90, P95 percentiles
- Engagement Tier Distribution - Count of users in each tier (Inactive, Low, Moderate, High, Very High)
- User Activity Heatmap - Activity patterns by hour of day

**Content Engagement Panels:**

- Content Engagement Scores - Average and P90 content scores
- Active Engagement Alerts - Table of current alerts requiring attention

**Alert Thresholds:**

- Critical (P1): DAU drop > 20%, Churn > 7%, Stickiness < 15%
- Warning (P2): DAU drop > 10%, Churn > 5%
- Info (P3): Engagement score drops, content performance issues

### 8. Webhook Monitoring Dashboard (`webhook-monitoring.json`) 🆕

Comprehensive webhook delivery monitoring with anomaly detection and per-subscription health tracking.

**Summary Panels:**

- Webhook Delivery Success Rate - With color-coded thresholds (95%+ green)
- Active Webhook Subscriptions - Current active subscription count
- Retry Queue Size - Items pending retry (100+ warning, 500+ critical)
- Dead Letter Queue Size - Failed deliveries (10+ warning, 50+ critical)

**Delivery Performance Panels:**

- Webhook Delivery Rate by Status - Success, failed, and retry rates
- Webhook Failure Rate - Percentage of failed deliveries over time
- Webhook Delivery Latency (P50, P95, P99) - Response time percentiles
- Webhook HTTP Status Codes - Distribution of response codes from endpoints

**Event Analysis Panels:**

- Webhook Deliveries by Event Type - Volume per event (clip.submitted, clip.approved, etc.)
- Webhook Retry Attempts Distribution - Success/failure/retry patterns
- Retry Queue and DLQ Size Over Time - Queue size trends
- DLQ Movement Rate by Reason - Categorized failure reasons

**Advanced Metrics Panels:**

- Time to Successful Delivery (P95) - Time from first attempt to success
- Webhook Retry Rate by Attempt Number - Retry distribution (attempts 1-5)
- Top 10 Subscriptions by Delivery Volume - Busiest webhook subscriptions
- Subscription Health - Success vs failed deliveries per subscription
- Consecutive Failures by Subscription - Subscriptions experiencing ongoing issues

**Use Cases:**

- Monitor webhook delivery health and performance
- Identify problematic subscriptions requiring attention
- Track retry patterns and queue health
- Detect anomalies in delivery latency or failure rates
- Investigate DLQ items and failure reasons
- Capacity planning for webhook processing

**Alert Integration:**

- Panel alerts for consecutive failures > 5
- Links to comprehensive troubleshooting runbook
- Color-coded thresholds aligned with alerting rules

**Related Documentation:**

- [Webhook Monitoring Guide](../../docs/operations/webhook-monitoring.md)
- [Webhook Integration Guide](../../docs/backend/webhooks.md)
- [Webhook Retry System](../../docs/backend/webhook-retry.md)

## Importing Dashboards

### Via Grafana UI

1. Open Grafana (<http://localhost:3000>)
2. Login with admin credentials
3. Navigate to Dashboards → Import
4. Upload JSON file or paste JSON content
5. Select Prometheus data source
6. Click Import

### Via Grafana API

```bash
# Set variables
GRAFANA_URL="http://localhost:3000"
GRAFANA_API_KEY="your-api-key"
DASHBOARD_FILE="app-overview.json"

# Import dashboard
curl -X POST "${GRAFANA_URL}/api/dashboards/db" \
  -H "Authorization: Bearer ${GRAFANA_API_KEY}" \
  -H "Content-Type: application/json" \
  -d @"${DASHBOARD_FILE}"
```

### Via Provisioning

Add to `grafana/provisioning/dashboards/dashboard.yml`:

```yaml
apiVersion: 1

providers:
  - name: 'Clipper Dashboards'
    orgId: 1
    folder: 'Clipper'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 10
    allowUiUpdates: true
    options:
      path: /etc/grafana/provisioning/dashboards
```

Then copy dashboard JSON files to the provisioning directory.

## Creating Custom Dashboards

### Query Examples

**Request Rate:**

```promql
sum(rate(http_requests_total[5m]))
```

**Error Rate:**

```promql
sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))
```

**P95 Latency:**

```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

**Cache Hit Rate:**

```promql
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

### Variables

Add template variables for dynamic filtering:

- `$environment`: Environment (production, staging)
- `$instance`: Backend instance
- `$interval`: Time interval for aggregation

## Best Practices

1. **Use Consistent Time Ranges**: Align dashboard time range with SLO measurement periods
2. **Add Annotations**: Mark deployments and incidents on graphs
3. **Set Appropriate Refresh Rates**: 30s for operational dashboards, 5m for overview
4. **Configure Alerts in alerts.yml**: Define all alerts in `monitoring/alerts.yml` rather than embedding them in dashboard JSON. Grafana dashboard alerts are deprecated in favor of unified alerting.
5. **Use Recording Rules for Complex Queries**: For frequently used complex calculations (like cache hit rates), define recording rules in Prometheus to improve dashboard performance
6. **Document Queries**: Add panel descriptions explaining what metrics mean
7. **Template Variables**: Use template variables for filtering by instance, namespace, environment, etc.
8. **Align with Prometheus Metrics**: Ensure dashboard queries match metrics exposed by exporters in `prometheus.yml`

### 9. Redis Cache Monitoring Dashboard (`redis.json`) 🆕

Comprehensive Redis cache performance monitoring for cache health and efficiency tracking.

**Summary Panels:**

- Redis Uptime - Current uptime of Redis instance
- Connected Clients - Current client connections
- Memory Usage - Percentage of allocated memory used (gauge)
- Cache Hit Rate - Percentage of successful cache hits (gauge)

**Performance Panels:**

- Commands per Second - Redis command throughput
- Memory Usage Over Time - Memory consumption trends with max limit
- Cache Hit Rate Over Time - Cache effectiveness over time
- Keyspace Operations - Hit and miss rates

**Connection & Operations Panels:**

- Connected Clients Over Time - Client connection trends
- Blocked Clients - Clients waiting on blocking operations
- Evicted Keys - Key eviction rate due to memory pressure
- Expired Keys - Natural key expiration rate
- Total Keys in Keyspace - Key count by database

**Network & Advanced Metrics:**

- Network I/O - Incoming and outgoing bytes per second
- Commands by Type - Top 10 most used Redis commands
- Slowlog Entries - Number of slow commands logged
- RDB Last Save Time - Time since last persistence snapshot
- Instantaneous Ops/sec - Current operational rate

**Use Cases:**

- Monitor cache performance and hit rates
- Identify memory pressure and eviction issues
- Track connection patterns and client behavior
- Optimize cache configuration
- Detect slow operations and bottlenecks

**Alert Integration:**

- Thresholds aligned with Redis alerts in `monitoring/alerts.yml`
- RedisDown, HighRedisMemoryUsage, LowCacheHitRate alerts configured

**Related Documentation:**

- [Prometheus Configuration](../prometheus.yml) - Redis exporter setup
- [Alerts](../alerts.yml) - Redis alerting rules (clipper_redis_alerts group)

### 10. Kubernetes Cluster Overview Dashboard (`kubernetes.json`) 🆕

Comprehensive Kubernetes cluster health monitoring for pods, nodes, resources, and workloads.

**Cluster Summary Panels:**

- Cluster Nodes - Total number of nodes in cluster
- Total Pods - Pod count across selected namespaces
- Running Pods - Healthy running pod count
- Failed Pods - Pods in failed state

**Resource Usage Panels:**

- Cluster CPU Usage - CPU usage by namespace over time
- Cluster Memory Usage - Memory consumption by namespace
- Node CPU Usage - Per-node CPU utilization with thresholds
- Node Memory Usage - Per-node memory utilization
- Disk Usage by Node - Node filesystem usage

**Pod & Workload Health:**

- Pod Status by Namespace - Running, pending, and failed pods
- Pod Restarts - Container restart rate by namespace and pod
- Container CPU Throttling - CPU throttling events indicating limit constraints
- Pending Pods Duration - Long-running pending pods (>5 minutes)

**Deployment & StatefulSet Status:**

- Deployment Status - Replica counts (desired vs available vs unavailable)
- StatefulSet Status - StatefulSet replica readiness
- HPA Status - HorizontalPodAutoscaler current, desired, and max replicas

**Network & Storage:**

- Network I/O - Network throughput by namespace
- PersistentVolume Status - PV phase and availability
- Ingress Status - Ingress resource information
- Service Status - Service configuration details

**Node Health:**

- Node Conditions - Node status (Ready, MemoryPressure, DiskPressure, PIDPressure)

**Use Cases:**

- Monitor overall cluster health and capacity
- Track pod and deployment status
- Identify resource exhaustion and scheduling issues
- Detect node problems and pressure conditions
- Monitor HPA scaling behavior
- Track network and storage resource usage

**Alert Integration:**

- Thresholds aligned with K8s alerts in `monitoring/alerts.yml`
- PodCPUThrottling, ContainerOOMKilled, HPA scaling, and node condition alerts configured
- See clipper_quota_alerts and hpa_scaling_alerts groups in alerts.yml

**Related Documentation:**

- [Kubernetes Runbook](../../docs/operations/kubernetes-runbook.md)
- [Resource Quotas Dashboard](./resource-quotas.json) - For quota-specific monitoring
- [Alerts](../alerts.yml) - HPA and K8s alerting rules (hpa_scaling_alerts, clipper_quota_alerts groups)

### 11. Resource Quotas & Limits Dashboard (`resource-quotas.json`) 🆕

Kubernetes resource quota and limit monitoring for capacity management and OOM prevention.

**Panels:**

- CPU Quota Usage by Namespace - Percentage of quota used
- Memory Quota Usage by Namespace - Percentage of quota used
- Pod Count vs Quota - Current pods vs limits
- Storage Quota Usage - PVC storage utilization
- Container Memory Usage vs Limits - Individual container memory usage
- Container CPU Throttling Rate - Throttled seconds per second
- OOM Killed Containers - Count of OOM kills in last hour
- Quota Violations - Alert count in last hour
- PVC Count vs Quota - PersistentVolumeClaim usage
- CPU Throttling Events - Top 10 throttled containers
- Resource Quota Details by Namespace - Detailed quota table
- LimitRange Constraints - Container resource constraints

**Use Cases:**
- Monitor namespace resource usage against quotas
- Prevent resource exhaustion
- Identify containers at risk of OOM
- Track CPU throttling issues
- Capacity planning and optimization

**Related:**
- Documentation: `docs/operations/resource-quotas.md`
- Issues: [#853](https://github.com/subculture-collective/clipper/issues/853), [#805](https://github.com/subculture-collective/clipper/issues/805)
- Alerts: `monitoring/alerts.yml` (clipper_quota_alerts group)

## Troubleshooting

### No Data Displayed

- Verify Prometheus is scraping metrics: Check Prometheus targets page
- Verify metric names: Run queries in Prometheus directly
- Check time range: Ensure time range includes periods with data
- Verify data source: Confirm Prometheus data source is configured correctly

### Slow Dashboard Load

- Reduce query complexity: Simplify PromQL queries
- Increase scrape interval: Adjust Prometheus scrape_interval
- Use recording rules: Pre-compute complex queries
- Limit time range: Don't load too much historical data

### Incorrect Values

- Check metric labels: Verify label names and values
- Review aggregation: Ensure proper use of sum(), rate(), etc.
- Verify rate intervals: Use appropriate interval for rate()
- Check data source: Confirm using correct Prometheus instance

## Performance Optimization

For frequently queried metrics that appear in multiple dashboards, consider defining Prometheus recording rules:

**Example Redis cache hit rate recording rule:**

```yaml
# Add to prometheus.yml or a separate rules file
groups:
  - name: redis_recording_rules
    interval: 30s
    rules:
      - record: redis:cache_hit_rate
        expr: |
          rate(redis_keyspace_hits_total[5m]) 
          / 
          (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

This pre-computes the cache hit rate, improving dashboard load times when the metric is used in multiple panels.

## References

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Query Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Prometheus Recording Rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
