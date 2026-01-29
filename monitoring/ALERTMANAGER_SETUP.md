# Alertmanager Configuration Guide

This guide explains how to configure alert routing and escalation in Alertmanager for the Clipper monitoring stack.

**Related Issues (Roadmap 5.0 - Phase 5.3):**
- [#860 - Alerting Configuration](https://github.com/subculture-collective/clipper/issues/860)
- [#858 - Grafana Dashboards](https://github.com/subculture-collective/clipper/issues/858)
- [#805 - Observability Infrastructure](https://github.com/subculture-collective/clipper/issues/805)

## Overview

Alertmanager handles alerts sent by Prometheus and routes them to the appropriate notification channels (PagerDuty, Slack, email, etc.) based on severity and type.

## Configuration File

The main configuration file is `monitoring/alertmanager.yml`.

## Alert Routing Strategy

### Severity-Based Routing

| Severity | Response Time | Notification Channels | Escalation |
|----------|--------------|----------------------|------------|
| **Critical (P1)** | < 15 min | PagerDuty (page) + Slack #incidents + Email | Yes, after 15 min |
| **Warning (P2)** | < 1 hour | Slack #alerts + Email | Yes, after 1 hour |
| **Info (P3)** | < 4 hours | Slack #monitoring | No |

### Special Alert Types

**SLO Breach Alerts:**
- Routed to dedicated PagerDuty service
- Posted in #incidents Slack channel
- Includes link to SLO breach response playbook

**Security Alerts:**
- Routed to dedicated PagerDuty security service
- Posted in #security Slack channel
- Immediate escalation

**Error Budget Alerts:**
- Posted in #incidents Slack channel
- No immediate page (informational)
- Triggers engineering review

## Setting Up Notification Channels

### 1. PagerDuty Setup

**Create Service Integration:**

1. Go to PagerDuty → Services → Add New Service
2. Create three services:
   - "Clipper Critical Alerts" (for general critical alerts)
   - "Clipper SLO Breaches" (for SLO-specific alerts)
   - "Clipper Security" (for security alerts)

3. For each service:
   - Integration Type: Events API v2 (recommended) or Prometheus (Events API v1)
   - Copy the Integration Key (called `routing_key` in v2, `service_key` in v1)

**Note:** This configuration uses Events API v2 with `routing_key`. If using v1, replace `routing_key_file` with `service_key_file` in the configuration.

4. Create secret files for each PagerDuty integration key:

   **Docker Swarm:**
   ```bash
   echo "your-pagerduty-routing-key" | docker secret create pagerduty_key_critical -
   echo "your-slo-routing-key" | docker secret create pagerduty_key_slo -
   echo "your-security-routing-key" | docker secret create pagerduty_key_security -
   ```

   **Kubernetes:**
   ```bash
   kubectl create secret generic alertmanager-pagerduty \
     --from-literal=pagerduty_key_critical="your-critical-key" \
     --from-literal=pagerduty_key_slo="your-slo-key" \
     --from-literal=pagerduty_key_security="your-security-key"
   
   # Mount in alertmanager deployment
   volumes:
     - name: pagerduty-secrets
       secret:
         secretName: alertmanager-pagerduty
   volumeMounts:
     - name: pagerduty-secrets
       mountPath: /run/secrets
       readOnly: true
   ```

   **Docker Compose:**
   ```bash
   mkdir -p secrets
   echo "your-pagerduty-routing-key" > secrets/pagerduty_key_critical
   echo "your-slo-routing-key" > secrets/pagerduty_key_slo
   echo "your-security-routing-key" > secrets/pagerduty_key_security
   chmod 400 secrets/*
   
   # Add to docker-compose.yml
   services:
     alertmanager:
       volumes:
         - ./secrets:/run/secrets:ro
   ```

5. Update `alertmanager.yml` to use Events API v2:
   ```yaml
   - name: 'pagerduty-critical'
     pagerduty_configs:
       - routing_key_file: '/run/secrets/pagerduty_key_critical'  # v2
         # For v1, use: service_key_file: '/run/secrets/pagerduty_key_critical'
   ```

**Configure Escalation Policy:**

1. Go to PagerDuty → Escalation Policies → New Policy
2. Configure levels:
   ```
   Level 1: On-call Engineer (immediate)
   Level 2: On-call Lead (after 15 min)
   Level 3: Engineering Manager (after 30 min)
   Level 4: VP Engineering (after 1 hour)
   ```

3. Assign escalation policy to your services

### 2. Slack Setup

**Create Webhook URLs:**

1. Go to Slack → Apps → Incoming Webhooks
2. Create webhooks for channels:
   - `#incidents` - Critical alerts and incidents
   - `#alerts` - Warning level alerts
   - `#monitoring` - Informational alerts
   - `#security` - Security-related alerts

3. Create secret files for webhook URLs:

   **Docker Swarm:**
   ```bash
   echo "https://hooks.slack.com/services/YOUR/WEBHOOK" | docker secret create slack_webhook_incidents -
   echo "https://hooks.slack.com/services/YOUR/ALERTS" | docker secret create slack_webhook_alerts -
   echo "https://hooks.slack.com/services/YOUR/MONITORING" | docker secret create slack_webhook_monitoring -
   echo "https://hooks.slack.com/services/YOUR/SECURITY" | docker secret create slack_webhook_security -
   ```

   **Kubernetes:**
   ```bash
   kubectl create secret generic alertmanager-slack \
     --from-literal=slack_webhook_incidents="https://hooks.slack.com/..." \
     --from-literal=slack_webhook_alerts="https://hooks.slack.com/..." \
     --from-literal=slack_webhook_monitoring="https://hooks.slack.com/..." \
     --from-literal=slack_webhook_security="https://hooks.slack.com/..."
   ```

   **Docker Compose:**
   ```bash
   mkdir -p secrets
   echo "https://hooks.slack.com/services/YOUR/WEBHOOK" > secrets/slack_webhook_incidents
   echo "https://hooks.slack.com/services/YOUR/ALERTS" > secrets/slack_webhook_alerts
   # ... etc for other webhooks
   chmod 400 secrets/*
   ```

4. Update `alertmanager.yml` with secret file references:
   ```yaml
   - name: 'slack-incidents'
     slack_configs:
       - api_url_file: '/run/secrets/slack_webhook_incidents'
         channel: '#incidents'
   ```

**Recommended Channel Setup:**

- **#incidents**: Critical alerts, SLO breaches, active incident coordination
- **#alerts**: Warning level alerts, potential issues
- **#monitoring**: Informational alerts, metrics trends
- **#security**: Security events, authentication failures

### 3. Email Setup

**Configure SMTP:**

1. Update global section in `alertmanager.yml`:
   ```yaml
   global:
     smtp_smarthost: 'smtp.gmail.com:587'
     smtp_from: 'alerts@clipper.app'
     smtp_auth_username: 'alerts@clipper.app'
     smtp_auth_password: 'your-smtp-password'
     smtp_require_tls: true
   ```

2. For Gmail, use an App Password:
   - Enable 2FA on your Google account
   - Generate App Password: Google Account → Security → App Passwords
   - Use the generated password in the config

**Email Distribution Lists:**

- `oncall@clipper.app` - On-call rotation
- `engineering@clipper.app` - Engineering team
- `security@clipper.app` - Security team

### 4. Discord Setup (Optional)

1. Create webhook in Discord:
   - Server Settings → Integrations → Webhooks → New Webhook
   - Copy webhook URL

2. Update `alertmanager.yml`:
   ```yaml
   - name: 'discord-alerts'
     webhook_configs:
       - url: 'https://discord.com/api/webhooks/YOUR/WEBHOOK'
   ```

## Alert Inhibition Rules

Inhibition rules prevent alert spam by suppressing lower-priority alerts when related higher-priority alerts are firing.

### Configured Rules

1. **Severity Hierarchy**
   - Critical alerts suppress warnings/info for same alert

2. **Service Down**
   - Service down alerts suppress other alerts from that service

3. **SLO Breach**
   - SLO breach alerts suppress individual error rate alerts

4. **Dependency Failures**
   - Database down suppresses connection alerts
   - Redis down suppresses memory alerts

### Example

If `ServiceDown` is firing for `backend`:
- All `warning` and `info` alerts from `backend` are suppressed
- Only the critical `ServiceDown` alert is sent
- Reduces notification noise during outages

## Alert Grouping

Alerts are grouped to prevent spam and provide context.

**Group By:** `alertname`, `cluster`, `service`

**Timings:**
- `group_wait: 10s` - Wait for other alerts before sending
- `group_interval: 5m` - Time between grouped notifications
- `repeat_interval: 4h` - Time before re-sending (varies by severity)

**Example:**

Multiple pod failures will be grouped into a single notification:
```
🚨 CRITICAL: ServiceDown

- backend-pod-1 is down
- backend-pod-2 is down
- backend-pod-3 is down

Started: 2025-12-21 10:00:00 UTC
```

## Testing Alert Routing

### 1. Test Alert Configuration

```bash
# Check configuration syntax
docker-compose -f monitoring/docker-compose.monitoring.yml exec alertmanager \
  amtool check-config /etc/alertmanager/alertmanager.yml
```

### 2. Send Test Alert

```bash
# Send test alert to Alertmanager
curl -H "Content-Type: application/json" -d '[{
  "labels": {
    "alertname": "TestAlert",
    "severity": "warning",
    "service": "test"
  },
  "annotations": {
    "summary": "Test alert",
    "description": "This is a test alert to verify routing"
  }
}]' http://localhost:9093/api/v1/alerts
```

### 3. Verify Routing

1. Check Alertmanager UI: http://localhost:9093
2. Verify alert appears in configured channels (Slack, email)
3. For PagerDuty, verify incident is created

### 4. Test Silence

```bash
# Create a silence for 1 hour
amtool silence add alertname=TestAlert --duration=1h --comment="Testing silence"

# List active silences
amtool silence query
```

## Alert Templates

Custom templates can be used to format alert notifications.

### Create Template File

Create `monitoring/templates/clipper.tmpl`:

```go
{{ define "slack.clipper.title" }}
[{{ .Status | toUpper }}{{ if eq .Status "firing" }}:{{ .Alerts.Firing | len }}{{ end }}] {{ .GroupLabels.alertname }}
{{ end }}

{{ define "slack.clipper.text" }}
{{ range .Alerts }}
*Alert:* {{ .Labels.alertname }}
*Severity:* {{ .Labels.severity }}
*Summary:* {{ .Annotations.summary }}
*Description:* {{ .Annotations.description }}
{{ if .Annotations.runbook }}*Runbook:* {{ .Annotations.runbook }}{{ end }}
*Started:* {{ .StartsAt.Format "2006-01-02 15:04:05 UTC" }}
{{ if .EndsAt }}*Ended:* {{ .EndsAt.Format "2006-01-02 15:04:05 UTC" }}{{ end }}
{{ end }}
{{ end }}
```

### Use Template

Update receiver in `alertmanager.yml`:

```yaml
- name: 'slack-incidents'
  slack_configs:
    - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK'
      channel: '#incidents'
      title: '{{ template "slack.clipper.title" . }}'
      text: '{{ template "slack.clipper.text" . }}'
```

## Maintenance Mode

### Silence Alerts During Maintenance

**Recommended approach:** Silence alerts by service or component:

```bash
# Silence alerts for specific service (RECOMMENDED)
amtool silence add service=backend \
  --duration=2h \
  --comment="Backend deployment in progress" \
  --author="ops@clipper.app"

# Silence alerts for specific instance
amtool silence add instance=backend-prod-1 \
  --duration=1h \
  --comment="Server maintenance" \
  --author="ops@clipper.app"
```

### Silence All Non-Security Alerts

**⚠️ Use with caution:** Silences most alerts but preserves security monitoring:

```bash
# Silence all alerts EXCEPT security alerts (SAFER)
amtool silence add alertname=~".+" alertname!~".*Security.*|.*Authentication.*|.*Injection.*" \
  --duration=2h \
  --comment="Scheduled maintenance window (security monitoring active)" \
  --author="ops@clipper.app"
```

### Silence All Alerts

**🚨 EXTREMELY DANGEROUS:** Only use in catastrophic scenarios or complete system maintenance:

```bash
# ⚠️⚠️⚠️ DANGER: This will silence ALL alerts including critical security alerts ⚠️⚠️⚠️
# Use this ONLY if:
# - Complete system maintenance where no monitoring is possible
# - All stakeholders are aware and on standby
# - Security team has been notified
amtool silence add alertname=~".+" \
  --duration=2h \
  --comment="COMPLETE SYSTEM MAINTENANCE - All monitoring silenced" \
  --author="ops@clipper.app"
```

**During complete silence:**
- Notify security team before and after
- Have manual monitoring procedures in place
- Document in incident log
- Limit duration to absolute minimum

### Silence Specific Service

```bash
# Silence alerts for backend service
amtool silence add service=backend \
  --duration=1h \
  --comment="Backend deployment in progress"
```

### Remove Silence

```bash
# List silences
amtool silence query

# Remove specific silence
amtool silence expire <silence-id>
```

## Troubleshooting

### Alerts Not Routing

1. **Check Alertmanager logs:**
   ```bash
   docker-compose -f monitoring/docker-compose.monitoring.yml logs alertmanager
   ```

2. **Verify configuration:**
   ```bash
   amtool check-config /etc/alertmanager/alertmanager.yml
   ```

3. **Check Prometheus is sending alerts:**
   - Go to Prometheus: http://localhost:9090/alerts
   - Verify alerts are in "Firing" state
   - Check alert has correct labels

4. **Test routing manually:**
   ```bash
   amtool config routes test \
     --config.file=/etc/alertmanager/alertmanager.yml \
     severity=critical alertname=TestAlert
   ```

### PagerDuty Not Receiving Alerts

1. **Verify routing key is correct** (Events API v2) or service key (v1)
2. **Check PagerDuty integration status**
3. **Review Alertmanager logs for errors**
4. **Test PagerDuty API:**
   
   **Events API v2 (recommended):**
   ```bash
   curl -X POST https://events.pagerduty.com/v2/enqueue \
     -H 'Content-Type: application/json' \
     -d '{
       "routing_key": "YOUR_ROUTING_KEY",
       "event_action": "trigger",
       "payload": {
         "summary": "Test from Clipper",
         "severity": "critical",
         "source": "test"
       }
     }'
   ```
   
   **Events API v1 (legacy):**
   ```bash
   curl -X POST https://events.pagerduty.com/generic/2010-04-15/create_event.json \
     -H 'Content-Type: application/json' \
     -d '{
       "service_key": "YOUR_SERVICE_KEY",
       "event_type": "trigger",
       "description": "Test from Clipper"
     }'
   ```

### Slack Not Receiving Alerts

1. **Verify webhook URL is correct**
2. **Test webhook directly:**
   ```bash
   curl -X POST 'https://hooks.slack.com/services/YOUR/WEBHOOK' \
     -H 'Content-Type: application/json' \
     -d '{"text": "Test from Clipper monitoring"}'
   ```
3. **Check channel exists and bot has access**
4. **Review Alertmanager logs for HTTP errors**

### Too Many Alerts (Alert Fatigue)

1. **Review and adjust thresholds:**
   - Edit `monitoring/alerts.yml`
   - Increase thresholds or durations
   - Reload Prometheus: `curl -X POST http://localhost:9090/-/reload`

2. **Add inhibition rules:**
   - Suppress low-priority alerts when high-priority firing
   - Group related alerts

3. **Adjust repeat intervals:**
   - Increase `repeat_interval` in alertmanager config
   - Don't repeat info-level alerts

4. **Use silences strategically:**
   - Silence known issues being worked on
   - Silence during scheduled maintenance

## On-Call Best Practices

### For On-Call Engineers

1. **Acknowledge alerts immediately** (within 15 minutes)
2. **Update incident channel** with status
3. **Follow runbooks** for common issues
4. **Ask for help** if stuck
5. **Document actions** taken
6. **Write post-mortem** after resolution

### For Engineering Managers

1. **Review alert metrics** weekly
   - Alert frequency
   - Time to acknowledge
   - Time to resolve
   - False positive rate

2. **Tune alerting** based on feedback
3. **Update runbooks** with learnings
4. **Conduct post-mortems** for major incidents
5. **Iterate on SLOs** quarterly

## Alert Metrics and Analytics

### View Alert Statistics

```bash
# Alert frequency by alertname
amtool alert query --active

# Silenced alerts
amtool silence query

# Alert history (requires Alertmanager with persistence)
curl http://localhost:9093/api/v2/alerts
```

### Monitor Alertmanager Health

```promql
# Alerts firing
ALERTS{alertstate="firing"}

# Alerts by severity
count(ALERTS{alertstate="firing"}) by (severity)

# Notification success rate
alertmanager_notifications_total{integration="slack"}
alertmanager_notifications_failed_total{integration="slack"}
```

## Configuration Checklist

- [ ] PagerDuty service keys configured
- [ ] Slack webhook URLs configured
- [ ] Email SMTP settings configured
- [ ] Escalation policy defined in PagerDuty
- [ ] Test alerts sent to each channel
- [ ] Inhibition rules tested
- [ ] On-call schedule defined
- [ ] Runbooks linked in alerts
- [ ] Alert thresholds validated
- [ ] Team trained on alert response

## References

- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Alerting Rules Guide](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- [PagerDuty Integration](https://www.pagerduty.com/docs/guides/prometheus-integration-guide/)
- [Slack Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- [SLO Documentation](../../docs/operations/slos.md)
- [SLO Breach Response Playbook](../../docs/operations/playbooks/slo-breach-response.md)
