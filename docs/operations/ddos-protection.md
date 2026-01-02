---
title: "DDoS Protection & Mitigation"
summary: "DDoS protection configuration, rate limiting, traffic filtering, and incident response procedures"
tags: ['operations', 'security', 'ddos', 'rate-limiting']
area: "operations"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2026-01-02
related_issues: ["#862", "#861", "#805"]
---

# DDoS Protection & Mitigation

**Last Updated**: 2026-01-02  
**Status**: ✅ Active (Multi-Layer Protection)  
**Roadmap**: Phase 5.4 (Roadmap 5.0)

## Overview

This document describes the DDoS (Distributed Denial of Service) protection strategy for Clipper, covering edge-level rate limiting, traffic filtering, monitoring, and incident response procedures.

**Protection Layers:**
1. **Edge Protection** - Ingress-nginx rate limiting with per-IP/ASN controls
2. **Application Rate Limiting** - Backend middleware with Redis (see [WAF Protection](./waf-protection.md))
3. **Abuse Detection** - Behavioral analysis and automatic IP banning
4. **Traffic Analytics** - Real-time monitoring and alerting
5. **Cloud Provider DDoS Protection** - Native cloud platform defenses (AWS Shield, GCP Cloud Armor, Cloudflare)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Cloud Provider DDoS Protection                     │
│ (AWS Shield / GCP Cloud Armor / Cloudflare)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Layer 2: Ingress-NGINX Rate Limiting                        │
│ - Per-IP rate limits: 100 req/s                             │
│ - Per-IP connection limits: 20 concurrent                   │
│ - Burst allowance: 200 requests                             │
│ - Geo-filtering (optional): Block high-risk regions         │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Layer 3: Application Rate Limiting (Backend)                │
│ - Per-endpoint limits (see WAF documentation)               │
│ - Subscription-tier aware (5x for premium)                  │
│ - Redis-backed with fallback                                │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│ Layer 4: Abuse Detection                                    │
│ - Behavioral analysis                                       │
│ - Automatic IP banning (24h)                                │
│ - Threshold: 1000 req/hour                                  │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Layer 1: Cloud Provider DDoS Protection

#### AWS Shield (for AWS EKS)

**AWS Shield Standard** (Automatic, No Configuration Required):
- Protection against common DDoS attacks (SYN/UDP floods, reflection attacks)
- Included with all AWS services at no additional cost
- Automatic detection and mitigation

**AWS Shield Advanced** (Optional, Enterprise):
```bash
# Enable Shield Advanced on Load Balancer
aws shield create-protection \
  --name clipper-production-lb \
  --resource-arn arn:aws:elasticloadbalancing:region:account:loadbalancer/app/clipper-lb/xxx

# Configure DDoS response team (DRT) access
aws shield associate-drt-log-bucket \
  --log-bucket clipper-ddos-logs

# Set up CloudWatch alarms
aws cloudwatch put-metric-alarm \
  --alarm-name clipper-ddos-detected \
  --alarm-description "DDoS attack detected on Clipper" \
  --metric-name DDoSDetected \
  --namespace AWS/Shield \
  --statistic Sum \
  --period 60 \
  --evaluation-periods 1 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold
```

**Features**:
- Cost protection (reimburse scaling costs during attacks)
- 24/7 DDoS Response Team (DRT)
- Advanced attack analytics
- Real-time notifications

**Cost**: $3,000/month (optional for high-risk deployments)

#### GCP Cloud Armor (for GCP GKE)

**Enable Cloud Armor** for production load balancer:

```yaml
# gcp-cloud-armor-policy.yaml
apiVersion: compute.cnrm.cloud.google.com/v1beta1
kind: ComputeSecurityPolicy
metadata:
  name: clipper-ddos-protection
spec:
  description: "DDoS protection for Clipper production"
  
  # Default rule: Allow traffic
  rule:
    - action: "allow"
      priority: 2147483647
      match:
        versionedExpr: SRC_IPS_V1
        config:
          srcIpRanges:
            - "*"
      description: "Default allow"
  
  # Rate limiting rule: 100 req/s per IP
  - action: "rate_based_ban"
    priority: 1000
    match:
      versionedExpr: SRC_IPS_V1
      config:
        srcIpRanges:
          - "*"
    rateLimitOptions:
      conformAction: "allow"
      exceedAction: "deny(429)"
      enforceOnKey: "IP"
      rateLimitThreshold:
        count: 100
        intervalSec: 1
      banThreshold:
        count: 1000
        intervalSec: 60
      banDurationSec: 600
    description: "Rate limit: 100 req/s per IP"
  
  # Block known malicious IPs (optional)
  - action: "deny(403)"
    priority: 100
    match:
      versionedExpr: SRC_IPS_V1
      config:
        srcIpRanges:
          - "203.0.113.0/24"  # Example blocked range
    description: "Block known malicious IPs"
  
  # Geo-blocking (optional): Block high-risk countries
  # - action: "deny(403)"
  #   priority: 200
  #   match:
  #     expr:
  #       expression: "origin.region_code in ['XX', 'YY']"
  #   description: "Geo-blocking for high-risk regions"
  
  # Adaptive protection (ML-based)
  adaptiveProtectionConfig:
    layer7DdosDefenseConfig:
      enable: true
      ruleVisibility: STANDARD
```

