# Kubernetes Deployment Guide

## Prerequisites Installed ✅

- kubectl v1.34.2
- k3s v1.33.6 (Kubernetes cluster)
- nginx-ingress-controller
- cert-manager v1.16.2

## Infrastructure Deployed ✅

### Database Layer
- **Postgres**: StatefulSet with 20Gi persistent storage
- **PgBouncer**: Connection pooler (2 replicas, transaction mode, min 10 / max 50 connections)
- **Redis**: StatefulSet with 5Gi persistent storage
- **OpenSearch**: StatefulSet with 10Gi persistent storage

### Application Layer
- **Backend Deployment**: 2-10 replicas with HPA
- **Service**: ClusterIP exposing port 80
- **Ingress**: TLS-enabled with Let's Encrypt (clpr.tv)
- **PodDisruptionBudget**: Ensures ≥1 pod during disruptions
- **NetworkPolicy**: Restricts traffic to required services only

## Build and Deploy Backend

### Option 1: Quick Deploy Script
```bash
./scripts/deploy-k8s.sh
```

### Option 2: Manual Steps

1. **Build the Docker image:**
```bash
cd backend
docker build -t clipper-backend:latest .
```

2. **Import image to k3s:**
```bash
docker save clipper-backend:latest | sudo k3s ctr images import -
```

3. **Secrets**: Managed via Vault injection / external secret management. No in-repo secret manifests are applied.

4. **Restart backend deployment:**
```bash
kubectl rollout restart deployment/clipper-backend
kubectl rollout status deployment/clipper-backend
```

## Verify Deployment

```bash
# Check all pods are running
kubectl get pods

# Check services
kubectl get svc

# Check ingress and certificate
kubectl get ingress
kubectl get certificate

# View backend logs
kubectl logs -f deployment/clipper-backend

# Check database connectivity
kubectl exec -it postgres-0 -- psql -U clipper -d clipper_db -c "SELECT version();"
kubectl exec -it redis-0 -- redis-cli ping
kubectl exec -it opensearch-0 -- curl localhost:9200/_cluster/health
```

## Access Application

- **Backend API**: https://clpr.tv/api
- **Health Check**: https://clpr.tv/health/ready

## Scale Application

```bash
# Manual scaling
kubectl scale deployment clipper-backend --replicas=5

# HPA will automatically scale between 2-10 based on CPU/memory
kubectl get hpa
```

## Update Configuration & Secrets

```bash
# Update ConfigMap
kubectl edit configmap backend-config
kubectl rollout restart deployment/clipper-backend

# Secrets are rotated and injected by Vault; edit Vault policies/templates instead of Kubernetes Secret manifests.
kubectl rollout restart deployment/clipper-backend
```

## Database Migrations

```bash
# Run migrations from a pod
kubectl exec -it deployment/clipper-backend -- /app/api migrate up

# Or run as a Job (create migration-job.yaml):
kubectl apply -f backend/k8s/migration-job.yaml
```

## Troubleshooting

```bash
# Pod not starting
kubectl describe pod <pod-name>
kubectl logs <pod-name>

# Network issues
kubectl get networkpolicies
kubectl describe networkpolicy clipper-backend

# Certificate not issuing
kubectl get certificaterequest
kubectl describe certificate clipper-tls
kubectl logs -n cert-manager deployment/cert-manager

# Ingress not working
kubectl describe ingress clipper-backend
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

## Cleanup

```bash
# Delete all resources
kubectl delete -f backend/k8s/

# Uninstall k3s
/usr/local/bin/k3s-uninstall.sh
```

## Production Checklist

- [ ] Verify Vault agent renders backend.env
- [ ] Update email in `backend/k8s/cert-issuer.yaml` (currently admin@clpr.tv)
- [ ] Configure DNS A record: clpr.tv → VPS IP
- [ ] Verify TLS certificate issued: `kubectl get certificate`
- [ ] Run database migrations
- [ ] Deploy PgBouncer connection pooler (see [PGBOUNCER.md](PGBOUNCER.md))
- [ ] Update backend ConfigMap to use PgBouncer (DB_HOST: pgbouncer, DB_PORT: 6432)
- [ ] Test health endpoint: `curl https://clpr.tv/health/ready`
- [ ] Verify PgBouncer metrics in Grafana dashboard
- [ ] Set up backup solution for PVCs
- [ ] Configure monitoring (Prometheus/Grafana)
- [ ] Set up log aggregation (Loki/ELK)

## Database Connection Pooling

The application uses PgBouncer for efficient database connection pooling. See [PGBOUNCER.md](PGBOUNCER.md) for:
- Deployment instructions
- Configuration details and tuning
- Monitoring and alerting
- Rollback procedures
- Troubleshooting guide

## Maintenance

### Backup Databases
```bash
# Postgres
kubectl exec postgres-0 -- pg_dump -U clipper clipper_db > backup.sql

# Redis
kubectl exec redis-0 -- redis-cli --rdb /data/dump.rdb
kubectl cp redis-0:/data/dump.rdb ./redis-backup.rdb
```

### Restore Databases
```bash
# Postgres
kubectl exec -i postgres-0 -- psql -U clipper -d clipper_db < backup.sql

# Redis
kubectl cp ./redis-backup.rdb redis-0:/data/dump.rdb
kubectl exec redis-0 -- redis-cli shutdown nosave
kubectl delete pod redis-0  # Will restart automatically
```
