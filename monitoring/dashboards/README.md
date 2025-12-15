# Grafana Dashboards

This directory contains Grafana dashboard configurations for monitoring Clipper.

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
4. **Use Alert States**: Link dashboard panels to alert rules
5. **Document Queries**: Add panel descriptions explaining what metrics mean

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

## References

- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Query Basics](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