**Apply to backend service**:
```bash
# Apply security policy to backend service
gcloud compute backend-services update clipper-backend \
  --security-policy=clipper-ddos-protection \
  --global

# Monitor Cloud Armor logs
gcloud logging read "resource.type=http_load_balancer AND jsonPayload.enforcedSecurityPolicy.name=clipper-ddos-protection" \
  --limit 50 \
  --format json
```

**Features**:
- Adaptive protection (ML-based anomaly detection)
- Rate limiting by IP, region, or custom rules
- Geo-blocking capabilities
- Pre-configured WAF rules (OWASP Top 10)
- Integration with Google Threat Intelligence

**Cost**: ~$10-50/month (based on rules + request volume)

#### Cloudflare (Alternative/Additional Layer)

**Setup Cloudflare as CDN proxy** (optional additional layer):

1. **Add site to Cloudflare**:
   ```bash
   # Point DNS to Cloudflare nameservers
   # Update DNS records to proxy through Cloudflare (orange cloud)
   ```

2. **Configure rate limiting rules**:
   ```
   Firewall Rules → Rate Limiting
   - URL: clpr.tv/*
   - Requests: 100 requests per 10 seconds
   - Action: Challenge (CAPTCHA)
   - Duration: 600 seconds
   ```

3. **Enable DDoS protection**:
   - **Under Attack Mode**: Aggressive challenge for all visitors (emergency use)
   - **Managed Challenge**: Automatic bot detection
   - **JavaScript Challenge**: Verify browser legitimacy

4. **Configure firewall rules**:
   ```
   Firewall Rules:
   - Block malicious IPs (Threat Score > 14)
   - Challenge known bots (not verified bots)
   - Block specific countries (optional)
   - Rate limit by ASN (Autonomous System Number)
   ```

**Features**:
- Automatic DDoS mitigation (network + application layer)
- 178 Tbps+ mitigation capacity
- Anycast network (global distribution)
- WAF with managed rulesets
- Bot management
- Analytics dashboard

**Cost**: 
- Free: Basic DDoS protection
- Pro ($20/month): Advanced DDoS + WAF
- Business ($200/month): Priority support + custom rules
- Enterprise (custom): Dedicated support + SLA

### Layer 2: Ingress-NGINX Rate Limiting

Configure rate limiting at the Kubernetes ingress level.

#### Production Configuration

**File**: `infrastructure/k8s/overlays/production/ingress-patch.yaml`

Add rate limiting annotations:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: clipper-backend
  namespace: clipper-production
  annotations:
    # Existing annotations
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    
    # DDoS Protection: Rate Limiting
    nginx.ingress.kubernetes.io/limit-rps: "100"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "2"
    nginx.ingress.kubernetes.io/limit-connections: "20"
    nginx.ingress.kubernetes.io/limit-rpm: "6000"
    
    # Connection limits
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "10"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "30"
    
    # Real IP detection (if behind Cloudflare/CDN)
    nginx.ingress.kubernetes.io/use-forwarded-headers: "true"
    nginx.ingress.kubernetes.io/compute-full-forwarded-for: "true"
    
    # Enable access logs for traffic analytics
    nginx.ingress.kubernetes.io/enable-access-log: "true"

spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - api.clpr.tv
      secretName: clipper-backend-tls-prod
  rules:
    - host: api.clpr.tv
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: clipper-backend
                port:
                  number: 80
