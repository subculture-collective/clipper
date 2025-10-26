# Grafana Dashboards

This directory contains Grafana dashboard configurations for monitoring Clipper.

## Available Dashboards

### 1. Application Overview (`app-overview.json`)

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
