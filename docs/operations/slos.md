<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Service Level Objectives (SLOs)](#service-level-objectives-slos)
  - [Overview](#overview)
  - [SLO Definitions](#slo-definitions)
    - [1. Availability SLO](#1-availability-slo)
    - [2. Latency SLOs](#2-latency-slos)
    - [3. Error Rate SLO](#3-error-rate-slo)
    - [4. Search Performance SLO](#4-search-performance-slo)
    - [5. Webhook Delivery SLO](#5-webhook-delivery-slo)
  - [Error Budget](#error-budget)
    - [Availability Error Budget](#availability-error-budget)
    - [Error Budget Burn Rate](#error-budget-burn-rate)
    - [Error Budget Policy](#error-budget-policy)
  - [Measurement and Monitoring](#measurement-and-monitoring)
    - [Data Sources](#data-sources)
    - [Calculation Windows](#calculation-windows)
    - [Dashboards](#dashboards)
  - [Alerting Strategy](#alerting-strategy)
    - [Alert Severity Levels](#alert-severity-levels)
    - [Alert Channels](#alert-channels)
    - [Escalation Policy](#escalation-policy)
  - [SLO Breach Response](#slo-breach-response)
    - [Critical (P1) Response](#critical-p1-response)
    - [Warning (P2) Response](#warning-p2-response)
    - [Info (P3) Response](#info-p3-response)
  - [Review and Iteration](#review-and-iteration)
  - [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Service Level Objectives (SLOs)"
summary: "Defined SLOs for availability, latency, and error rates with monitoring and alerting strategy"
tags: ["slo", "monitoring", "reliability", "operations"]
area: "operations"
status: "active"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-21
aliases: ["slo", "service levels", "reliability targets"]
---

# Service Level Objectives (SLOs)

## Overview

This document defines the Service Level Objectives (SLOs) for the Clipper platform. SLOs are target values or ranges for service level indicators (SLIs) that represent our reliability commitments to users.

**Purpose:**
- Set clear reliability expectations for the service
- Guide engineering priorities and trade-offs
- Provide measurable targets for operational excellence
- Enable data-driven decision making about incidents and changes

**Review Schedule:** Quarterly (or after major incidents)

## SLO Definitions

### 1. Availability SLO

**Target:** 99.5% uptime over a 30-day rolling window

**Definition:**
- Availability is measured as the percentage of successful requests (HTTP 2xx and 3xx) vs total requests
- Excludes planned maintenance windows (with 48-hour notice)
- Excludes client errors (HTTP 4xx)

**Measurement:**
```promql
# Availability calculation
(
  sum(rate(http_requests_total{status=~"2..|3.."}[30d]))
  /
  sum(rate(http_requests_total[30d]))
) * 100
```

**What this means:**
- Maximum allowed downtime: ~3.6 hours per month
- Service should respond successfully to 99.5% of requests
- Applies to all public API endpoints

**Alert Thresholds:**
- **Critical:** Availability drops below 99.5% over 5-minute window
- **Warning:** Trending toward SLO breach (98% over 30-minute window)

### 2. Latency SLOs

**Targets:**

| Endpoint Type | P50 Target | P95 Target | P99 Target |
|---------------|-----------|-----------|-----------|
| List endpoints (e.g., /api/v1/clips, /feed) | < 50ms | < 100ms | < 200ms |
| Detail endpoints (e.g., /api/v1/clips/:id) | < 25ms | < 50ms | < 100ms |
| Search endpoints | < 100ms | < 200ms | < 500ms |
| Mutation endpoints (POST/PUT/DELETE) | < 100ms | < 250ms | < 500ms |

**Definition:**
- Latency is measured as server-side response time from request received to response sent
- Excludes network transit time
- Measured at the 95th percentile (P95) as primary indicator
- P99 tracked for visibility into tail latency

**Measurement:**
```promql
# P95 latency for list endpoints
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{path=~"/api/v1/(clips|feed|lists).*"}[5m])) by (le)
)
```

**What this means:**
- 95% of list endpoint requests complete in under 100ms
- 95% of detail endpoint requests complete in under 50ms
- Fast, responsive user experience for most requests

**Alert Thresholds:**
- **Critical:** P95 latency exceeds target by 2x for 5 minutes
- **Warning:** P95 latency exceeds target for 5 minutes

### 3. Error Rate SLO

**Target:** < 0.5% error rate over a 5-minute rolling window

**Definition:**
- Error rate is the percentage of requests returning HTTP 5xx status codes
- Includes: 500, 502, 503, 504 errors
- Excludes: Client errors (4xx), expected errors (e.g., 404 for non-existent resources)

**Measurement:**
```promql
# Error rate calculation
(
  sum(rate(http_requests_total{status=~"5.."}[5m]))
  /
  sum(rate(http_requests_total[5m]))
) * 100
```

**What this means:**
- Less than 1 in 200 requests should fail due to server errors
- Application should handle expected errors gracefully
- Infrastructure should be reliable and fault-tolerant

**Alert Thresholds:**
- **Critical:** Error rate > 0.5% for 5 minutes
- **Warning:** Error rate > 0.1% for 10 minutes

### 4. Search Performance SLO

**Targets:**
- **Hybrid Search P95 Latency:** < 200ms
- **Embedding Generation Success Rate:** > 99%
- **Embedding Coverage:** > 90% of clips indexed
- **Zero Result Rate:** < 10% of searches

**Definition:**
- Search latency measured from query received to results returned
- Embedding generation success rate tracks AI model reliability
- Coverage ensures semantic search quality
- Zero result rate indicates search effectiveness

**Measurement:**
```promql
# Search P95 latency
histogram_quantile(0.95,
  sum(rate(search_query_duration_ms_bucket{search_type="hybrid"}[5m])) by (le)
)

# Embedding coverage
clips_with_embeddings / (clips_with_embeddings + clips_without_embeddings) * 100
```

**Alert Thresholds:**
- **Critical:** P95 latency > 500ms for 3 minutes
- **Warning:** P95 latency > 200ms for 5 minutes
- **Critical:** Embedding generation failing (> 0.1 errors/sec)
- **Warning:** Coverage < 90% for 30 minutes

### 5. Webhook Delivery SLO

**Targets:**
- **Delivery Success Rate:** > 90% (first attempt)
- **Ultimate Success Rate (with retries):** > 95%
- **P95 Delivery Latency:** < 5 seconds
- **Retry Queue Size:** < 100 items

**Definition:**
- Success rate measures percentage of webhooks delivered successfully
- Includes retry mechanism (up to 5 attempts with exponential backoff)
- Latency measures time from event trigger to successful delivery
- Queue size indicates system health

**Measurement:**
```promql
# Delivery success rate (first attempt)
(
  sum(rate(webhook_delivery_total{status="success",attempt="1"}[5m]))
  /
  sum(rate(webhook_delivery_total{attempt="1"}[5m]))
) * 100

# P95 delivery latency
histogram_quantile(0.95,
  sum(rate(webhook_delivery_duration_seconds_bucket{status="success"}[5m])) by (le)
)
```

**Alert Thresholds:**
- **Critical:** Success rate < 50% for 5 minutes
- **Warning:** Success rate < 90% for 10 minutes
- **Warning:** Retry queue > 100 items for 15 minutes
- **Critical:** Retry queue > 500 items for 5 minutes

## Error Budget

### Availability Error Budget

Based on 99.5% availability SLO:

**Monthly Error Budget:**
- Total minutes in 30 days: 43,200 minutes (30 days × 24 hours × 60 minutes)
- Allowed downtime: 216 minutes (43,200 × 0.5% = 3.6 hours)
- Error budget: 0.5% of all requests can fail

**Example Calculation:**
- If handling 1M requests/day (30M/month)
- Error budget: 150,000 failed requests per month
- Budget per day: 5,000 failed requests

### Error Budget Burn Rate

**Fast Burn (Critical):**
- Consuming > 10% of monthly budget in 1 hour
- Requires immediate incident response
- Example: If normal error rate is 0.1%, spike to 2% for 1 hour

**Medium Burn (Warning):**
- Consuming > 25% of monthly budget in 6 hours
- Requires investigation and mitigation
- Example: Sustained 0.8% error rate over 6 hours

**Slow Burn (Monitor):**
- On track to exceed monthly budget if trend continues
- Review and address in next sprint
- Example: Consistently at 0.45% error rate

### Error Budget Policy

**When Error Budget is Healthy (> 50% remaining):**
- ✅ Proceed with feature releases
- ✅ Accept calculated risks for velocity
- ✅ Experiment with new features
- ✅ Schedule maintenance and migrations

**When Error Budget is Low (10-50% remaining):**
- ⚠️ Prioritize reliability over features
- ⚠️ Increase testing and validation
- ⚠️ Defer risky changes
- ⚠️ Focus on technical debt reduction

**When Error Budget is Exhausted (< 10% remaining):**
- 🚨 Feature freeze - only critical fixes
- 🚨 All hands on reliability improvements
- 🚨 Defer all non-critical releases
- 🚨 Root cause analysis for all incidents
- 🚨 Executive escalation and status updates

## Measurement and Monitoring

### Data Sources

**Prometheus Metrics:**
- `http_requests_total{status, method, path}` - Request count by status code
- `http_request_duration_seconds_bucket{method, path}` - Request latency histogram
- `search_query_duration_ms_bucket{search_type}` - Search latency
- `webhook_delivery_total{status, attempt}` - Webhook delivery metrics
- `embedding_generation_errors_total` - Embedding generation failures

**Log Analysis (Loki):**
- Error log rates and patterns
- Security events
- Application panics and crashes

**Database Metrics:**
- Connection pool utilization
- Query performance
- Transaction rates

### Calculation Windows

| SLO Type | Alerting Window | Reporting Window | Review Window |
|----------|----------------|------------------|---------------|
| Availability | 5 minutes | 30 days rolling | Monthly |
| Latency | 5 minutes | 7 days rolling | Weekly |
| Error Rate | 5 minutes | 24 hours rolling | Daily |
| Search | 5 minutes | 7 days rolling | Weekly |
| Webhooks | 5 minutes | 7 days rolling | Weekly |

### Dashboards

**Primary SLO Dashboard:** `monitoring/dashboards/slo-dashboard.json`
- Real-time SLO compliance status
- Error budget remaining
- Trend analysis and historical view
- Link to runbooks for each SLO

**Detailed Dashboards:**
- **Application Overview:** `app-overview.json` - High-level health
- **API Performance:** `api-performance.json` - Request and latency metrics
- **Search Quality:** `search-quality.json` - Search-specific SLOs
- **Webhook Monitoring:** `webhook-monitoring.json` - Webhook delivery health
- **System Health:** `system-health.json` - Infrastructure metrics

**Dashboard Access:**
- Grafana: http://localhost:3000 (development)
- Production: https://grafana.clipper.app (requires authentication)

## Alerting Strategy

### Alert Severity Levels

| Severity | Response Time | Description | Examples |
|----------|--------------|-------------|----------|
| **Critical (P1)** | < 15 minutes | SLO breach or imminent breach, user-facing impact | Availability < 99.5%, Error rate > 1%, Service down |
| **Warning (P2)** | < 1 hour | Trending toward SLO breach, potential impact | High error rate (0.1-0.5%), Elevated latency |
| **Info (P3)** | < 4 hours | No immediate impact, informational | Low cache hit rate, High log volume |

### Alert Channels

**Critical (P1) Alerts:**
1. **PagerDuty** - Immediate page to on-call engineer
2. **Slack #incidents** - Team-wide notification
3. **Email** - Backup notification
4. **SMS** - Escalation after 15 minutes

**Warning (P2) Alerts:**
1. **Slack #alerts** - Team channel notification
2. **Email** - Engineering team distribution list
3. **PagerDuty** - Low-urgency notification (no page)

**Info (P3) Alerts:**
1. **Slack #monitoring** - Informational channel
2. **Email digest** - Daily summary

### Escalation Policy

**P1 Critical Escalation:**
```
Level 1: On-call Engineer (0-15 min)
   ↓ (no acknowledgment after 15 min)
Level 2: On-call Lead (15-30 min)
   ↓ (no resolution after 30 min)
Level 3: Engineering Manager (30-45 min)
   ↓ (ongoing incident after 1 hour)
Level 4: VP Engineering + CTO (1+ hour)
```

**P2 Warning Escalation:**
```
Level 1: On-call Engineer (0-1 hour)
   ↓ (no acknowledgment after 1 hour)
Level 2: On-call Lead (1-2 hours)
   ↓ (no resolution after 4 hours)
Level 3: Engineering Manager
```

**Alert Configuration:**
- Prometheus: `monitoring/prometheus.yml`
- Alert Rules: `monitoring/alerts.yml`
- Alertmanager: `monitoring/alertmanager.yml`
- Routing: See [Alert Routing Configuration](#alert-routing-configuration)

## SLO Breach Response

### Critical (P1) Response

**Immediate Actions (0-15 minutes):**
1. **Acknowledge** alert in PagerDuty
2. **Assess** impact scope (which SLO, how many users)
3. **Communicate** in #incidents channel
4. **Investigate** using runbook (see below)
5. **Mitigate** if quick fix available (rollback, scale up)

**Runbooks:**
- Availability breach: `docs/operations/playbooks/availability-incident.md`
- High error rate: `docs/operations/playbooks/error-rate-incident.md`
- High latency: `docs/operations/playbooks/latency-incident.md`
- Search failures: `docs/operations/playbooks/search-incidents.md`

**Post-Incident (24-72 hours):**
1. Write incident report
2. Update error budget tracking
3. Schedule post-mortem
4. Identify action items
5. Update runbooks with learnings

### Warning (P2) Response

**Actions (0-1 hour):**
1. **Acknowledge** alert in Slack
2. **Review** metrics and trends
3. **Investigate** potential causes
4. **Document** findings
5. **Plan** remediation if needed

**Follow-up:**
- Add to sprint backlog if technical debt
- Update monitoring if false positive
- Adjust thresholds if needed

### Info (P3) Response

**Actions (0-4 hours):**
1. **Review** during daily standup or ops review
2. **Analyze** trends over time
3. **Optimize** if efficiency gains possible
4. **Ignore** if expected behavior

## Review and Iteration

**Weekly Review:**
- Review SLO compliance trends
- Analyze error budget consumption
- Identify areas for improvement
- Update runbooks based on incidents

**Monthly Review:**
- Comprehensive SLO compliance report
- Error budget analysis and trends
- SLO target adjustment if needed
- Dashboard and alert refinement

**Quarterly Review:**
- Full SLO review and update
- Compare against business objectives
- Adjust targets based on growth and capabilities
- Stakeholder communication

**Key Metrics to Track:**
- SLO compliance percentage
- Error budget burn rate
- Alert frequency and accuracy
- Mean time to detect (MTTD)
- Mean time to resolve (MTTR)

## References

**Internal Documentation:**
- [Monitoring Stack Setup](../monitoring/README.md)
- [Alert Rules Configuration](../../monitoring/alerts.yml)
- [Operations Runbook](./runbook.md)
- [SLO Breach Response Playbook](./playbooks/slo-breach-response.md)
- [Incident Response Guide](./incident-response.md)

**External Resources:**
- [Google SRE Book - Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)
- [Implementing SLOs](https://sre.google/workbook/implementing-slos/)
- [The Art of SLOs](https://sre.google/resources/practices-and-processes/art-of-slos/)
- [Error Budgets](https://sre.google/sre-book/embracing-risk/)

**Monitoring Tools:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000
- Alertmanager: http://localhost:9093