```

**Rate Limit Configuration**:
- `limit-rps`: 100 requests per second per IP
- `limit-burst-multiplier`: 2 (allows bursts up to 200 requests)
- `limit-connections`: 20 concurrent connections per IP
- `limit-rpm`: 6000 requests per minute per IP

#### Staging Configuration

**File**: `infrastructure/k8s/overlays/staging/ingress-patch.yaml`

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: clipper-backend
  namespace: clipper-staging
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-staging
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    
    # More relaxed rate limits for testing
    nginx.ingress.kubernetes.io/limit-rps: "50"
    nginx.ingress.kubernetes.io/limit-burst-multiplier: "3"
    nginx.ingress.kubernetes.io/limit-connections: "30"
    nginx.ingress.kubernetes.io/limit-rpm: "3000"
    
    nginx.ingress.kubernetes.io/enable-access-log: "true"

spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - staging-api.clpr.tv
      secretName: clipper-backend-tls-staging
  rules:
    - host: staging-api.clpr.tv
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: clipper-backend
                port:
                  number: 80
```

#### Geo-Filtering (Optional)

To block specific countries or regions:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  # Block specific countries (ISO 3166-1 alpha-2 codes)
  # Uncomment to enable geo-blocking
  # block-cidrs: "CN,RU,KP"  # Example: China, Russia, North Korea
  
  # Whitelist specific countries only (more restrictive)
  # whitelist-source-range: "US,CA,GB,AU,NZ"
  
  # Log geo data for analytics
  log-format-upstream: '$remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent" $request_length $request_time [$proxy_upstream_name] [$proxy_alternative_upstream_name] $upstream_addr $upstream_response_length $upstream_response_time $upstream_status $req_id "$geoip_country_code"'
```

**Note**: Geo-filtering requires GeoIP database. Install with:

```bash
# Install GeoIP module for ingress-nginx
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  use-geoip2: "true"
  enable-real-ip: "true"
EOF
```

### Layer 3 & 4: Application Rate Limiting & Abuse Detection

See existing documentation:
- **[WAF Protection](./waf-protection.md)** - Application-level rate limiting
- **[Submission Rate Limiting](../backend/submission-rate-limiting.md)** - Endpoint-specific limits
- **Backend Abuse Detection**: `backend/docs/ABUSE_DETECTION.md`

These layers are already implemented and provide:
- Per-endpoint rate limiting (10-100 req/hour depending on endpoint)
- Per-user rate limiting (subscription-tier aware)
- Automatic IP banning (24h) for abuse (1000+ req/hour)
- Behavioral analysis and anomaly detection
- Redis-backed with fallback to in-memory

## Traffic Analytics

### Metrics Collection

Traffic metrics are collected from multiple sources:

1. **Ingress-NGINX Metrics** (Prometheus)
   - Request rate by IP, path, status
   - Connection count
   - Request duration
   - Upstream response time

2. **Application Metrics** (Backend)
   - Rate limit hits
   - Abuse detection triggers
   - IP bans
   - Endpoint-specific metrics

3. **Cloud Provider Metrics**
   - AWS CloudWatch (Shield events, ELB metrics)
   - GCP Cloud Monitoring (Cloud Armor events)
   - Cloudflare Analytics (if used)

### Grafana Dashboard

**Dashboard**: `monitoring/dashboards/ddos-traffic-analytics.json`

Create a new Grafana dashboard with the following panels:

#### Panel 1: Request Rate Overview
```promql
# Total requests per second
sum(rate(nginx_ingress_controller_requests[5m]))

# Requests by status code
sum(rate(nginx_ingress_controller_requests[5m])) by (status)

# Top IPs by request rate
topk(10, sum(rate(nginx_ingress_controller_requests[5m])) by (client_ip))
```

#### Panel 2: Rate Limit Events
```promql
# Rate limit hits (429 responses)
sum(rate(nginx_ingress_controller_requests{status="429"}[5m]))

# Rate limit hits by IP
topk(20, sum(rate(nginx_ingress_controller_requests{status="429"}[5m])) by (client_ip))

# Application rate limit events (from backend)
sum(rate(http_requests_total{endpoint="/api/v1/submissions",status="429"}[5m]))
```

#### Panel 3: IP Ban Activity
```promql
# Banned IPs count (from Redis)
redis_keyspace_hits{db="abuse"}

# Abuse detection triggers
sum(rate(abuse_detection_triggers_total[5m])) by (type)
```

#### Panel 4: Connection Metrics
```promql
# Active connections
nginx_ingress_controller_nginx_process_connections{state="active"}

# Connection rate
rate(nginx_ingress_controller_nginx_process_connections_total[5m])
```

#### Panel 5: Geographic Distribution
```promql
# Requests by country (if GeoIP enabled)
sum(rate(nginx_ingress_controller_requests[5m])) by (country_code)
```

#### Panel 6: Anomaly Detection
```promql
# Sudden traffic spikes (>5x baseline)
sum(rate(nginx_ingress_controller_requests[5m])) > 
  5 * avg_over_time(sum(rate(nginx_ingress_controller_requests[5m]))[1h:5m])

