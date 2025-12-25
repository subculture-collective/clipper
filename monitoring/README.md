# Monitoring Stack

This directory contains configuration for the optional monitoring stack using Prometheus, Grafana, and various exporters.

## Components

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and management with SLO breach escalation
- **Node Exporter**: System metrics (CPU, memory, disk)
- **cAdvisor**: Container metrics
- **PostgreSQL Exporter**: Database metrics
- **Redis Exporter**: Cache metrics
- **Nginx Exporter**: Web server metrics
- **Loki**: Log aggregation
- **Promtail**: Log collection

## Service Level Objectives (SLOs)

Clipper has defined SLOs for reliability and performance. See [SLO Documentation](../docs/operations/slos.md) for details.

**Key SLOs:**
- **Availability:** 99.5% uptime (max 3.6 hours downtime/month)
- **Latency:** P95 < 100ms for list endpoints, P95 < 50ms for detail endpoints
- **Error Rate:** < 0.5% of requests
- **Search Performance:** P95 < 200ms for hybrid search
- **Webhook Delivery:** > 90% success rate

**SLO Dashboard:** Access the SLO compliance dashboard at `monitoring/dashboards/slo-dashboard.json`

**Alert Routing:** Critical SLO breaches trigger:
1. Immediate PagerDuty page to on-call engineer
2. Notification in Slack #incidents channel
3. Email to on-call rotation
4. Escalation to engineering leadership if not resolved within 30 minutes

See [Alertmanager Setup Guide](./ALERTMANAGER_SETUP.md) for configuration details.

## Quick Start

### 1. Set Up Environment Variables

```bash
# Create .env file with required variables
cp .env.example .env
nano .env

# Add:
GRAFANA_PASSWORD=your_secure_password
POSTGRES_USER=clipper
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=clipper
```

### 2. Start Monitoring Stack

```bash
# Start all monitoring services
docker-compose -f docker-compose.monitoring.yml up -d

# Check status
docker-compose -f docker-compose.monitoring.yml ps
```

### 3. Access Services

- **Grafana**: <http://localhost:3000> (admin / your_password)
- **Prometheus**: <http://localhost:9090>
- **Alertmanager**: <http://localhost:9093>
- **cAdvisor**: <http://localhost:8081>

### 4. Configure Grafana

1. Log in to Grafana (admin / your_password)
2. Data sources are automatically provisioned via `datasources/datasources.yml`
3. Dashboards are automatically provisioned from the `dashboards/` directory

**Available Dashboards:**
- **SLO Compliance Dashboard** ⭐ - Real-time SLO tracking, error budget, compliance status
- **Background Jobs Monitoring** ⭐ - Job execution status, duration, queue sizes, failure rates
- **System Health Dashboard** - CPU, memory, disk, network metrics
- **API Performance Dashboard** - Request rate, latency, throughput, errors
- **Database Dashboard** - Connections, query time, slow queries, cache hits
- **User Experience Dashboard** - Page load times, error rates, active users
- **Application Overview** - High-level SLO metrics and health
- **Search Quality Metrics** - Semantic search performance
- **Engagement Metrics** - User engagement and retention
- **Logging Dashboard** - Centralized logging and security events
- **Semantic Search Observability** - Search service monitoring
- **Webhook Monitoring** - Webhook delivery and health tracking

You can also import community dashboards:
- Go to Dashboards > Import
- Import ID: 1860 (Node Exporter Full)
- Import ID: 9628 (PostgreSQL)
- Import ID: 11835 (Redis)
- Import ID: 12708 (Docker Containers)

## Centralized Logging

The monitoring stack includes **Grafana Loki** for centralized log aggregation with structured JSON logging across all services.

### Features

- **90-day log retention** for compliance and debugging
- **Structured JSON logs** from backend, frontend, and mobile
- **PII redaction** for passwords, tokens, emails, and sensitive data
- **Log-based alerts** for security events and error spikes
- **Search and filtering** with LogQL in Grafana

### Quick Access

**Grafana Log Explorer**: <http://localhost:3000/explore>

Example queries:
```logql
# All error logs
{level="error"}

# Backend errors in the last hour
{service="clipper-backend", level="error"} [1h]

# Failed authentication attempts
{message=~".*authentication failed.*"}

# High latency requests
{service="clipper-backend"} | json | latency > 1s
```

### Documentation

See [Centralized Logging Documentation](../docs/operations/centralized-logging.md) for:
- Detailed logging guide
- Best practices
- Query examples
- Security considerations
- Troubleshooting

## Configuration Files

### prometheus.yml

Prometheus scrape configuration and targets.

### alerts.yml

