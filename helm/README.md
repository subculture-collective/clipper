# Clipper Helm Charts

This directory contains Helm charts for deploying the Clipper platform to Kubernetes.

## Charts

- **clipper** - Umbrella chart that deploys the complete Clipper stack
- **clipper-backend** - Backend API service
- **clipper-frontend** - Frontend web application
- **clipper-postgres** - PostgreSQL database with pgvector
- **clipper-redis** - Redis cache and session store

## Quick Start

### Prerequisites

- Kubernetes cluster (1.28+)
- Helm 3.12+
- kubectl configured to access your cluster
- cert-manager installed (for TLS certificates)
- ingress-nginx controller installed

### Install the Complete Stack

```bash
# Add the Helm repository (if publishing to a registry)
# helm repo add clipper https://charts.clpr.tv
# helm repo update

# Install from local charts
cd helm/charts
helm install clipper ./clipper -n clipper-production --create-namespace
```

### Install Individual Components

```bash
# Install only the backend
helm install clipper-backend ./clipper-backend -n clipper-production --create-namespace

# Install only the database
helm install postgres ./clipper-postgres -n clipper-production
```

## Configuration

### Using Custom Values

```bash
# Production deployment
helm install clipper ./clipper \
  -n clipper-production \
  --create-namespace \
  -f ./clipper/examples/values-production.yaml

# Staging deployment
helm install clipper ./clipper \
  -n clipper-staging \
  --create-namespace \
  -f ./clipper/examples/values-staging.yaml
```

### Override Specific Values

```bash
helm install clipper ./clipper \
  --set backend.replicaCount=5 \
  --set postgres.persistence.size=50Gi \
  --set global.domain=example.com
```

## Upgrading

### Rolling Update

```bash
# Update backend image
helm upgrade clipper ./clipper \
  -n clipper-production \
  --set clipper-backend.image.tag=v1.2.3 \
  --reuse-values
```

### Upgrade Strategy

All deployments are configured with:
- Rolling update strategy
- Pod disruption budgets to ensure availability
- Health checks (liveness and readiness probes)
- Graceful termination periods

Example upgrade process:
```bash
# Check current status
helm list -n clipper-production
kubectl get pods -n clipper-production

# Perform upgrade
helm upgrade clipper ./clipper -n clipper-production -f values-production.yaml

# Monitor rollout
kubectl rollout status deployment/clipper-backend -n clipper-production
kubectl rollout status deployment/clipper-frontend -n clipper-production

# Check new pods
kubectl get pods -n clipper-production -w
```

## Rollback

### Automatic Rollback

Helm tracks release history. If an upgrade fails, you can rollback:

```bash
# View release history
helm history clipper -n clipper-production

# Rollback to previous version
helm rollback clipper -n clipper-production

# Rollback to specific revision
helm rollback clipper 3 -n clipper-production
```

### Manual Rollback

```bash
# Rollback deployment using kubectl
kubectl rollout undo deployment/clipper-backend -n clipper-production

# Rollback to specific revision
kubectl rollout undo deployment/clipper-backend --to-revision=2 -n clipper-production
```

## Horizontal Pod Autoscaling (HPA)

HPA is enabled by default for backend and frontend services:

```bash
# Check HPA status
kubectl get hpa -n clipper-production

# View HPA details
kubectl describe hpa clipper-backend -n clipper-production

# Scale manually (HPA will override if enabled)
kubectl scale deployment clipper-backend --replicas=5 -n clipper-production
```

### HPA Configuration

Backend HPA:
- Min replicas: 2 (production: 3)
- Max replicas: 10 (production: 20)
- Target CPU: 70%
- Target Memory: 80%
- Scale up policy: Fast (100% or 2 pods per 30s)
- Scale down policy: Gradual (50% per 60s with 5min stabilization)

Frontend HPA:
- Min replicas: 2
- Max replicas: 10
- Target CPU: 70%
- Target Memory: 80%

## Resource Requests and Limits

### Backend
```yaml
resources:
  requests:
    cpu: 100m      # Production: 250m
    memory: 256Mi  # Production: 512Mi
  limits:
    cpu: 500m      # Production: 1000m
    memory: 512Mi  # Production: 1Gi
```

### Frontend
```yaml
resources:
  requests:
    cpu: 50m
    memory: 64Mi
  limits:
    cpu: 200m
    memory: 256Mi
```