# Unusual request patterns (high error rate)
sum(rate(nginx_ingress_controller_requests{status=~"4..|5.."}[5m])) /
sum(rate(nginx_ingress_controller_requests[5m])) > 0.1
```

### Access Logs

**Enable structured logging** for traffic analysis:

```yaml
# ingress-nginx ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-configuration
  namespace: ingress-nginx
data:
  log-format-escape-json: "true"
  log-format-upstream: |
    {
      "timestamp": "$time_iso8601",
      "remote_addr": "$remote_addr",
      "x_forwarded_for": "$proxy_add_x_forwarded_for",
      "request_id": "$req_id",
      "remote_user": "$remote_user",
      "bytes_sent": $bytes_sent,
      "request_time": $request_time,
      "status": $status,
      "vhost": "$host",
      "request_proto": "$server_protocol",
      "path": "$uri",
      "request_query": "$args",
      "request_length": $request_length,
      "duration": $request_time,
      "method": "$request_method",
      "http_referrer": "$http_referer",
      "http_user_agent": "$http_user_agent",
      "upstream_addr": "$upstream_addr",
      "upstream_response_time": "$upstream_response_time",
      "upstream_status": "$upstream_status",
      "country_code": "$geoip_country_code",
      "asn": "$geoip_asn"
    }
```

**Ship logs to centralized logging**:
- Loki (see `monitoring/loki-config.yml`)
- CloudWatch Logs (AWS)
- Cloud Logging (GCP)
- Elasticsearch (ELK stack)

### Analytics Queries

**Identify potential DDoS attacks**:

```bash
# Top 50 IPs by request volume (last 5 minutes)
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=10000 | \
  jq -r '.remote_addr' | sort | uniq -c | sort -rn | head -50

# Request rate by minute
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=10000 | \
  jq -r '.timestamp' | cut -d':' -f1-2 | sort | uniq -c

# Top user agents (identify bot patterns)
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=10000 | \
  jq -r '.http_user_agent' | sort | uniq -c | sort -rn | head -20

# Geographic distribution
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=10000 | \
  jq -r '.country_code' | sort | uniq -c | sort -rn
```

## Monitoring & Alerting

### Alert Rules

**File**: `monitoring/alerts.yml`

Add DDoS-specific alert rules:

```yaml
groups:
  - name: clipper_ddos_alerts
    interval: 30s
    rules:
      # High traffic volume (potential DDoS)
      - alert: SuspiciouslyHighTrafficVolume
        expr: |
          sum(rate(nginx_ingress_controller_requests[1m])) > 1000
        for: 2m
        labels:
          severity: warning
          category: ddos
        annotations:
          summary: "Unusually high traffic volume detected"
          description: "Request rate is {{ $value }} req/s, which is significantly above normal baseline."
          runbook: "Check traffic analytics dashboard, review top IPs, consider enabling 'Under Attack Mode' if attack confirmed."
      
      # Critical: Very high traffic (likely DDoS)
      - alert: DDoSAttackSuspected
        expr: |
          sum(rate(nginx_ingress_controller_requests[1m])) > 5000
        for: 1m
        labels:
          severity: critical
          category: ddos
        annotations:
          summary: "Potential DDoS attack in progress"
          description: "Request rate is {{ $value }} req/s, far exceeding normal capacity."
          runbook: "URGENT: Follow DDoS mitigation runbook. Enable aggressive rate limiting, contact cloud provider support, review incident response plan."
      
      # Rate limit frequently triggered
      - alert: HighRateLimitHitRate
        expr: |
          sum(rate(nginx_ingress_controller_requests{status="429"}[5m])) > 50
        for: 5m
        labels:
          severity: warning
          category: ddos
        annotations:
          summary: "High rate of rate limit hits"
          description: "{{ $value }} rate limit hits per second. May indicate DDoS attempt or misconfigured client."
          runbook: "Review rate-limited IPs, check if legitimate traffic, adjust rate limits if needed."
      
      # Multiple IPs banned (coordinated attack)
      - alert: MultipleIPsBanned
        expr: |
          sum(rate(abuse_detection_ip_bans_total[5m])) > 10
        for: 5m
        labels:
          severity: critical
          category: ddos
        annotations:
          summary: "Multiple IPs banned for abuse"
          description: "{{ $value }} IPs banned in last 5 minutes. Likely coordinated DDoS attack."
          runbook: "Review banned IP list, identify attack patterns, enable additional edge protection."
      
      # High error rate (resource exhaustion)
      - alert: HighErrorRateDDoS
        expr: |
          sum(rate(nginx_ingress_controller_requests{status=~"5.."}[5m])) /
          sum(rate(nginx_ingress_controller_requests[5m])) > 0.1
        for: 3m
        labels:
          severity: critical
          category: ddos
        annotations:
          summary: "High server error rate (potential resource exhaustion)"
          description: "{{ $value | humanizePercentage }} of requests returning 5xx errors."
          runbook: "Check application health, scale up if needed, review if DDoS causing resource exhaustion."
      
      # Connection limit saturation
      - alert: ConnectionLimitSaturation
        expr: |
          nginx_ingress_controller_nginx_process_connections{state="active"} > 50000
        for: 2m
        labels:
          severity: warning
          category: ddos
        annotations:
          summary: "High number of active connections"
          description: "{{ $value }} active connections. May be approaching limits."
          runbook: "Review connection sources, scale ingress controller if needed, check for connection leak."
      
      # Single IP excessive traffic
      - alert: SingleIPExcessiveTraffic
        expr: |
          topk(1, sum(rate(nginx_ingress_controller_requests[5m])) by (client_ip)) > 100
        for: 5m
        labels:
          severity: warning
          category: ddos
        annotations:
          summary: "Single IP generating excessive traffic"
          description: "IP {{ $labels.client_ip }} generating {{ $value }} req/s."
          runbook: "Investigate IP, check if legitimate, consider manual IP block if malicious."
