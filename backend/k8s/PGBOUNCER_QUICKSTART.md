# PgBouncer Deployment Quick Start Guide

This guide provides step-by-step instructions to deploy PgBouncer connection pooler to the Clipper Kubernetes cluster.

## Prerequisites

- Kubernetes cluster with PostgreSQL deployed
- kubectl configured and authenticated
- Prometheus and Grafana for monitoring (optional but recommended)

## Deployment Steps

### 1. Prepare Secrets (Production)

In production, the PgBouncer secret should be managed via Vault or external secrets operator. For manual setup:

```bash
# Generate MD5 hash for the password
# Format: md5(password + username)
echo -n "your-password-hereclipper" | md5sum

# Create the secret with proper format
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: pgbouncer-secret
  labels:
    app: pgbouncer
type: Opaque
stringData:
  userlist.txt: |
    "clipper" "md5<hash-from-above>"
EOF
```

### 2. Deploy PgBouncer

```bash
cd /path/to/clipper/backend/k8s

# Apply ConfigMap
kubectl apply -f pgbouncer-configmap.yaml

# Apply Deployment, Service, and Secret
kubectl apply -f pgbouncer.yaml

# Apply PodDisruptionBudget
kubectl apply -f pdb-pgbouncer.yaml
```

### 3. Verify Deployment

```bash
# Check pods are running
kubectl get pods -l app=pgbouncer
# Expected: 2 pods in Running state

# Check service
kubectl get svc pgbouncer
# Expected: ClusterIP service on ports 6432 (pgbouncer) and 9127 (metrics)

# Check logs
kubectl logs -l app=pgbouncer -c pgbouncer --tail=20
kubectl logs -l app=pgbouncer -c pgbouncer-exporter --tail=20

# Verify metrics endpoint
kubectl port-forward svc/pgbouncer 9127:9127 &
curl http://localhost:9127/metrics | grep pgbouncer_pools
```

### 4. Test Database Connection

```bash
# Test connection through PgBouncer
kubectl run -it --rm test-pgbouncer --image=postgres:17 -- \
  psql -h pgbouncer -p 6432 -U clipper -d clipper_db -c "SELECT version();"

# Should successfully connect and return PostgreSQL version
```

### 5. Update Backend Configuration

Edit the backend ConfigMap to use PgBouncer:

```bash
kubectl edit configmap backend-config

# Change these values:
#   DB_HOST: "pgbouncer"  # was "postgres"
#   DB_PORT: "6432"       # was "5432"

# Save and exit
```

### 6. Restart Backend

```bash
# Perform rolling restart
kubectl rollout restart deployment/clipper-backend

# Watch the rollout
kubectl rollout status deployment/clipper-backend

# Verify pods are healthy
kubectl get pods -l app=clipper-backend
```

### 7. Verify Backend Connectivity

```bash
# Check backend logs for database connections
kubectl logs -l app=clipper-backend --tail=50 | grep -i "database\|postgres\|connection"

# Test health endpoint
curl https://clpr.tv/health/ready
# Should return: {"status":"healthy"}

# Check database connection pool stats
curl https://clpr.tv/health/stats
```

### 8. Configure Monitoring

#### Prometheus

If using static configuration, update Prometheus:

```bash
# Edit Prometheus ConfigMap
kubectl edit configmap prometheus-config -n clipper-monitoring

# Add to scrape_configs:
#   - job_name: 'pgbouncer'
#     static_configs:
#       - targets: ['pgbouncer.default.svc:9127']
#     scrape_interval: 10s

# Reload Prometheus
kubectl exec -n clipper-monitoring deployment/prometheus -- \
  kill -HUP 1
```

Verify in Prometheus UI → Status → Targets → pgbouncer should be UP.

#### Grafana

Import the PgBouncer dashboard:

```bash
# Option 1: Via Grafana UI
# 1. Go to Dashboards → Import
# 2. Upload monitoring/dashboards/pgbouncer-pool.json
# 3. Select Prometheus data source
# 4. Click Import

# Option 2: Via ConfigMap (if using provisioning)
kubectl create configmap grafana-dashboard-pgbouncer \
  --from-file=monitoring/dashboards/pgbouncer-pool.json \
  -n clipper-monitoring

# Add to Grafana provisioning configuration
```

### 9. Run Load Test Validation

```bash
cd backend/tests/load

# Run validation script (requires k6 installed)
./validate_pgbouncer.sh

# Expected output:
# ✓ ALL CHECKS PASSED
# PgBouncer is properly configured and handles load without connection exhaustion.
```

## Verification Checklist

- [ ] PgBouncer pods running (2 replicas)
- [ ] PgBouncer service accessible (ports 6432, 9127)
- [ ] Metrics endpoint returning data
- [ ] Backend connected to PgBouncer (check logs)
- [ ] Health endpoint returning healthy
- [ ] Prometheus scraping PgBouncer metrics
- [ ] Grafana dashboard showing pool metrics
- [ ] Load test passes without connection exhaustion
- [ ] Alerts configured in Prometheus

## Monitoring

Once deployed, monitor the following in Grafana:

1. **Active Connections**: Should scale with backend load
2. **Pool Utilization**: Should stay < 80% under normal load
3. **Waiting Clients**: Should be 0 under normal load
4. **Connection Errors**: Should be 0

## Rollback

If issues occur, see [PGBOUNCER.md](PGBOUNCER.md#rollback-procedure) for detailed rollback steps.

Quick rollback:

```bash
# Revert backend to direct PostgreSQL
kubectl edit configmap backend-config
# Change: DB_HOST: "postgres", DB_PORT: "5432"

kubectl rollout restart deployment/clipper-backend

# Optional: Remove PgBouncer
kubectl delete -f backend/k8s/pgbouncer.yaml
kubectl delete -f backend/k8s/pdb-pgbouncer.yaml
```

## Troubleshooting

### Pod Not Starting

```bash
kubectl describe pod -l app=pgbouncer
kubectl logs -l app=pgbouncer -c pgbouncer
```

Common issues:
- Secret not found or malformed
- ConfigMap not applied
- Resource constraints

### Connection Refused

```bash
# Check service
kubectl get svc pgbouncer
kubectl describe svc pgbouncer

# Test from another pod
kubectl run -it --rm test-conn --image=postgres:17 -- \
  psql -h pgbouncer -p 6432 -U clipper -d clipper_db
```

### Authentication Failed

```bash
# Verify secret format
kubectl get secret pgbouncer-secret -o yaml

# Check PgBouncer logs
kubectl logs -l app=pgbouncer -c pgbouncer | grep -i auth
```

The userlist.txt format must be: `"username" "md5<hash>"`

### High Wait Times

```bash
# Check pool stats
kubectl port-forward svc/pgbouncer 9127:9127
curl -s http://localhost:9127/metrics | grep -E 'cl_waiting|sv_active'

# Increase pool size if needed
kubectl edit configmap pgbouncer-config
# Update: default_pool_size and max_db_connections
kubectl rollout restart deployment/pgbouncer
```

## Next Steps

- Review [PGBOUNCER.md](PGBOUNCER.md) for comprehensive documentation
- Set up alerting rules (already in monitoring/alerts.yml)
- Tune pool sizes based on production load
- Schedule regular load testing
- Document any custom configuration changes

## Support

- Full documentation: [PGBOUNCER.md](PGBOUNCER.md)
- Load test validation: `backend/tests/load/validate_pgbouncer.sh`
- Dashboard: `monitoring/dashboards/pgbouncer-pool.json`
- Alerts: `monitoring/alerts.yml` (pgbouncer_alerts group)
