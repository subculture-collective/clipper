# Observability Configuration Guide

This document describes the observability stack for Clipper, including logging, monitoring, tracing, and error tracking.

## Overview

Clipper uses a comprehensive observability stack:

- **Structured Logging**: JSON-formatted logs for easy parsing
- **Metrics**: Prometheus for metrics collection
- **Tracing**: OpenTelemetry for distributed tracing
- **Error Tracking**: Sentry for error aggregation
- **Dashboards**: Grafana for visualization
- **Alerting**: Prometheus Alertmanager for notifications

## Architecture

```
┌─────────────┐
│   Backend   │
│ Application │
└──────┬──────┘
       │
       ├─────────────┐
       │             │
       ▼             ▼
┌──────────┐   ┌──────────┐
│  Sentry  │   │   OTEL   │
│  (Errors)│   │ Collector│
└──────────┘   └─────┬────┘
                     │
                     ▼
              ┌─────────────┐
              │ Prometheus  │
              │  (Metrics)  │
              └──────┬──────┘
                     │
                     ▼
              ┌─────────────┐
              │   Grafana   │
              │ (Dashboards)│
              └─────────────┘
```

## Structured Logging

### Configuration

The application uses structured JSON logging for all output:

```go
// Initialize logger in main.go
utils.InitLogger(utils.LogLevelInfo)
logger := utils.GetLogger()

// Use in code
logger.Info("Server started", map[string]interface{}{
    "port": cfg.Server.Port,
    "mode": cfg.Server.GinMode,
})
```

### Log Format

All logs are JSON-formatted with standard fields:

```json
{
  "timestamp": "2024-01-15T10:30:45Z",
  "level": "info",
  "message": "HTTP Request",
  "service": "clipper-backend",
  "trace_id": "abc123...",
  "user_id": "user-456",
  "method": "GET",
  "path": "/api/v1/clips",
  "status_code": 200,
  "latency": "45ms",
  "client_ip": "192.168.1.1"
}
```

### Log Levels

- `debug`: Detailed information for diagnosing problems
- `info`: General informational messages
- `warn`: Warning messages for potentially harmful situations
- `error`: Error messages for failure conditions

### Environment Variables

```bash
# Set log level (debug, info, warn, error)
LOG_LEVEL=info

# Enable JSON formatting (always enabled in production)
LOG_FORMAT=json
```

## Sentry Error Tracking

### Setup