```

### Alert Routing

**File**: `monitoring/alertmanager.yml`

Configure alert routing for DDoS incidents:

```yaml
route:
  # ... existing routes ...
  
  routes:
    # DDoS alerts - highest priority
    - match:
        category: ddos
      receiver: ddos-oncall
      group_wait: 10s
      group_interval: 5m
      repeat_interval: 30m
      continue: true

receivers:
  # ... existing receivers ...
  
  - name: ddos-oncall
    pagerduty_configs:
      - service_key: <PAGERDUTY_DDOS_KEY>
        severity: critical
        description: '{{ .CommonAnnotations.summary }}'
        details:
          firing: '{{ .Alerts.Firing | len }}'
          resolved: '{{ .Alerts.Resolved | len }}'
          alerts: '{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}'
    slack_configs:
      - api_url: <SLACK_WEBHOOK_URL>
        channel: '#security-incidents'
        title: '🚨 DDoS Alert: {{ .CommonAnnotations.summary }}'
        text: '{{ .CommonAnnotations.description }}'
        color: danger
```

## Incident Response Flow

### Detection Phase

**Indicators of DDoS Attack:**
1. ✅ Alert: `DDoSAttackSuspected` fires
2. 📊 Traffic analytics show >5x normal request rate
3. 📊 Multiple IPs generating high traffic volume
4. 📈 Rate limit hit rate >100/second
5. 💥 Application latency increases (P95 >500ms)
6. 💥 Error rate increases (>5% 5xx responses)

**Verification:**
```bash
# 1. Check current request rate
kubectl top pods -n clipper-production

# 2. Review traffic analytics dashboard
# Open: http://grafana.clipper.app/d/ddos-traffic-analytics

# 3. Check top IPs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=5000 | \
  jq -r '.remote_addr' | sort | uniq -c | sort -rn | head -20