### PostgreSQL
```yaml
resources:
  requests:
    cpu: 250m
    memory: 512Mi
  limits:
    cpu: 1000m
    memory: 2Gi
```

### Redis
```yaml
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi
```

## Health Checks

All services include liveness and readiness probes:

### Backend
- Readiness: `/health/ready` - Checks if service is ready to accept traffic
- Liveness: `/health/live` - Checks if service is running

### Frontend
- Readiness: `/health.html` - Checks if static files are accessible
- Liveness: `/health.html` - Checks if web server is running

### PostgreSQL
- Readiness: `pg_isready` - Checks if database accepts connections
- Liveness: `pg_isready` - Checks if database process is running

### Redis
- Readiness: `redis-cli ping` - Checks if Redis responds
- Liveness: `redis-cli ping` - Checks if Redis process is running

## Network Policies

Network policies are enabled for backend service to restrict traffic:

- **Ingress**: Only from ingress-nginx namespace
- **Egress**:
  - PostgreSQL (port 5432)
  - Redis (port 6379)
  - OpenSearch (port 9200)
  - HTTPS (port 443) for external APIs

## Secrets Management

Secrets should be managed externally using:
- Kubernetes External Secrets Operator
- Sealed Secrets
- HashiCorp Vault
- Cloud provider secret managers (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault)

Example using External Secrets Operator:
```yaml
secrets:
  existingSecret: "backend-secrets"
```

The charts expect these secret keys:
- Backend: `DB_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`, etc.
- PostgreSQL: `POSTGRES_PASSWORD`
- Redis: `REDIS_PASSWORD`

**IMPORTANT**: Always create secrets before deploying the charts. The charts will fail if the referenced secrets don't exist.

### Grafana Admin Password

The monitoring chart includes a default password for Grafana. **YOU MUST OVERRIDE THIS IN PRODUCTION**:

```bash
# Option 1: Set password during install
helm install clipper ./clipper \
  --set grafana.adminPassword='secure-random-password'

# Option 2: Use external secret
helm install clipper ./clipper \
  --set grafana.adminPassword='' \
  --set grafana.admin.existingSecret='grafana-admin-secret'
```

## Monitoring

### Prometheus Metrics

Backend exposes metrics at `/debug/metrics`:
```yaml
# Add annotations for Prometheus scraping
podAnnotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "8080"
  prometheus.io/path: "/debug/metrics"
```

### Grafana Dashboards

Import dashboards from `monitoring/dashboards/` for:
- Application metrics
- Resource usage
- Database performance
- Redis cache hit rates

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n clipper-production
kubectl describe pod <pod-name> -n clipper-production
kubectl logs <pod-name> -n clipper-production
```

### Check Service Endpoints
```bash
kubectl get svc -n clipper-production
kubectl get endpoints -n clipper-production
```

### Check Ingress
```bash
kubectl get ingress -n clipper-production
kubectl describe ingress clipper-backend -n clipper-production
```

### Check Certificates
```bash
kubectl get certificate -n clipper-production
kubectl describe certificate clipper-tls -n clipper-production
```

### Check HPA
```bash
kubectl get hpa -n clipper-production
kubectl describe hpa clipper-backend -n clipper-production
```

### Check PVC
```bash
kubectl get pvc -n clipper-production
kubectl describe pvc postgres-pvc -n clipper-production
```

## Uninstall

```bash
# Uninstall release (keeps PVCs)
helm uninstall clipper -n clipper-production

# Delete PVCs (WARNING: This deletes data)
kubectl delete pvc --all -n clipper-production

# Delete namespace
kubectl delete namespace clipper-production
```

## Chart Development

### Linting
```bash
helm lint ./clipper
helm lint ./clipper-backend
helm lint ./clipper-frontend
helm lint ./clipper-postgres
helm lint ./clipper-redis
```

### Template Rendering
```bash
# Render templates without installing
helm template clipper ./clipper -f values.yaml

# Render specific chart
helm template backend ./clipper-backend -f backend/values.yaml
```

### Packaging
```bash
# Package charts
helm package ./clipper-backend
helm package ./clipper-frontend
helm package ./clipper-postgres
helm package ./clipper-redis
helm package ./clipper

# Update dependencies
cd clipper
helm dependency update
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines on contributing to these charts.

## License

See [LICENSE](../../LICENSE) for license information.