Alert rules organized by priority and category:

**SLO Alerts (Critical Priority):**
- Availability SLO breach (< 99.5%)
- Error rate SLO breach (> 0.5%)
- Latency SLO breach (P95 > targets)
- Error budget fast burn (> 10% in 1 hour)
- Error budget medium burn (> 25% in 6 hours)

**Service Health Alerts:**
- Service down
- High error rate
- High response time
- Critical error rate

**Infrastructure Alerts:**
- High CPU/memory usage
- Low disk space (warning and critical)
- Database connection issues
- Redis memory and connectivity
- SSL certificate expiration

**Search Performance Alerts:**
- Semantic search high/critical latency
- Embedding generation failures
- Low embedding coverage
- Cache hit rate issues
- High zero result rate
- Search fallback activation
- Indexing job failures

**Webhook Alerts:**
- High/critical webhook failure rate
- Large retry queue
- Dead-letter queue items
- High delivery latency
- Subscription health degradation

**Background Job Alerts:**
- Job execution failures (>0.1/sec)
- Critical failure rate (>50%)
- Stale jobs (no success >2h or >24h)
- High/critical duration (P95 >300s or >600s)
- Queue growing or critical size
- High item processing failure rate (>20%)

**Security & Logging Alerts:**
- High error log rate
- Critical error spike
- Failed authentication spike
- SQL injection attempts
- Security events
- Application panics
- Database connection errors
- Redis connection errors

### loki-config.yml

Loki configuration with 90-day log retention:

- Retention period: 2160 hours (90 days)
- Automatic compaction every 10 minutes
- TSDB-based storage for better performance
- Query result caching for faster searches

### promtail-config.yml

Promtail configuration for log collection:

- Docker container logs with JSON parsing
- System journal logs
- Backend application logs
- Frontend application logs
- Automatic label extraction from structured logs

### alertmanager.yml

Alert routing and escalation configuration with severity-based routing:

**Routing Strategy:**
- **Critical (P1):** PagerDuty page + Slack #incidents + Email (15 min response time)
- **Warning (P2):** Slack #alerts + Email (1 hour response time)
- **Info (P3):** Slack #monitoring (4 hour response time)

**Special Routing:**
- **SLO Breaches:** Dedicated PagerDuty service + #incidents channel
- **Security Alerts:** Dedicated PagerDuty service + #security channel
- **Error Budget:** #incidents channel (informational)

**Escalation Policy:**
```
Level 1: On-call Engineer (0-15 min)
Level 2: On-call Lead (15-30 min)
Level 3: Engineering Manager (30-45 min)
Level 4: VP Engineering + CTO (1+ hour)
```

**Configuration Guide:** See [Alertmanager Setup Guide](./ALERTMANAGER_SETUP.md) for detailed setup instructions.

### promtail-config.yml

Log collection configuration (create this file):

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: varlogs
          __path__: /var/log/*log

  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containerlogs
          __path__: /var/lib/docker/containers/*/*log

    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - regex:
          expression: '^(?P<time>[^ ]+) (?P<stream>stdout|stderr) (?P<flags>[^ ]+) (?P<message>.+)$'
      - labels:
          stream:
      - timestamp:
          source: time
          format: RFC3339Nano
      - output:
          source: message
```

## Nginx Status Endpoint

For Nginx monitoring, enable the status endpoint:

```nginx
# Add to nginx configuration
server {
    listen 80;
    server_name localhost;

    location /nginx_status {
        stub_status on;
        access_log off;
        allow 127.0.0.1;
        allow 172.16.0.0/12;  # Docker network
        deny all;
    }
}
```

## Custom Metrics in Backend

To expose metrics from your Go backend, add Prometheus client:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// In your main.go or metrics.go
var (
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "endpoint", "status"},
    )

    httpRequestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "Duration of HTTP requests",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method", "endpoint"},
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(httpRequestDuration)
}

// Expose metrics endpoint
r.GET("/metrics", gin.WrapH(promhttp.Handler()))
```

## Alert Channels

Configure alert notifications:

### Email

Add to `alertmanager.yml`:

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'team@example.com'
```

### Slack

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts'
```

### Discord

```yaml
receivers:
  - name: 'discord'
    webhook_configs:
      - url: 'https://discord.com/api/webhooks/YOUR/WEBHOOK'
```

### PagerDuty

```yaml
receivers:
  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_SERVICE_KEY'
```

## Maintenance

### View Logs

```bash
docker-compose -f docker-compose.monitoring.yml logs -f prometheus
docker-compose -f docker-compose.monitoring.yml logs -f grafana
```

### Restart Services