# 4. Review alert details
kubectl logs -n monitoring deployment/alertmanager
```

### Immediate Mitigation (5-15 minutes)

**Priority 1: Protect Service Availability**

1. **Enable aggressive rate limiting** (temporary):
   ```bash
   # Apply emergency rate limits
   kubectl patch ingress clipper-backend -n clipper-production --type=json -p='[
     {"op": "replace", "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1limit-rps", "value": "10"},
     {"op": "replace", "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1limit-connections", "value": "5"}
   ]'
   ```

2. **Scale up ingress controllers** (if needed):
   ```bash
   kubectl scale deployment ingress-nginx-controller -n ingress-nginx --replicas=5
   ```

3. **Enable Cloud Provider DDoS protection** (if available):
   
   **AWS Shield Advanced**:
   ```bash
   # Request DRT assistance (if Shield Advanced subscriber)
   aws shield create-drt-access --role-arn arn:aws:iam::account:role/DRTRole
   ```
   
   **GCP Cloud Armor - Adaptive Protection**:
   ```bash
   # Enable aggressive adaptive protection
   gcloud compute security-policies update clipper-ddos-protection \
     --adaptive-protection-config-layer7-ddos-defense-enable \
     --adaptive-protection-config-layer7-ddos-defense-rule-visibility=PREMIUM
   ```
   
   **Cloudflare - Under Attack Mode**:
   - Go to Cloudflare Dashboard → Security → Settings
   - Enable "Under Attack Mode" (presents JavaScript challenge to all visitors)
   - Or via API:
     ```bash
     curl -X PATCH "https://api.cloudflare.com/client/v4/zones/{zone_id}/settings/security_level" \
       -H "Authorization: Bearer {api_token}" \
       -H "Content-Type: application/json" \
       --data '{"value":"under_attack"}'
     ```

4. **Block attack sources** (if attack is from specific IPs/ASNs):
   ```bash
   # Block specific IPs
   kubectl exec -n ingress-nginx deployment/ingress-nginx-controller -- \
     nginx -s reload -c /etc/nginx/nginx.conf
   
   # Add IPs to ConfigMap for persistent blocking
   kubectl edit configmap nginx-configuration -n ingress-nginx
   # Add: block-cidrs: "203.0.113.0/24,198.51.100.0/24"
   ```

### Short-Term Response (15-60 minutes)

**Priority 2: Analysis & Escalation**

1. **Analyze attack patterns**:
   ```bash
   # Identify attack type
   # - Volumetric: High req/s from many IPs
   # - Application: Targeted expensive endpoints
   # - Slowloris: Many slow connections
   
   # Top endpoints being hit
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=10000 | \
     jq -r '.path' | sort | uniq -c | sort -rn | head -20
   
   # Request methods distribution
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=10000 | \
     jq -r '.method' | sort | uniq -c
   
   # Geographic distribution
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=10000 | \
     jq -r '.country_code' | sort | uniq -c | sort -rn
   ```

2. **Scale application resources**:
   ```bash
   # Scale backend pods
   kubectl scale deployment clipper-backend -n clipper-production --replicas=10
   
   # Scale database connections (if needed)
   kubectl edit deployment clipper-backend -n clipper-production
   # Update: POSTGRES_MAX_CONNECTIONS=200
   ```

3. **Notify stakeholders**:
   - Post in Slack #incidents channel
   - Update status page (if applicable)
   - Notify management if prolonged attack

4. **Contact cloud provider** (if needed):
   - AWS Support: Open high-priority ticket for Shield team
   - GCP Support: Contact Cloud Armor team
   - Cloudflare: Enterprise support (if subscriber)

### Long-Term Resolution (1-24 hours)

**Priority 3: Sustained Protection & Recovery**

1. **Implement targeted blocking**:
   - **By ASN** (if attack from specific networks):
     ```yaml
     # GCP Cloud Armor
     - action: "deny(403)"
       priority: 50
       match:
         expr:
           expression: "origin.asn == 12345"
       description: "Block malicious ASN"
     ```
   
   - **By geographic region** (if appropriate):
     ```yaml
     # Add to ingress-nginx ConfigMap
     block-cidrs: "CN,RU"  # Example
     ```
   
   - **By user-agent patterns**:
     ```yaml
     # GCP Cloud Armor
     - action: "deny(403)"
       priority: 60
       match:
         expr:
           expression: "has(request.headers['user-agent']) && request.headers['user-agent'].matches('.*malicious-bot.*')"
       description: "Block malicious bots"
     ```

2. **Optimize application**:
   - Review and cache expensive endpoints
   - Implement request throttling for resource-intensive operations
   - Add CAPTCHA challenges for sensitive endpoints

3. **Monitor recovery**:
   ```bash
   # Watch request rate normalize
   watch -n 5 'kubectl top pods -n clipper-production'
   
   # Monitor error rate
   # Check Grafana dashboard for recovery
   ```

4. **Document incident**:
   - Record attack timeline
   - Document mitigation steps taken
   - Identify lessons learned
   - Update runbook with new insights

### Post-Incident Phase

**Priority 4: Prevention & Improvement**

1. **Post-incident review**:
   - Schedule PIR (Post-Incident Review) meeting within 48 hours
   - Review what worked and what didn't
   - Identify process improvements

2. **Strengthen defenses**:
   - Adjust rate limits based on attack patterns
   - Add additional monitoring/alerts
   - Consider upgrading cloud provider DDoS protection tier

3. **Update documentation**:
   - Add attack patterns to knowledge base
   - Update mitigation procedures
   - Share learnings with team

4. **Restore normal operations**:
   ```bash
   # Revert aggressive rate limits
   kubectl patch ingress clipper-backend -n clipper-production --type=json -p='[
     {"op": "replace", "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1limit-rps", "value": "100"},
     {"op": "replace", "path": "/metadata/annotations/nginx.ingress.kubernetes.io~1limit-connections", "value": "20"}
   ]'
   
   # Scale down to normal capacity
   kubectl scale deployment ingress-nginx-controller -n ingress-nginx --replicas=3
   kubectl scale deployment clipper-backend -n clipper-production --replicas=3
   
   # Disable "Under Attack Mode" (if Cloudflare)
   # Set security level back to "medium"
   ```

## Escalation Procedures

### Level 1: On-Call Engineer (Initial Response)

**Responsibilities:**
- Acknowledge alert within 5 minutes
- Verify attack is occurring
- Apply immediate mitigation (rate limiting, scaling)
- Notify Level 2 if attack persists >15 minutes

**Contact:**
- On-call rotation: See PagerDuty schedule
- Slack: #incidents channel

### Level 2: Security Team (Ongoing Attack)

**Responsibilities:**
- Advanced analysis of attack patterns
- Coordinate with cloud provider support
- Implement targeted blocking rules
- Brief management on impact and ETA

**Contact:**
- Security lead: security@clipper.app
- Slack: #security-incidents

### Level 3: Cloud Provider Support (Severe Attack)

**Escalate if:**
- Attack volume exceeds ingress capacity (>10,000 req/s)
- Multiple mitigation attempts unsuccessful
- Business impact >$10,000/hour

**Contacts:**
- **AWS Shield DRT**: 
  - Phone: 1-877-934-7638 (US) or +1-206-266-4064 (International)
  - Email: aws-shield-drt@amazon.com
  - Open ticket: AWS Support Console (Enterprise Support)

- **GCP Cloud Armor**:
  - Support: https://cloud.google.com/support
  - Priority: P1 (Critical Impact)
  - Phone: Available to Premium Support subscribers

- **Cloudflare Enterprise Support**:
  - Phone: 1-888-993-5273 (US) or +1-650-319-8930 (International)
  - Emergency hotline: Available 24/7 for Enterprise customers
  - Email: enterprisesupport@cloudflare.com

### Level 4: Executive Leadership (Extended Outage)

**Escalate if:**
- Attack duration >2 hours
- Service degradation affecting >50% of users
- Media coverage or public impact
- Estimated business impact >$50,000

**Notification:**
- CEO, CTO, VP Engineering
- Communication: PR/Legal teams (if needed)

## Testing & Validation

### Pre-Production Testing

Test DDoS protections in staging environment:

1. **Rate limit testing**:
   ```bash
   # Test rate limits with Apache Bench
   ab -n 1000 -c 10 https://staging-api.clpr.tv/api/v1/clips
   
   # Should see 429 responses after hitting limit
   # Verify: Ingress logs show rate limiting
   kubectl logs -n ingress-nginx deployment/ingress-nginx-controller | grep "429"
   ```

2. **Connection limit testing**:
   ```bash
   # Test concurrent connection limits
   for i in {1..30}; do
     curl -s https://staging-api.clpr.tv/api/v1/clips &
   done
   wait
   
   # Should see connection rejections after 20 concurrent
   ```

3. **Geographic blocking** (if enabled):
   ```bash
   # Test with VPN to blocked country
   # Request should be denied with 403
   curl -i https://staging-api.clpr.tv/api/v1/clips
   ```

4. **Alert testing**:
   ```bash
   # Generate traffic to trigger alerts
   cd /home/runner/work/clipper/clipper/monitoring
   ./test-alerts.sh ddos
   
   # Verify alert fires and routes to correct receiver
   ```

### Production Validation

**After deployment, verify:**

1. ✅ Rate limits are enforced (check for 429 responses in logs)
2. ✅ Traffic analytics dashboard displays metrics
3. ✅ Alerts are configured and routing correctly
4. ✅ Cloud provider DDoS protection is active
5. ✅ On-call team has access to runbook and tools

**Validation script**:
```bash
#!/bin/bash
# validate-ddos-protection.sh

