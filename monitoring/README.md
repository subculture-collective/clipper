# Monitoring Stack

This directory contains configuration for the optional monitoring stack using Prometheus, Grafana, and various exporters.

## Components

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and management
- **Node Exporter**: System metrics (CPU, memory, disk)
- **cAdvisor**: Container metrics
- **PostgreSQL Exporter**: Database metrics
- **Redis Exporter**: Cache metrics
- **Nginx Exporter**: Web server metrics
- **Loki**: Log aggregation
- **Promtail**: Log collection

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

- **Grafana**: http://localhost:3000 (admin / your_password)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **cAdvisor**: http://localhost:8081

### 4. Configure Grafana

1. Log in to Grafana (admin / your_password)
2. Go to Configuration > Data Sources
3. Add Prometheus:
   - URL: http://prometheus:9090
   - Click "Save & Test"
4. Add Loki:
   - URL: http://loki:3100
   - Click "Save & Test"
5. Import dashboards:
   - Go to Dashboards > Import
   - Import ID: 1860 (Node Exporter Full)
   - Import ID: 9628 (PostgreSQL)
   - Import ID: 11835 (Redis)
   - Import ID: 12708 (Docker Containers)

## Configuration Files

### prometheus.yml
Prometheus scrape configuration and targets.

### alerts.yml
Alert rules for various conditions:
- Service down
- High error rate
- High response time
- High CPU/memory usage
- Low disk space
- Database issues
- Redis issues
- SSL certificate expiring

### alertmanager.yml
Alert routing configuration (create this file):

```yaml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'

receivers:
  - name: 'default'
    email_configs:
      - to: 'alerts@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@example.com'
        auth_password: 'your_password'
```

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

## Troubleshooting

### Prometheus not scraping targets

Check targets in Prometheus UI:
- Go to http://localhost:9090/targets
- Verify all targets are "UP"
- Check network connectivity between containers

### Grafana not showing data

1. Verify Prometheus data source configuration
2. Check time range in dashboard
3. Verify metrics exist: http://localhost:9090/graph

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
