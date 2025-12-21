# K6 Load Test Trends Dashboard

## Overview

This dashboard visualizes K6 load test results and trends over time. It provides insights into:

- Response time trends (p95, p99)
- Error rates by scenario
- Throughput (requests/second)
- Virtual user patterns
- Check success rates
- Request distribution

## Dashboard Details

**File**: `load-test-trends.json`  
**UID**: `k6-load-test-trends`  
**Tags**: `load-testing`, `k6`, `performance`

## Prerequisites

### Option 1: Real-time Metrics (Prometheus)

For real-time load test monitoring during test execution:

1. **Configure K6 to export to Prometheus**:
   ```bash
   # Start Prometheus with K6 metrics endpoint
   k6 run --out experimental-prometheus-rw scenario.js
   ```

2. **Update Prometheus configuration** (`monitoring/prometheus.yml`):
   ```yaml
   scrape_configs:
     - job_name: 'k6-load-test'
       static_configs:
         - targets: ['localhost:5656']  # K6 metrics endpoint
   ```

3. Import the dashboard in Grafana using the dashboard JSON file.

### Option 2: Historical Trends (GitHub Actions Artifacts)

For viewing historical trends from CI/CD runs:

1. **Download artifacts** from GitHub Actions workflow runs
2. **Process JSON results** to extract key metrics
3. **Create custom dashboard** or use visualization tools

The CI workflow automatically:
- Runs load tests nightly at 2 AM UTC
- Can be triggered manually via workflow_dispatch
- Stores comprehensive reports as artifacts (90-day retention)
- Generates summary in GitHub Actions UI

## Panels

### 1. Response Time Trends (p95 & p99)
- **Type**: Time series
- **Metrics**: 
  - p95 response times by scenario
  - p99 response times by scenario
- **Thresholds**: Yellow at 100ms, Red at 200ms

### 2. Error Rate by Scenario
- **Type**: Time series
- **Metrics**: Error rate percentage by scenario
- **Thresholds**: Yellow at 2%, Red at 5%
- **Max**: 10%

### 3. Throughput (Requests/Second)
- **Type**: Time series (stacked)
- **Metrics**: Request rate by scenario
- **Unit**: requests per second

### 4. Virtual Users (VUs)
- **Type**: Time series
- **Metrics**: Number of virtual users by scenario

### 5. Overall Check Success Rate
- **Type**: Gauge
- **Metric**: Percentage of successful checks
- **Thresholds**: Red < 95%, Yellow 95-98%, Green > 98%

### 6. Overall p95 Response Time
- **Type**: Gauge
- **Metric**: 95th percentile response time across all scenarios
- **Thresholds**: Yellow at 100ms, Red at 200ms

### 7. Total Throughput
- **Type**: Gauge
- **Metric**: Total requests per second across all scenarios

### 8. Overall Error Rate
- **Type**: Gauge
- **Metric**: Overall error rate percentage
- **Thresholds**: Yellow at 1%, Red at 5%

### 9. Request Distribution by Scenario
- **Type**: Pie chart
- **Metrics**: Total requests by scenario

### 10. Checks Status (Last Hour)
- **Type**: Time series (bars, stacked)
- **Metrics**: Check results (pass/fail) over last hour

## Accessing the Dashboard

### In Grafana

1. Navigate to Grafana at `https://clpr.tv/grafana` (or your configured URL)
2. Go to **Dashboards** → **Browse**
3. Search for "K6 Load Test Trends"
4. Or access directly via UID: `k6-load-test-trends`

### CI/CD Reports

View load test reports from GitHub Actions:

1. Go to **Actions** tab in GitHub repository
2. Select **Load Tests** workflow
3. Click on a workflow run
4. Download artifacts:
   - `load-test-reports-*` - Markdown reports and text outputs
   - `load-test-metrics-*` - JSON metrics for analysis

## Interpreting Results

### Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| p95 Response Time | < 100ms | Monitor gauge |
| p99 Response Time | < 200ms | Check trends |
| Error Rate | < 1% | Critical threshold |
| Check Success Rate | > 98% | Quality indicator |

### What to Look For

**Good Performance**:
- ✅ p95 response times consistently below 100ms
- ✅ Error rates near 0%
- ✅ Check success rate > 98%
- ✅ Stable throughput under load

**Warning Signs**:
- ⚠️ p95 response times 100-200ms
- ⚠️ Error rates 1-5%
- ⚠️ Check success rate 95-98%
- ⚠️ Increasing response times over time

**Critical Issues**:
- 🚨 p95 response times > 200ms
- 🚨 Error rates > 5%
- 🚨 Check success rate < 95%
- 🚨 Throughput degradation

## Maintenance

### Updating the Dashboard

1. Export dashboard JSON from Grafana UI
2. Save to `monitoring/dashboards/load-test-trends.json`
3. Commit changes to version control

### Adding New Scenarios

When adding new K6 test scenarios:

1. Ensure scenarios are tagged appropriately in K6 scripts
2. Dashboard will automatically pick up new scenario names
3. Consider adding scenario-specific panels if needed

## Troubleshooting

### No Data Showing

- **Check Prometheus is scraping K6 metrics**: Verify Prometheus configuration
- **Verify K6 is exporting metrics**: Check K6 run command includes `--out` flag
- **Check time range**: Ensure dashboard time range covers test execution period

### Missing Scenarios

- **Verify scenario tags**: Check K6 scripts include proper scenario configuration
- **Check Prometheus labels**: Verify metrics include scenario labels
- **Refresh dashboard**: Force refresh in Grafana

## Related Documentation

- [Load Test README](../../backend/tests/load/README.md) - K6 test documentation
- [Load Test CI Workflow](../../.github/workflows/load-tests.yml) - CI configuration
- [Performance Summary](../../backend/tests/load/PERFORMANCE_SUMMARY.md) - Performance targets
- [Grafana Documentation](https://grafana.com/docs/) - Grafana user guide

## Future Enhancements

Potential improvements to consider:

1. **Automated Alerting**: Set up Grafana alerts for threshold violations
2. **Trend Analysis**: Add panels showing week-over-week comparisons
3. **Cost Analysis**: Track infrastructure costs during load tests
4. **Comparative Views**: Compare different test runs side-by-side
5. **Custom Metrics**: Add application-specific business metrics