echo "Validating DDoS Protection Configuration..."

# Check ingress annotations
echo "1. Checking ingress rate limit annotations..."
kubectl get ingress clipper-backend -n clipper-production -o yaml | \
  grep -E "limit-rps|limit-connections|limit-rpm"

# Check metrics endpoint
echo "2. Verifying ingress-nginx metrics..."
kubectl exec -n ingress-nginx deployment/ingress-nginx-controller -- \
  curl -s http://localhost:10254/metrics | grep nginx_ingress_controller_requests

# Check alert rules loaded
echo "3. Verifying alert rules..."
kubectl exec -n monitoring deployment/prometheus -- \
  wget -O - http://localhost:9090/api/v1/rules | \
  jq '.data.groups[] | select(.name=="clipper_ddos_alerts")'

# Check dashboard exists
echo "4. Checking Grafana dashboard..."
kubectl exec -n monitoring deployment/grafana -- \
  ls /var/lib/grafana/dashboards/ | grep ddos

echo "✅ Validation complete"
```

### Load Testing

Perform regular load tests to validate capacity:

```bash
# Load test with k6
cd /home/runner/work/clipper/clipper/backend/tests/load

# Test baseline capacity
k6 run --vus 100 --duration 5m scenarios/baseline.js

# Test burst capacity
k6 run --vus 500 --duration 1m scenarios/burst.js

