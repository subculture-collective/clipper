<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Operations: Runbook](#operations-runbook)
  - [Common Tasks](#common-tasks)
    - [Check Service Health](#check-service-health)
    - [Database Operations](#database-operations)
    - [Search Operations](#search-operations)
    - [Cache Operations](#cache-operations)
    - [Scaling](#scaling)
    - [Deployments](#deployments)
    - [Database Backups](#database-backups)
  - [Incident Scenarios](#incident-scenarios)
    - [High Error Rate](#high-error-rate)
    - [High Latency](#high-latency)
    - [Database Connection Exhaustion](#database-connection-exhaustion)
    - [OpenSearch Cluster Red](#opensearch-cluster-red)
    - [Out of Disk Space](#out-of-disk-space)
  - [Maintenance Windows](#maintenance-windows)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Operations Runbook"
summary: "Operational procedures and commands for managing Clipper in production."
tags: ["operations", "runbook", "ops"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["runbook", "ops procedures"]
---

# Operations: Runbook

Operational procedures and commands for managing Clipper in production.

## Common Tasks

### Check Service Health

```bash
# All services
kubectl get pods -n clipper

# Specific service
kubectl describe pod backend-xyz -n clipper

# Logs
kubectl logs -f deployment/backend -n clipper
```

### Database Operations

```bash
# Connect to database
psql $POSTGRES_URL

# Check connection count
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Kill long-running query
psql -c "SELECT pg_terminate_backend(PID);"

# Run migrations
kubectl exec -it backend-pod -- make migrate-up
```

### Search Operations

```bash
# Cluster health
curl https://opensearch.clipper.app/_cluster/health

# Reindex from PostgreSQL
kubectl exec -it backend-pod -- go run cmd/backfill-search/main.go

# Force refresh
curl -X POST https://opensearch.clipper.app/_refresh
```

### Cache Operations

```bash
# Connect to Redis
kubectl exec -it redis-pod -- redis-cli

# Clear cache
redis-cli FLUSHDB

# Check memory usage
redis-cli INFO memory
```

### Scaling

```bash
# Scale backend pods
kubectl scale deployment backend --replicas=5 -n clipper

# Horizontal Pod Autoscaler
kubectl autoscale deployment backend --cpu-percent=70 --min=3 --max=10 -n clipper
```

### Deployments

```bash
# Deploy new version
kubectl set image deployment/backend backend=clipper:v1.2.3 -n clipper

# Check rollout status
kubectl rollout status deployment/backend -n clipper

# Rollback
kubectl rollout undo deployment/backend -n clipper
```

### Database Backups

```bash
# Manual backup
pg_dump $POSTGRES_URL > backup_$(date +%Y%m%d).sql

# Restore
psql $POSTGRES_URL < backup_20251130.sql
```

## Incident Scenarios

### High Error Rate

1. Check logs: `kubectl logs -f deployment/backend`
2. Check metrics: Grafana dashboard
3. Recent deploy? Rollback: `kubectl rollout undo`
4. Database issue? Check connections, slow queries
5. External API down? Enable circuit breaker

### High Latency

1. Check p95/p99 metrics
2. Database slow? Check `pg_stat_statements`
3. Cache cold? Warm up or increase TTL
4. Scale up: `kubectl scale deployment backend --replicas=N`

### Database Connection Exhaustion

1. Check active connections
2. Kill idle/long-running queries
3. Increase connection pool size (restart required)
4. Add read replicas if read-heavy

### OpenSearch Cluster Red

1. Check cluster health
2. Identify problematic indices
3. Delete/recreate if needed
4. Reindex from PostgreSQL

### Out of Disk Space

1. Check disk usage: `df -h`
2. Clear old logs, backups
3. Increase volume size (cloud provider)
4. Add log rotation policy

## Maintenance Windows

Planned maintenance:
1. Announce in advance (status page, email)
2. Enable maintenance mode (static page)
3. Run migrations, upgrades
4. Test thoroughly
5. Re-enable traffic
6. Monitor for 30 minutes

---

Related: [[monitoring|Monitoring]] · [[infra|Infrastructure]] · [[deployment|Deployment]]

[[../index|← Back to Index]]
