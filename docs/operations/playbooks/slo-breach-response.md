---
title: "SLO Breach Response Playbook"
summary: "Step-by-step response procedures for SLO breaches and service degradation"
tags: ["incident", "slo", "runbook", "operations"]
area: "operations"
status: "active"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-21
aliases: ["slo incident", "breach response"]
---

# SLO Breach Response Playbook

## Overview

This playbook provides step-by-step procedures for responding to SLO (Service Level Objective) breaches. Follow these procedures when receiving alerts about service degradation or SLO violations.

**Target Audience:** On-call engineers, incident responders, operations team

**Prerequisites:**
- Access to monitoring dashboards (Grafana)
- Access to production systems (kubectl, database)
- PagerDuty access for alert management
- Slack access for communication

**Response Time Targets:**
- **Critical (P1):** Acknowledge within 15 minutes
- **Warning (P2):** Acknowledge within 1 hour
- **Info (P3):** Review within 4 hours

## Alert Acknowledgment

**When you receive an SLO breach alert:**

1. **Acknowledge the alert** in PagerDuty immediately
   - Prevents escalation to next on-call level
   - Shows team you're responding

2. **Join incident channel** (Slack #incidents)
   ```
   I'm responding to [Alert Name] - investigating now
   ```

3. **Open monitoring dashboards**
   - Primary SLO Dashboard: <http://localhost:3000/d/slo-dashboard>
   - Prometheus Alerts: <http://localhost:9090/alerts>
   - Relevant service dashboard based on alert

4. **Assess severity and impact**
   - How many users affected?
   - What functionality is impacted?
   - Is this a complete outage or degradation?

## Availability SLO Breach

**Alert:** `SLOAvailabilityBreach` - Service availability below 99.5%

### Detection

**Alert Criteria:**
```promql
(1 - (sum(rate(http_requests_total{status=~"2.."}[5m])) 
     / sum(rate(http_requests_total[5m])))) > 0.005
```

**What this means:** More than 0.5% of requests are failing

### Immediate Actions

1. **Check service status:**
   ```bash
   # Kubernetes deployments
   kubectl get pods -n clipper
   kubectl get deployments -n clipper
   
   # Docker compose (development)
   docker-compose ps
   ```

2. **Verify all components are running:**
   - Backend service
   - Database (PostgreSQL)
   - Cache (Redis)
   - Search (OpenSearch/Elasticsearch)
   - Load balancer/Nginx

3. **Check recent deployments:**
   ```bash
   # Last 5 deployments
   kubectl rollout history deployment/backend -n clipper
   
   # Current deployment status
   kubectl rollout status deployment/backend -n clipper
   ```

### Investigation Steps

1. **Check error logs (last 15 minutes):**
   ```bash
   # Grafana Loki query
   {service="clipper-backend", level="error"} [15m]
   
   # Or kubectl logs
   kubectl logs -l app=backend --tail=100 -n clipper
   ```

2. **Review Prometheus metrics:**
   - Error rate by endpoint: `rate(http_requests_total{status=~"5.."}[5m])`
   - Success rate trend: `rate(http_requests_total{status=~"2.."}[1h])`
   - Failed health checks: `up{job="clipper-backend"} == 0`

3. **Check dependencies:**
   ```bash
   # Database connectivity
   psql $POSTGRES_URL -c "SELECT 1"
   
   # Redis connectivity
   redis-cli PING
   
   # External API status (if applicable)
   curl -I https://api.external-service.com/health
   ```

4. **Review recent changes:**
   - Recent code deployments (within last hour)
   - Configuration changes
   - Infrastructure changes
   - Database migrations

### Mitigation Strategies

**Strategy 1: Rollback Recent Deployment**
```bash
# Identify previous working version
kubectl rollout history deployment/backend -n clipper

# Rollback to previous version
kubectl rollout undo deployment/backend -n clipper

# Verify rollback
kubectl rollout status deployment/backend -n clipper
```

**Strategy 2: Scale Up Resources**
```bash
# If resource exhaustion is the issue
kubectl scale deployment backend --replicas=5 -n clipper

# Verify scaling
kubectl get pods -n clipper -l app=backend
```

**Strategy 3: Restart Unhealthy Pods**
```bash
# Identify unhealthy pods
kubectl get pods -n clipper | grep -v Running

# Delete unhealthy pods (will auto-recreate)
kubectl delete pod <pod-name> -n clipper
```

**Strategy 4: Database Connection Pool Adjustment**

**⚠️ WARNING:** Terminating queries can cause data inconsistency or transaction failures. Use with extreme caution.

```bash
# If database connection exhaustion
# Check active connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Review long-running queries before terminating
psql -c "SELECT pid, usename, datname, state, query_start, 
         NOW() - query_start AS duration, 
         LEFT(query, 100) AS query_preview
         FROM pg_stat_activity 
         WHERE state = 'active' 
         AND query_start < NOW() - INTERVAL '5 minutes'
         AND datname = 'clipper'
         AND usename NOT IN ('postgres', 'replication')
         AND pid <> pg_backend_pid()
         ORDER BY query_start;"

# Only terminate after manual review and approval
# DO NOT run this automatically - review the query list first
# Consider these are legitimate operations: batch jobs, reports, migrations
# Terminating them may cause more harm than good

# To terminate a SPECIFIC problematic query (replace PID):
psql -c "SELECT pg_terminate_backend(12345);"  -- Replace 12345 with actual PID

# Alternative: Cancel query first (safer than terminate)
psql -c "SELECT pg_cancel_backend(12345);"  -- Replace 12345 with actual PID
```

**Before terminating any queries:**
1. Review the query text to understand what it's doing
2. Check if it's a critical batch job or migration
3. Consider if query is making forward progress
4. Try `pg_cancel_backend` first (safer than terminate)
5. Document which queries were terminated and why

**Strategy 5: Cache Clearing (if stale cache causing issues)**

**🚨 EXTREMELY DANGEROUS:** Flushing cache can make the incident worse, not better.

```bash
# ⚠️⚠️⚠️ WARNING: DO NOT run FLUSHDB in production without understanding the risks ⚠️⚠️⚠️
# 
# Risks of flushing cache:
# 1. Thundering herd: All requests hit the database simultaneously
# 2. Database overload: Can cause complete database failure
# 3. Service outage: May extend downtime instead of fixing it
# 4. Data loss: Session data, user state may be permanently lost
#
# ONLY flush cache if:
# - You've confirmed stale cache data is causing the issue
# - Database can handle the load spike
# - Application handles cache misses gracefully
# - All other mitigation strategies have failed
# - You have stakeholder approval

# Safer alternative: Delete specific problematic keys
redis-cli KEYS "problematic:pattern:*" | xargs redis-cli DEL

# Or flush specific key patterns
redis-cli --scan --pattern "session:*" | xargs redis-cli DEL

# Last resort: Flush entire database (requires approval)
# Document this action and notify team immediately
redis-cli FLUSHDB  # ⚠️ USE WITH EXTREME CAUTION

# After flushing:
# - Monitor database load immediately
# - Watch for cascading failures
# - Be prepared to scale database if needed
# - Document incident timeline
```

**Instead of flushing, consider:**
1. Restart application pods/containers (cache will rebuild gradually)
2. Scale up database connections temporarily
3. Increase cache TTL to reduce churn
4. Identify and fix specific bad cache keys

### Recovery Verification

1. **Monitor metrics return to normal:**
   - Availability > 99.5% sustained for 10 minutes
   - Error rate < 0.5%
   - No active alerts

2. **Verify user-facing functionality:**
   - Test critical user flows
   - Check frontend is accessible
   - Verify API responses

3. **Document actions taken:**
   - Update incident ticket with timeline
   - Note what worked/didn't work
   - Capture metrics screenshots

## Latency SLO Breach

**Alert:** `SLOLatencyBreach` - P95 latency exceeds target

### Detection

**Alert Criteria:**
```promql
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
) > 0.1  # For list endpoints
```

**What this means:** 95% of requests are taking longer than target

### Immediate Actions

1. **Identify slow endpoints:**
   ```promql
   # Top 10 slowest endpoints (P95)
   topk(10, 
     histogram_quantile(0.95,
       sum(rate(http_request_duration_seconds_bucket[5m])) by (path, le)
     )
   )
   ```

2. **Check system resources:**
   ```bash
   # CPU usage
   kubectl top nodes
   kubectl top pods -n clipper
   
   # Memory usage
   kubectl describe node <node-name> | grep -A 5 "Allocated resources"
   ```

3. **Check database performance:**
   ```sql
   -- Active queries
   SELECT pid, query_start, state, query 
   FROM pg_stat_activity 
   WHERE state = 'active' 
   ORDER BY query_start;
   
   -- Slow queries (> 1 second)
   SELECT * FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

### Investigation Steps

1. **Database query performance:**
   - Check for missing indexes
   - Identify N+1 queries
   - Look for table locks
   - Review query plans for slow queries

2. **Cache hit rates:**
   ```bash
   # Redis cache hit rate
   redis-cli INFO stats | grep keyspace
   ```

3. **External API latency:**
   - Check third-party service status pages
   - Review API response times in logs

4. **Search service performance:**
   - OpenSearch cluster health
   - Query performance metrics
   - Index size and shard status

### Mitigation Strategies

**Strategy 1: Add Database Indexes**
```sql
-- Identify missing indexes
-- Add indexes for frequently queried columns
CREATE INDEX CONCURRENTLY idx_clips_created_at ON clips(created_at);
```

**Strategy 2: Increase Cache TTL**
```go
// Increase cache duration for frequently accessed data
cache.Set(key, value, 1*time.Hour) // Increased from 15 minutes
```

**Strategy 3: Enable Query Result Caching**
- Review and enable caching for expensive queries
- Implement Redis caching for API responses

**Strategy 4: Scale Database Connections**
```bash
# Increase connection pool size
kubectl set env deployment/backend MAX_DB_CONNECTIONS=50 -n clipper
```

**Strategy 5: Optimize Slow Queries**
- Add LIMIT clauses where missing
- Optimize JOIN operations
- Add indexes for WHERE clauses
- Use pagination for large result sets

### Recovery Verification

1. **Latency returns to normal:**
   - P95 < target sustained for 10 minutes
   - P99 trends downward
   - No spikes in percentile charts

2. **Test affected endpoints:**
   ```bash
   # Measure response time
   time curl -I https://api.clipper.app/api/v1/clips
   ```

3. **Verify no performance regressions:**
   - Compare with baseline metrics
   - Check all endpoint categories

## Error Rate SLO Breach

**Alert:** `SLOErrorRateBreach` - Error rate exceeds 0.5%

### Detection

**Alert Criteria:**
```promql
(sum(rate(http_requests_total{status=~"5.."}[5m])) 
 / sum(rate(http_requests_total[5m]))) > 0.005
```

**What this means:** More than 0.5% of requests returning 5xx errors

### Immediate Actions

1. **Identify error patterns:**
   ```promql
   # Top endpoints with errors
   topk(10, 
     sum(rate(http_requests_total{status=~"5.."}[5m])) by (path, status)
   )
   ```

2. **Check error logs:**
   ```bash
   # Recent errors
   kubectl logs -l app=backend --tail=100 -n clipper | grep -i error
   
   # Grafana Loki
   {service="clipper-backend", level="error"} [10m]
   ```

3. **Identify error types:**
   - 500 Internal Server Error - Application crashes
   - 502 Bad Gateway - Backend unreachable
   - 503 Service Unavailable - Service overload
   - 504 Gateway Timeout - Slow backend

### Investigation Steps

1. **Review stack traces:**
   ```bash
   # Look for panic/crash logs
   {service="clipper-backend", message=~".*panic.*|.*fatal.*"} [15m]
   ```

2. **Check application panics:**
   - Memory leaks
   - Nil pointer dereferences
   - Unhandled errors

3. **Review recent code changes:**
   ```bash
   # Recent commits
   git log --oneline -10
   
   # Deployment history
   kubectl rollout history deployment/backend -n clipper
   ```

4. **Database errors:**
   ```sql
   -- Check for connection errors
   SELECT * FROM pg_stat_database;
   
   -- Check for deadlocks
   SELECT * FROM pg_stat_database_conflicts;
   ```

### Mitigation Strategies

**Strategy 1: Rollback Deployment**
```bash
# Rollback to previous stable version
kubectl rollout undo deployment/backend -n clipper
```

**Strategy 2: Fix Database Connection Issues**
```bash
# Restart database connections
kubectl rollout restart deployment/backend -n clipper

# Or increase connection pool
kubectl set env deployment/backend DB_POOL_SIZE=50 -n clipper
```

**Strategy 3: Handle Third-Party API Failures**
- Enable circuit breaker
- Add retry logic with backoff
- Use fallback responses

**Strategy 4: Fix Resource Exhaustion**
```bash
# Increase memory limits
kubectl set resources deployment backend --limits=memory=2Gi -n clipper

# Scale horizontally
kubectl scale deployment backend --replicas=3 -n clipper
```

**Strategy 5: Emergency Hotfix**
```bash
# Apply critical fix
git cherry-pick <fix-commit>
docker build -t clipper-backend:hotfix .
kubectl set image deployment/backend backend=clipper-backend:hotfix -n clipper
```

### Recovery Verification

1. **Error rate returns to normal:**
   - Error rate < 0.5%
   - No new errors in logs
   - Status code distribution normal

2. **Application stability:**
   - No panics or crashes
   - Stable memory usage
   - Healthy pods

## Search Performance SLO Breach

**Alert:** `SemanticSearchHighLatency` or `SemanticSearchCriticalLatency`

### Detection

**Alert Criteria:**
```promql
histogram_quantile(0.95, 
  sum(rate(search_query_duration_ms_bucket{search_type="hybrid"}[5m])) by (le)
) > 200  # Warning threshold
```

### Immediate Actions

1. **Check search service health:**
   ```bash
   # OpenSearch cluster health
   curl https://opensearch.clipper.app/_cluster/health
   
   # Search metrics
   curl https://opensearch.clipper.app/_stats
   ```

2. **Review search latency breakdown:**
   - BM25 candidate retrieval time
   - Vector re-ranking time
   - Embedding generation time

3. **Check embedding service:**
   ```promql
   # Embedding generation rate
   rate(embedding_generation_total[5m])
   
   # Embedding errors
   rate(embedding_generation_errors_total[5m])
   ```

### Investigation Steps

1. **Index health:**
   - Shard allocation
   - Index size and segment count
   - Memory usage

2. **Query complexity:**
   - Long queries
   - Complex filters
   - Large result sets

3. **Embedding cache performance:**
   ```promql
   # Cache hit rate
   rate(embedding_cache_hits_total[5m]) / 
   (rate(embedding_cache_hits_total[5m]) + rate(embedding_cache_misses_total[5m]))
   ```

### Mitigation Strategies

**Strategy 1: Clear and Rebuild Index**
```bash
# Force index refresh
curl -X POST https://opensearch.clipper.app/_refresh

# Optimize index
curl -X POST https://opensearch.clipper.app/_forcemerge
```

**Strategy 2: Scale Search Service**
```bash
kubectl scale deployment search --replicas=3 -n clipper
```

**Strategy 3: Adjust Search Parameters**
- Reduce candidate set size
- Lower re-ranking depth
- Adjust timeout values

**Strategy 4: Fallback to BM25 Only**
- Temporarily disable vector search
- Use text-only search during recovery

## Webhook Delivery SLO Breach

**Alert:** `HighWebhookFailureRate` or `CriticalWebhookFailureRate`

### Detection

**Alert Criteria:**
```promql
(sum(rate(webhook_delivery_total{status="failed"}[5m]))
 / sum(rate(webhook_delivery_total[5m]))) > 0.1
```

### Immediate Actions

1. **Check webhook queue:**
   ```promql
   webhook_retry_queue_size
   webhook_dead_letter_queue_size
   ```

2. **Identify failing subscriptions:**
   ```promql
   topk(10, 
     sum(rate(webhook_delivery_total{status="failed"}[5m])) by (subscription_id)
   )
   ```

3. **Check network connectivity:**
   ```bash
   # Test webhook endpoints
   curl -v https://customer-webhook-endpoint.com/webhook
   ```

### Investigation Steps

1. **Review failure reasons:**
   - Timeout errors
   - DNS resolution failures
   - SSL/TLS errors
   - HTTP error responses

2. **Check retry patterns:**
   - Are retries succeeding?
   - Is retry queue growing?

3. **Identify customer issues:**
   - Specific customer endpoints failing
   - Endpoint configuration issues

### Mitigation Strategies

**Strategy 1: Pause Problematic Subscriptions**
```sql
-- Temporarily disable failing subscription
UPDATE webhook_subscriptions 
SET enabled = false 
WHERE id = '<subscription_id>';
```

**Strategy 2: Adjust Retry Parameters**
- Increase retry intervals
- Reduce concurrent deliveries
- Add backpressure

**Strategy 3: Clear Dead Letter Queue**
```bash
# Review DLQ items
psql -c "SELECT * FROM webhook_dead_letter_queue LIMIT 10;"

# Archive old DLQ items
psql -c "DELETE FROM webhook_dead_letter_queue WHERE created_at < NOW() - INTERVAL '7 days';"
```

**Strategy 4: Scale Webhook Workers**
```bash
kubectl scale deployment webhook-worker --replicas=5 -n clipper
```

## Communication Templates

### Initial Incident Notification

**Slack #incidents:**
```
🚨 Incident: SLO Breach - [Availability/Latency/Error Rate]

Status: Investigating
Started: [Time]
Impact: [Description of user impact]
Responder: @[your-name]

Dashboard: [Link to Grafana]
PagerDuty: [Link to incident]

Updates will be posted every 15 minutes or when status changes.
```

### Status Update

**Every 15 minutes during P1:**
```
📊 Incident Update - [Time]

Current Status: [Investigating/Mitigating/Resolving]
Actions Taken:
- [Action 1]
- [Action 2]

Next Steps:
- [Next action]

Impact: [Unchanged/Improved/Worsened]
ETA: [Estimate if known]
```

### Resolution Notification

**When resolved:**
```
✅ Incident Resolved - [Time]

Duration: [Start time - End time]
Root Cause: [Brief description]
Resolution: [What fixed it]

Impact Summary:
- Users affected: [Number or percentage]
- Functionality: [What was impacted]

Next Steps:
- Post-mortem scheduled for [Date/Time]
- Action items: [Link or brief list]

Thanks to @[contributors] for rapid response!
```

## Post-Incident Actions

**Within 24 hours:**

1. **Update error budget tracking:**
   - Calculate error budget consumed
   - Update SLO compliance dashboard
   - Document in error budget log

2. **File incident report:**
   - Use incident template
   - Include timeline
   - Attach relevant screenshots
   - Link to metrics and logs

3. **Schedule post-mortem:**
   - Within 2-3 days of incident
   - Invite all responders and stakeholders
   - Use blameless post-mortem format

**Within 72 hours:**

4. **Conduct post-mortem:**
   - Review timeline
   - Identify root cause
   - Discuss what went well
   - Identify areas for improvement
   - Create action items

5. **Update runbooks:**
   - Add learnings to this playbook
   - Update related runbooks
   - Add new mitigation strategies

6. **Implement preventive measures:**
   - Add monitoring for early detection
   - Improve alerting accuracy
   - Fix root cause if possible
   - Add automated remediation

## Quick Reference Commands

**Check Service Health:**
```bash
kubectl get pods -n clipper
kubectl get deployments -n clipper
docker-compose ps
```

**View Logs:**
```bash
kubectl logs -l app=backend --tail=100 -n clipper
{service="clipper-backend", level="error"} [15m]  # Loki
```

**Rollback Deployment:**
```bash
kubectl rollout undo deployment/backend -n clipper
kubectl rollout status deployment/backend -n clipper
```

**Scale Service:**
```bash
kubectl scale deployment backend --replicas=5 -n clipper
```

**Database Quick Checks:**
```bash
psql $POSTGRES_URL -c "SELECT 1"
psql -c "SELECT count(*) FROM pg_stat_activity;"
```

**Redis Quick Checks:**
```bash
redis-cli PING
redis-cli INFO stats
redis-cli DBSIZE
```

**Restart Services:**
```bash
kubectl rollout restart deployment/backend -n clipper
docker-compose restart backend
```

---

**Remember:**
- Safety first - don't make it worse
- Communicate early and often
- Document everything you do
- Ask for help if stuck
- Learn from every incident