# Test sustained load
k6 run --vus 200 --duration 30m scenarios/soak.js
```

## Best Practices

### Prevention

1. **Defense in Depth**: Use multiple protection layers (cloud + ingress + application)
2. **Regular Testing**: Test DDoS protections quarterly
3. **Capacity Planning**: Maintain 2-3x headroom for traffic spikes
4. **Rate Limit Tuning**: Adjust based on normal traffic patterns
5. **Monitoring**: Proactive monitoring of traffic trends

### Detection

1. **Baseline Metrics**: Establish normal traffic baselines
2. **Anomaly Detection**: Alert on deviations from baseline
3. **Real-Time Dashboards**: Always-on traffic analytics
4. **Log Analysis**: Regular review of access patterns

### Response

1. **Runbook Familiarity**: Team trained on procedures
2. **Quick Escalation**: Clear escalation paths
3. **Communication**: Keep stakeholders informed
4. **Documentation**: Record all incidents and learnings

### Recovery

1. **Gradual Restoration**: Slowly remove restrictions
2. **Monitoring**: Watch for attack resumption
3. **Post-Incident Review**: Always conduct PIR
4. **Continuous Improvement**: Update protections based on learnings

## Cost Considerations

### Estimated Monthly Costs

**Basic Protection** (Free/Low Cost):
- Ingress-nginx rate limiting: Free (included)
- Application rate limiting: Free (included)
- AWS Shield Standard: Free (included with AWS)
- Basic monitoring/alerting: Free (included)
- **Total: $0-10/month**

**Enhanced Protection** (Recommended):
- GCP Cloud Armor: ~$10-50/month
- Additional ingress replicas: ~$50-100/month
- Enhanced monitoring: ~$20-40/month
- **Total: $80-190/month**

**Enterprise Protection** (High-Risk):
- AWS Shield Advanced: $3,000/month
- Cloudflare Enterprise: $200-2,000/month
- Dedicated support: Varies
- **Total: $3,200-5,000/month**

**Recommendation**: Start with Enhanced Protection. Upgrade to Enterprise if:
- Revenue at risk exceeds $100k/day
- Previous DDoS attacks caused significant business impact
- Regulatory/compliance requirements mandate it

## Related Documentation

- **[WAF Protection](./waf-protection.md)** - Application firewall and rate limiting
- **[Monitoring](./monitoring.md)** - Observability and alerting
- **[Kubernetes Runbook](./kubernetes-runbook.md)** - K8s operations
- **[Security Scanning](./security-scanning.md)** - Security practices
- **[Incident Response](./break-glass-procedures.md)** - Break-glass procedures

## References

- **Roadmap 5.0 Phase 5.4**: Infrastructure Security (#862)
- **Issue #861**: WAF Protection (related)
- **Issue #805**: Roadmap 5.0 Master Tracker
- [OWASP DDoS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [AWS Shield Documentation](https://docs.aws.amazon.com/shield/)
- [GCP Cloud Armor Documentation](https://cloud.google.com/armor/docs)
- [Cloudflare DDoS Protection](https://www.cloudflare.com/ddos/)
- [NGINX Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)

## Support

For DDoS-related issues:

1. **During Attack**: Follow Incident Response Flow above
2. **Non-Emergency**: Create ticket in ops queue
3. **Questions**: #security or #operations Slack channels
4. **Escalation**: See Escalation Procedures section

---

**Document Owner**: DevOps Team  
**Last Tested**: 2026-01-02  
**Next Review**: 2026-04-02 (Quarterly)
