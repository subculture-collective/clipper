# Monitoring Tools

This directory contains tools for synthetic signal generation and alert testing.

## Overview

The synthetic signal generator creates artificial metrics to test monitoring alerts and dashboards. It simulates production conditions without affecting real services.

## Tools

### synthetic-signal-generator.sh

Generates synthetic metrics to trigger monitoring alerts for validation.

**Usage:**
```bash
./synthetic-signal-generator.sh <signal-type> [duration] [threshold]
```

**Signal Types:**

| Signal Type | Description | Default Threshold | Default Duration |
|------------|-------------|-------------------|------------------|
| `latency` | High latency (ms) | 150ms | 60s |
| `error-rate` | Error rate (0.0-1.0) | 0.01 (1%) | 60s |
| `queue-depth` | Queue size (items) | 500 | 60s |
| `webhook-failure` | Webhook failure rate (0.0-1.0) | 0.15 (15%) | 60s |
| `search-failover` | Search failovers/min | 10/min | 60s |
| `cdn-failover` | CDN failovers/sec | 10/sec | 60s |
| `all` | All signals simultaneously | Various | 30s each |
| `recovery <type>` | Send recovery signal | Normal values | Immediate |

**Environment Variables:**
- `PROMETHEUS_PUSHGATEWAY` - Pushgateway URL (default: http://localhost:9091)
- `PROMETHEUS_URL` - Prometheus URL (default: http://localhost:9090)
- `ALERTMANAGER_URL` - Alertmanager URL (default: http://localhost:9093)

## Examples

### Basic Usage

```bash
# Generate high latency (150ms for 60 seconds)
./synthetic-signal-generator.sh latency 60 150

# Generate error rate (2% for 120 seconds)
./synthetic-signal-generator.sh error-rate 120 0.02

# Generate webhook failures (20% for 60 seconds)
./synthetic-signal-generator.sh webhook-failure 60 0.20

# Generate large queue (1000 items for 90 seconds)
./synthetic-signal-generator.sh queue-depth 90 1000
```

### Advanced Usage

```bash
# Generate all signals simultaneously (30 seconds each)
./synthetic-signal-generator.sh all

# Custom Pushgateway URL
PROMETHEUS_PUSHGATEWAY=http://pushgateway.example.com:9091 \
  ./synthetic-signal-generator.sh latency 60 200

# Generate signal and monitor in real-time
./synthetic-signal-generator.sh latency 120 150 &
watch -n 5 'curl -s http://localhost:9090/api/v1/alerts | jq ".data.alerts[]"'
```

### Recovery Signals

After testing, send recovery signals to clear alerts:

```bash
# Clear all alerts
./synthetic-signal-generator.sh recovery all

# Clear specific alert
./synthetic-signal-generator.sh recovery latency
./synthetic-signal-generator.sh recovery webhook-failure
```

## How It Works

### Metric Generation

The tool pushes metrics to Prometheus Pushgateway using the Prometheus text exposition format:

1. **Creates Metrics**: Generates histogram or counter metrics
2. **Pushes to Gateway**: Uses HTTP POST to Pushgateway
3. **Prometheus Scrapes**: Prometheus scrapes metrics from Pushgateway
4. **Alerts Evaluate**: Alert rules evaluate against metrics
5. **Alerts Fire**: When thresholds exceeded, alerts fire

### Metric Format

Example latency metric:
```
# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.005"} 0
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="0.01"} 0
...
http_request_duration_seconds_bucket{path="/api/v1/clips",method="GET",le="+Inf"} 100
http_request_duration_seconds_sum{path="/api/v1/clips",method="GET"} 15.0
http_request_duration_seconds_count{path="/api/v1/clips",method="GET"} 100
```

### Signal Types Explained

#### Latency Signal

Simulates slow API responses:
- Metric: `http_request_duration_seconds`
- Type: Histogram
- Alert: `SLOLatencyBreach` (P95 > 100ms)
- Use case: Test latency monitoring

Example:
```bash
# Generate 200ms P95 latency
./synthetic-signal-generator.sh latency 60 200
```

#### Error Rate Signal

Simulates high error responses:
- Metric: `http_requests_total{status="5xx"}`
- Type: Counter
- Alert: `SLOErrorRateBreach` (error rate > 0.5%)
- Use case: Test error monitoring

Example:
```bash
# Generate 2% error rate
./synthetic-signal-generator.sh error-rate 60 0.02
```

#### Queue Depth Signal

Simulates large background job queue:
- Metric: `webhook_retry_queue_size`
- Type: Gauge
- Alert: `LargeWebhookRetryQueue` (queue > 100)
- Use case: Test queue monitoring

Example:
```bash
# Generate queue with 500 items
./synthetic-signal-generator.sh queue-depth 60 500
```

#### Webhook Failure Signal

Simulates webhook delivery failures:
- Metric: `webhook_delivery_total{status="failed"}`
- Type: Counter
- Alert: `HighWebhookFailureRate` (failures > 10%)
- Use case: Test webhook monitoring

Example:
```bash
# Generate 15% failure rate
./synthetic-signal-generator.sh webhook-failure 60 0.15
```

#### Search Failover Signal

Simulates search service failover:
- Metric: `search_failover_total`
- Type: Counter
- Alert: `SearchFailoverRateHigh` (failovers > 5/min)
- Use case: Test search monitoring

Example:
```bash
# Generate 10 failovers/min
./synthetic-signal-generator.sh search-failover 60 10
```

#### CDN Failover Signal

Simulates CDN failover to origin:
- Metric: `cdn_failover_total`
- Type: Counter
- Alert: `CDNFailoverRateHigh` (failovers > 5/sec)
- Use case: Test CDN monitoring

Example:
```bash
# Generate 10 failovers/sec
./synthetic-signal-generator.sh cdn-failover 60 10
```

## Prerequisites

### Required Services

1. **Prometheus Pushgateway**
   ```bash
   docker run -d -p 9091:9091 prom/pushgateway
   ```

2. **Prometheus** (configured to scrape Pushgateway)
   ```yaml
   # prometheus.yml
   scrape_configs:
     - job_name: 'pushgateway'
       static_configs:
         - targets: ['pushgateway:9091']
   ```

3. **Alertmanager** (optional, for testing alert routing)
   ```bash
   docker run -d -p 9093:9093 prom/alertmanager
   ```

### Required Tools

- `curl` - For HTTP requests
- `jq` - For JSON processing
- `bc` - For calculations
- `bash` - Version 4.0+

Install on Ubuntu/Debian:
```bash
sudo apt-get update
sudo apt-get install -y curl jq bc
```

## Testing Workflow

### 1. Start Monitoring Stack

```bash
cd ../
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Generate Signal

```bash
cd tools
./synthetic-signal-generator.sh latency 120 150
```

### 3. Monitor Alert

```bash
# Watch Prometheus alerts
watch -n 5 'curl -s http://localhost:9090/api/v1/alerts | jq ".data.alerts[]"'

# Or check specific alert
curl -s http://localhost:9090/api/v1/alerts | \
  jq '.data.alerts[] | select(.labels.alertname=="SLOLatencyBreach")'
```

### 4. Verify Alert Fired

- Check Prometheus UI: http://localhost:9090/alerts
- Check Alertmanager UI: http://localhost:9093
- Check alert labels and annotations

### 5. Send Recovery Signal

```bash
./synthetic-signal-generator.sh recovery latency
```

### 6. Verify Alert Cleared

Wait 5-10 minutes for alert to resolve.

## Troubleshooting

### Metrics Not Appearing

**Check Pushgateway:**
```bash
# View all metrics in Pushgateway
curl http://localhost:9091/metrics

# Check for specific metric
curl http://localhost:9091/metrics | grep http_request_duration_seconds
```

**Check Prometheus Scraping:**
```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Query metric directly
curl -s 'http://localhost:9090/api/v1/query?query=http_request_duration_seconds_count' | jq
```

### Alerts Not Firing

**Common Causes:**
1. Pushgateway not scraped by Prometheus
2. Alert rule syntax error
3. `for` duration not elapsed
4. Metric labels don't match alert selectors

**Debugging:**
```bash
# Check Prometheus config
curl http://localhost:9090/api/v1/status/config

# Check alert rules
curl http://localhost:9090/api/v1/rules

# View Prometheus logs
docker logs prometheus
```

### Clear All Metrics

```bash
# Wipe all metrics from Pushgateway
curl -X PUT http://localhost:9091/api/v1/admin/wipe

# Or delete specific job metrics
curl -X DELETE http://localhost:9091/metrics/job/clipper-backend/instance/test
```

## Best Practices

1. **Use Test Labels**: Tag synthetic metrics with `instance=test`
2. **Clean Up**: Always send recovery signals after testing
3. **Avoid Production**: Never run synthetic signals in production
4. **Monitor Impact**: Check Pushgateway memory usage with many signals
5. **Document Thresholds**: Keep alert validation report updated

## Integration with Tests

The synthetic signal generator is used by:
- `../tests/alert-validation-test.sh` - Alert validation suite
- `../tests/dashboard-validation-test.sh` - Dashboard validation
- `.github/workflows/alert-validation.yml` - CI workflow

Example from alert validation test:
```bash
# Generate signal
bash "$generator" latency 60 150 > /dev/null 2>&1 &
generator_pid=$!

# Wait for alert
sleep 120

# Check alert fired
check_alert_firing "SLOLatencyBreach"

# Send recovery
kill $generator_pid
bash "$generator" recovery latency
```

## Related Documentation

- [Test Suite README](../tests/README.md)
- [Alert Validation Runbook](../../docs/operations/runbooks/alert-validation.md)
- [Monitoring README](../README.md)
- [Prometheus Pushgateway Docs](https://github.com/prometheus/pushgateway)

## Changelog

- **2026-01-29**: Initial synthetic signal generator created
  - Support for 6 signal types
  - Recovery signal generation
  - Comprehensive documentation
