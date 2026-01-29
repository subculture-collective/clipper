# Monitoring Test Suite

This directory contains validation tests for monitoring alerts and dashboards.

## Overview

The test suite validates that:
- Alerts fire correctly when thresholds are exceeded
- Alerts contain proper labels (service, severity, runbook link)
- Alerts clear on recovery
- Dashboard panels display accurate metrics
- No excessive alert flapping occurs

## Test Scripts

### alert-validation-test.sh

Comprehensive test suite for alert rule validation.

**Usage:**
```bash
./alert-validation-test.sh [test-type]
```

**Test Types:**
- `latency-alert` - Test latency alert (SLOLatencyBreach)
- `error-rate-alert` - Test error rate alert (SLOErrorRateBreach)
- `webhook-alert` - Test webhook failure alert (HighWebhookFailureRate)
- `search-failover-alert` - Test search failover alert (SearchFailoverRateHigh)
- `cdn-failover-alert` - Test CDN failover alert (CDNFailoverRateHigh)
- `queue-alert` - Test queue depth alert (LargeWebhookRetryQueue)
- `all` - Run all tests (default)

**Environment Variables:**
- `PROMETHEUS_URL` - Prometheus URL (default: http://localhost:9090)
- `ALERTMANAGER_URL` - Alertmanager URL (default: http://localhost:9093)
- `PROMETHEUS_PUSHGATEWAY` - Pushgateway URL (default: http://localhost:9091)
- `ALERT_WAIT_TIME` - Time to wait for alert to fire (default: 120s)
- `RECOVERY_WAIT_TIME` - Time to wait for alert to clear (default: 120s)
- `FLAP_TOLERANCE` - Max state changes allowed (default: 2)

**Example:**
```bash
# Run all alert validation tests
./alert-validation-test.sh all

# Test specific alert with custom wait time
ALERT_WAIT_TIME=90 ./alert-validation-test.sh latency-alert
```

**Expected Duration:** ~30 minutes for all tests

### dashboard-validation-test.sh

Validates that dashboard panels display accurate metrics.

**Usage:**
```bash
./dashboard-validation-test.sh [dashboard-type]
```

**Dashboard Types:**
- `slo` - Validate SLO dashboard panels
- `webhooks` - Validate webhook monitoring dashboard
- `background-jobs` - Validate background jobs dashboard
- `search` - Validate search performance dashboard
- `cdn` - Validate CDN failover dashboard
- `all` - Validate all dashboards (default)

**Environment Variables:**
- `PROMETHEUS_URL` - Prometheus URL (default: http://localhost:9090)
- `GRAFANA_URL` - Grafana URL (default: http://localhost:3000)
- `PROMETHEUS_PUSHGATEWAY` - Pushgateway URL (default: http://localhost:9091)
- `METRIC_TOLERANCE` - Tolerance for metric comparison (default: 0.05)

**Example:**
```bash
# Validate all dashboards
./dashboard-validation-test.sh all

# Validate specific dashboard with tighter tolerance
METRIC_TOLERANCE=0.02 ./dashboard-validation-test.sh slo
```

**Expected Duration:** ~15 minutes for all dashboards

## Test Workflow

### 1. Prerequisites

Ensure monitoring stack is running:

```bash
cd ../
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services
docker-compose -f docker-compose.monitoring.yml ps
```

Required services:
- Prometheus (port 9090)
- Alertmanager (port 9093)
- Pushgateway (port 9091)
- Grafana (port 3000) - optional, for dashboard validation

### 2. Run Validation Tests

```bash
# Run all alert validation tests
./alert-validation-test.sh all

# Run dashboard validation
./dashboard-validation-test.sh all
```

### 3. Review Results

Test results show:
- ✓ Pass - Test succeeded
- ✗ Fail - Test failed
- Summary with pass/fail counts

Example output:
```
================================
Test #1: Latency Alert Validation
================================
[INFO] Generating high latency signal (150ms for 60s)...
[INFO] Waiting 120s for alert to fire...
[SUCCESS] ✓ Alert 'SLOLatencyBreach' is firing
[SUCCESS] ✓ Label 'severity' is correct: warning
[SUCCESS] ✓ Runbook link present: docs/operations/...
[SUCCESS] ✓ Test passed: Latency alert fired
...
================================================
Test Summary
================================================
Total Tests:  6
Passed:       6
Failed:       0
================================================
[SUCCESS] All tests passed!
```

### 4. Clean Up

After testing, send recovery signals to clear alerts:

```bash
cd ../tools
./synthetic-signal-generator.sh recovery all
```

## What Each Test Validates

### Alert Validation Tests

For each alert type, the test:

1. **Generates Synthetic Signal**
   - Uses synthetic-signal-generator.sh to push metrics
   - Simulates real production conditions

2. **Waits for Alert to Fire**
   - Waits for configured duration (default: 120s)
   - Accounts for `for` clause in alert rules

3. **Validates Alert Fired**
   - Checks alert is present in Prometheus
   - Verifies alert state is "firing"

4. **Validates Alert Labels**
   - Checks required labels (severity, service/job)
   - Verifies runbook annotation is present
   - Ensures labels match expected values

5. **Sends Recovery Signal**
   - Stops synthetic signal generator
   - Sends normal metrics to clear alert

6. **Validates Alert Cleared**
   - Waits for recovery duration (default: 120s)
   - Checks alert is no longer active
   - Verifies clean recovery (no flapping)

### Dashboard Validation Tests

For each dashboard, the test:

1. **Generates Known Metric Values**
   - Uses synthetic signals with precise values
   - Example: 150ms latency, 15% error rate

2. **Waits for Metric Scrape**
   - Allows time for Prometheus to scrape metrics
   - Typical wait: 30-60 seconds

3. **Queries Prometheus Directly**
   - Executes dashboard queries via API
   - Retrieves actual metric values

4. **Compares Expected vs. Actual**
   - Calculates difference percentage
   - Validates within tolerance (default: 5%)

5. **Reports Results**
   - Shows expected vs. actual values
   - Indicates pass/fail based on tolerance

## Troubleshooting

### Tests Failing

**Alert Not Firing:**
- Check Prometheus is scraping Pushgateway
- Verify metrics exist: `curl http://localhost:9091/metrics`
- Ensure alert `for` duration has elapsed
- Check Prometheus logs for errors

**Alert Not Clearing:**
- Wait for full `for` duration + scrape interval
- Verify recovery signal was sent
- Check metrics in Pushgateway are normal
- Clear Pushgateway and resend recovery signal

**Dashboard Metrics Don't Match:**
- Check Prometheus query syntax
- Verify time range alignment
- Ensure Grafana is not caching results
- Compare Grafana query to Prometheus API query

### Common Issues

**Services Not Running:**
```bash
# Start monitoring stack
cd ../
docker-compose -f docker-compose.monitoring.yml up -d
```

**Stale Metrics from Previous Tests:**
```bash
# Clear all Pushgateway metrics
curl -X PUT http://localhost:9091/api/v1/admin/wipe

# Send recovery signals
cd ../tools
./synthetic-signal-generator.sh recovery all
```

**Tests Timing Out:**
```bash
# Increase wait times
export ALERT_WAIT_TIME=180
export RECOVERY_WAIT_TIME=180
./alert-validation-test.sh all
```

## CI Integration

Tests run automatically via GitHub Actions:

**Workflow:** `.github/workflows/alert-validation.yml`

**Triggers:**
- Daily at 02:00 UTC (cron schedule)
- On changes to monitoring configuration
- Manual workflow dispatch

**Artifacts:**
- Test results uploaded as workflow artifacts
- Validation report generated
- Available for 30 days

**View Results:**
1. Go to GitHub Actions tab
2. Select "Alert Validation" workflow
3. Download artifact: `alert-validation-report-*`

## Best Practices

1. **Run Tests in Staging**: Never test in production
2. **Clean Up After Testing**: Always send recovery signals
3. **Review Test Results**: Check for patterns in failures
4. **Update Thresholds**: Adjust based on test results
5. **Document Changes**: Update alert validation report
6. **Regular Testing**: Run tests before releases

## Related Documentation

- [Alert Validation Runbook](../../docs/operations/runbooks/alert-validation.md)
- [Alert Validation Report](../docs/ALERT_VALIDATION_REPORT.md)
- [Synthetic Signal Generator](../tools/README.md)
- [Monitoring README](../README.md)

## Changelog

- **2026-01-29**: Initial test suite created
  - Alert validation tests for 6 alert types
  - Dashboard validation tests
  - Comprehensive test coverage documentation
