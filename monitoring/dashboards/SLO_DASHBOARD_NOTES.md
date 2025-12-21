# SLO Dashboard Notes

## Performance Considerations

The SLO Compliance Dashboard includes some queries with long time windows (30-day rolling) that may impact Prometheus performance on high-traffic systems.

### Optimization Recommendations

**1. Use Recording Rules for Long-Window Queries**

For production environments with high request volume, consider creating Prometheus recording rules to pre-calculate expensive queries.

Add to `prometheus.yml`:

```yaml
rule_files:
  - 'recording_rules.yml'
```

Create `monitoring/recording_rules.yml`:

```yaml
groups:
  - name: slo_recording_rules
    interval: 60s
    rules:
      # Pre-calculate 30-day availability
      - record: slo:availability:30d
        expr: |
          (
            sum(rate(http_requests_total{status=~"2..|3.."}[30d]))
            /
            sum(rate(http_requests_total[30d]))
          ) * 100

      # Pre-calculate error budget remaining
      - record: slo:error_budget:30d
        expr: |
          100 - ((1 - (sum(rate(http_requests_total{status=~"2..|3.."}[30d])) / sum(rate(http_requests_total[30d])))) / 0.005) * 100

      # Pre-calculate P95 latency
      - record: slo:latency:p95
        expr: |
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000
```

Then update dashboard queries to use recording rules:
```promql
# Instead of: (sum(rate(http_requests_total{status=~"2..|3.."}[30d])) / sum(rate(http_requests_total[30d]))) * 100
# Use: slo:availability:30d
```

**2. Adjust Time Windows for Real-Time Monitoring**

For real-time SLO monitoring, consider these alternatives:

- **6-hour window**: Good balance of recent data and performance
- **24-hour window**: Sufficient for daily SLO tracking
- **7-day window**: Weekly SLO compliance

Update queries in dashboard:
```promql
# 6-hour availability instead of 30-day
(sum(rate(http_requests_total{status=~"2..|3.."}[6h])) / sum(rate(http_requests_total[6h]))) * 100
```

**3. Increase Scrape Intervals**

For less critical metrics, increase scrape intervals to reduce load:

```yaml
# In prometheus.yml
scrape_configs:
  - job_name: 'clipper-backend'
    scrape_interval: 30s  # Instead of 10s for real-time
```

## Error Budget Formula Explanation

The error budget calculation may appear complex. Here's the breakdown:

```promql
100 - ((1 - (sum(rate(http_requests_total{status=~"2..|3.."}[30d])) / sum(rate(http_requests_total[30d])))) / 0.005) * 100
```

**Step-by-step:**

1. **Calculate availability:** `sum(rate(http_requests_total{status=~"2..|3.."}[30d])) / sum(rate(http_requests_total[30d]))`
   - Result: e.g., 0.997 (99.7%)

2. **Calculate error rate:** `1 - availability`
   - Result: 0.003 (0.3%)

3. **Calculate budget consumed:** `error_rate / 0.005`
   - Result: 0.6 (60% of budget consumed)
   - 0.005 is the allowed error rate (0.5%)

4. **Calculate budget remaining:** `(1 - budget_consumed) * 100`
   - Result: 40% budget remaining

**Simplified Alternative:**

You can break this into multiple queries for clarity:

```promql
# Query 1: Availability
alias: availability
expr: (sum(rate(http_requests_total{status=~"2..|3.."}[30d])) / sum(rate(http_requests_total[30d])))

# Query 2: Error Rate
alias: error_rate
expr: 1 - availability

# Query 3: Budget Consumed
alias: budget_consumed
expr: error_rate / 0.005

# Query 4: Budget Remaining
alias: budget_remaining
expr: (1 - budget_consumed) * 100
```

## Dashboard Customization

### Time Range Selection

The dashboard defaults to a 6-hour window. Adjust based on your needs:

- **Real-time monitoring:** 1-6 hours
- **Daily review:** 24 hours
- **Weekly review:** 7 days
- **Monthly compliance:** 30 days

### Refresh Rate

Default: 30 seconds

Adjust based on usage:
- **War room/active incident:** 10 seconds
- **Daily monitoring:** 1 minute
- **Review/analysis:** 5 minutes or manual refresh

### Alert Integration

The dashboard includes an "Active Alerts" panel. To customize:

1. Click panel → Edit
2. Modify alert filter: `{severity="critical"}` → `{severity=~"critical|warning"}`
3. Adjust display options (show/hide resolved, group by, etc.)

## Resource Usage

Expected Prometheus resource usage for SLO dashboard:

- **Memory:** ~50-100MB additional (with 30-day queries)
- **CPU:** ~5-10% additional during dashboard load
- **Storage:** Recording rules reduce long-term storage needs

If experiencing performance issues:
1. Implement recording rules
2. Reduce time windows
3. Increase scrape intervals for less critical metrics
4. Consider Thanos for long-term storage

## References

- [Prometheus Recording Rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
- [Grafana Dashboard Performance](https://grafana.com/docs/grafana/latest/dashboards/build-dashboards/best-practices/)
- [Query Optimization](https://prometheus.io/docs/prometheus/latest/querying/examples/)