1. **Create Sentry Project**:
   - Go to [sentry.io](https://sentry.io)
   - Create a new project for "Go"
   - Copy the DSN (Data Source Name)

2. **Configure Environment**:

   ```bash
   # Add to .env
   SENTRY_DSN=https://[key]@[org].ingest.sentry.io/[project]
   SENTRY_ENVIRONMENT=production
   SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% of transactions
   ```

3. **Integration**:
   The application automatically sends errors to Sentry when configured.

### Features

- Automatic error capture
- Stack traces with source code context
- Release tracking
- Performance monitoring
- User context (when authenticated)
- Breadcrumbs for debugging

### Example Error

```go
// Errors are automatically captured
if err := someOperation(); err != nil {
    logger.Error("Operation failed", err, map[string]interface{}{
        "user_id": userID,
        "operation": "fetch_clips",
    })
    // This will be sent to Sentry
}
```

## OpenTelemetry Tracing

### Setup

1. **Install OpenTelemetry Collector**:

   ```bash
   docker run -d --name otel-collector \
     -p 4317:4317 -p 4318:4318 \
     otel/opentelemetry-collector-contrib:latest
   ```

2. **Configure Environment**:

   ```bash
   # Add to .env
   OTEL_ENABLED=true
   OTEL_SERVICE_NAME=clipper-backend
   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
   OTEL_TRACES_SAMPLER=parentbased_traceidratio
   OTEL_TRACES_SAMPLER_ARG=0.1  # 10% sampling
   ```

3. **Configure Collector**:
   Create `/opt/clipper/otel-collector-config.yaml`:

   ```yaml
   receivers:
     otlp:
       protocols:
         grpc:
           endpoint: 0.0.0.0:4317
         http:
           endpoint: 0.0.0.0:4318

   processors:
     batch:
       timeout: 10s
       send_batch_size: 1024

   exporters:
     prometheus:
       endpoint: "0.0.0.0:8889"
     jaeger:
       endpoint: jaeger:14250
       tls:
         insecure: true

   service:
     pipelines:
       traces:
         receivers: [otlp]
         processors: [batch]
         exporters: [jaeger]
       metrics:
         receivers: [otlp]
         processors: [batch]
         exporters: [prometheus]
   ```

### Distributed Tracing

Traces are automatically created for:

- HTTP requests
- Database queries
- Redis operations
- External API calls

### Trace Context

Traces include:

- Trace ID (unique per request)
- Span ID (unique per operation)
- Parent span (for nested operations)
- Timing information
- Custom attributes

## Prometheus Metrics

### Exposed Metrics

The backend exposes metrics at `/metrics`:

```
# HTTP metrics
http_requests_total{method="GET",path="/api/v1/clips",status="200"} 1234
http_request_duration_seconds{method="GET",path="/api/v1/clips",quantile="0.95"} 0.045

# Database metrics
db_connections_active 15
db_connections_idle 5
db_query_duration_seconds{operation="select",quantile="0.95"} 0.002

# Redis metrics
redis_commands_total{command="GET"} 5678
redis_command_duration_seconds{command="GET",quantile="0.95"} 0.001

# Business metrics
clips_total 10000
users_active_daily 250
votes_cast_total 50000
```

### Configuration

Update `monitoring/prometheus.yml` to scrape your backend:

```yaml
scrape_configs:
  - job_name: 'clipper-backend'
    static_configs:
      - targets: ['backend:8080']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## Grafana Dashboards

### Setup

1. **Access Grafana**:

   ```bash
   # Start monitoring stack
   docker-compose -f monitoring/docker-compose.monitoring.yml up -d
   
   # Access at http://localhost:3000
   # Default credentials: admin / admin
   ```

2. **Add Prometheus Data Source**:
   - Go to Configuration > Data Sources
   - Add Prometheus
   - URL: `http://prometheus:9090`
   - Save & Test

3. **Import Dashboards**:
   - Download from `monitoring/dashboards/`
   - Import via Grafana UI

### Available Dashboards

1. **Application Overview** (`monitoring/dashboards/app-overview.json`)
   - Request rate
   - Error rate
   - Response time (P50, P95, P99)
   - Active users

2. **Database Performance** (`monitoring/dashboards/database.json`)
   - Connection pool status
   - Query performance
   - Slow queries
   - Table sizes

3. **Redis Performance** (`monitoring/dashboards/redis.json`)
   - Cache hit rate
   - Memory usage
   - Command latency
   - Eviction rate

4. **System Resources** (`monitoring/dashboards/system.json`)
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network traffic

## Alerting

### Alertmanager Configuration

Update `monitoring/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

route:
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty'
    - match:
        severity: warning
      receiver: 'slack'

receivers:
  - name: 'default'
    email_configs:
      - to: 'team@example.com'
  
  - name: 'slack'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
  
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
```

### Alert Rules

See `monitoring/alerts.yml` for all alert rules.

Key alerts:

- **ServiceDown**: Service is unavailable
- **HighErrorRate**: Error rate > 5%
- **HighResponseTime**: P95 latency > 500ms
- **DatabaseDown**: Database is unavailable
- **RedisDown**: Redis is unavailable
- **LowDiskSpace**: Disk usage > 80%

## Log Aggregation

### Using ELK Stack (Optional)

1. **Setup Filebeat**:

   ```yaml
   # filebeat.yml
   filebeat.inputs:
     - type: container
       paths:
         - '/var/lib/docker/containers/*/*.log'
       json.keys_under_root: true
       json.add_error_key: true

   output.elasticsearch:
     hosts: ['elasticsearch:9200']
   ```

2. **Query Logs in Kibana**:
   - Access Kibana at <http://localhost:5601>
   - Create index pattern: `filebeat-*`
   - Query logs with KQL

### Using Loki (Recommended)

1. **Setup Loki**:

   ```bash
   docker run -d --name loki \
     -p 3100:3100 \
     grafana/loki:latest
   ```

2. **Add Loki Data Source to Grafana**:
   - URL: `http://loki:3100`
   - Save & Test

3. **Query Logs**:

   ```logql
   {service="clipper-backend"} |= "error"
   {service="clipper-backend", level="error"} | json
   ```

## Best Practices

### 1. Correlation IDs

Always include trace IDs to correlate logs, traces, and errors:

```go
// Set trace ID in context
traceID := uuid.New().String()
c.Set("trace_id", traceID)

// Log with trace ID
logger.Info("Processing request", map[string]interface{}{
    "trace_id": traceID,
})
```

### 2. Structured Context

Include relevant context in all logs:

```go
logger.Info("User authenticated", map[string]interface{}{
    "user_id": user.ID,
    "username": user.Username,
    "method": "twitch_oauth",
    "ip_address": c.ClientIP(),
})
```

### 3. Error Context

Capture comprehensive error context:

```go
if err != nil {
    logger.Error("Database query failed", err, map[string]interface{}{
        "query": "SELECT * FROM clips WHERE id = $1",
        "params": []interface{}{clipID},
        "duration": elapsed,
    })
}
```

### 4. Performance Tracking

Track performance of critical operations:

```go
start := time.Now()
result, err := expensiveOperation()
duration := time.Since(start)

logger.Info("Operation completed", map[string]interface{}{
    "operation": "fetch_clips",
    "duration_ms": duration.Milliseconds(),
    "result_count": len(result),
})
```

### 5. Privacy

Never log sensitive data:

```go
// Bad
logger.Info("User logged in", map[string]interface{}{
    "password": password,  // NEVER!
    "token": token,        // NEVER!
})

// Good
logger.Info("User logged in", map[string]interface{}{
    "user_id": user.ID,
    "method": "password",
})
```

## Troubleshooting

### Logs Not Appearing

1. Check log level configuration
2. Verify output is not redirected
3. Check disk space
4. Verify permissions

### Metrics Not Updating

1. Check Prometheus scrape configuration
2. Verify endpoint is accessible
3. Check firewall rules
4. Review Prometheus logs

### Traces Not Visible

1. Verify OTEL collector is running
2. Check sampling configuration
3. Verify endpoint connectivity
4. Review collector logs

### Alerts Not Firing

1. Check alert rule syntax
2. Verify Alertmanager configuration
3. Check notification channel settings
4. Review Alertmanager logs

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Sentry Documentation](https://docs.sentry.io/)
- [Structured Logging Best Practices](https://www.loggly.com/blog/structured-logging-best-practices/)