```bash
docker-compose -f docker-compose.monitoring.yml restart prometheus
docker-compose -f docker-compose.monitoring.yml restart grafana
```

### Update Configuration

```bash
# Edit configuration files
nano monitoring/prometheus.yml

# Reload Prometheus (no restart needed)
curl -X POST http://localhost:9090/-/reload
```

### Backup Grafana Dashboards

```bash
# Export dashboard JSON from Grafana UI
# Or backup Grafana database
docker-compose -f docker-compose.monitoring.yml exec grafana \
  tar czf /var/lib/grafana/backup.tar.gz /var/lib/grafana/grafana.db
```

## Background Job Monitoring

Clipper uses background jobs (schedulers) for periodic maintenance tasks. All jobs are instrumented with Prometheus metrics for monitoring execution status, performance, and failures.

### Available Jobs

- **hot_score_refresh**: Updates hot scores for trending clips (every 5 minutes)
- **trending_score_refresh**: Recalculates trending scores (every 60 minutes)  
- **clip_sync**: Syncs clips from Twitch API (every 15 minutes)
- **reputation_tasks**: Awards badges and updates user stats (every 6 hours)
- **webhook_retry**: Retries failed webhook deliveries (every 1 minute)
- **embedding_generation**: Generates embeddings for new clips (configurable)

### Metrics

All jobs expose standardized metrics:

```
job_execution_total{job_name, status}           # Total executions (success/failed)
job_execution_duration_seconds{job_name}        # Duration histogram
job_last_success_timestamp_seconds{job_name}    # Last successful run timestamp
job_items_processed_total{job_name, status}     # Items processed (success/failed/skipped)
job_queue_size{job_name}                        # Current queue size (if applicable)
```

### Dashboard

Access the Background Jobs dashboard at:
- **Grafana**: `http://localhost:3000/d/background-jobs`
- **File**: `monitoring/dashboards/background-jobs.json`

Key panels include:
- Job execution status and success rates
- Queue sizes and growth trends
- Duration (P50/P95) by job
- Time since last successful run
- Items processed and failure rates

### Alerts

Background job alerts are configured in `monitoring/alerts.yml`:

- **BackgroundJobFailing**: Job has failures (>5% failure rate, 10m)
- **BackgroundJobCriticalFailureRate**: >50% failure rate
- **BackgroundJobNotRunning**: No success for >2 hours (Note: may not detect failures in jobs with intervals > 2h)
- **BackgroundJobCriticallyStale**: No success for >24 hours  
- **BackgroundJobHighDuration**: P95 duration >300 seconds
- **BackgroundJobCriticalDuration**: P95 duration >600 seconds
- **BackgroundJobQueueGrowing**: Queue growing >50% over 10m
- **BackgroundJobCriticalQueueSize**: Queue size >1000
- **BackgroundJobHighItemFailureRate**: >20% item failure rate

### Troubleshooting

See the comprehensive runbook at:
- [docs/operations/runbooks/background-jobs.md](../docs/operations/runbooks/background-jobs.md)

Common issues:
- **Job failing**: Check logs, verify database/Redis connectivity
- **Stale job**: Restart backend pods, check for stuck processes
- **High duration**: Optimize queries, add indexes, check external APIs
- **Queue growing**: Scale horizontally, increase parallelism

### Time to Detect

Target metrics for background job monitoring:
- **Detection**: < 5 minutes for failures
- **Alerting**: Low noise, actionable alerts only
- **Coverage**: All critical background jobs monitored

## Troubleshooting

### Prometheus not scraping targets

Check targets in Prometheus UI:

- Go to <http://localhost:9090/targets>
- Verify all targets are "UP"
- Check network connectivity between containers

### Grafana not showing data

1. Verify Prometheus data source configuration
2. Check time range in dashboard
3. Verify metrics exist: <http://localhost:9090/graph>

### High memory usage

Adjust retention time in `docker-compose.monitoring.yml`:

```yaml
command:
  - '--storage.tsdb.retention.time=15d'  # Reduce from 30d
```

## Production Considerations

1. **Security**:
   - Use strong passwords
   - Enable authentication on all services
   - Use HTTPS for Grafana
   - Restrict access with firewall rules

2. **Performance**:
   - Adjust scrape intervals based on needs
   - Use recording rules for complex queries
   - Configure appropriate retention periods

3. **High Availability**:
   - Run multiple Prometheus instances
   - Use Thanos for long-term storage
   - Configure Alertmanager clustering

4. **Backup**:
   - Backup Prometheus data directory
   - Export Grafana dashboards
   - Version control configurations

## Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Loki Documentation](https://grafana.com/docs/loki/latest/)
