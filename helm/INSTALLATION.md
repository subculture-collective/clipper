# Helm Charts Installation and Testing Guide

This guide provides step-by-step instructions for installing, testing, upgrading, and rolling back Clipper Helm charts.

## Prerequisites

### Required Tools
```bash
# Install Helm 3.12+
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version

# Verify kubectl is configured
kubectl version --client
kubectl cluster-info
```

### Required Cluster Components

1. **cert-manager** (for TLS certificates):
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

2. **ingress-nginx** (for routing):
```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace
```

3. **Storage Class** (for persistent volumes):
```bash
# For local development (k3s, kind, minikube)
kubectl get storageclass

# For cloud providers, ensure default storage class exists
```

## Installation

### 1. Quick Start - Complete Stack

Install all services with default values:

```bash
cd /path/to/clipper/helm/charts

# Install the umbrella chart
helm install clipper ./clipper \
  --namespace clipper-production \
  --create-namespace
```

### 2. Production Deployment

Install with production-optimized values:

```bash
# Create namespace
kubectl create namespace clipper-production

# Create secrets (replace with your actual secrets)
kubectl create secret generic backend-secrets \
  --namespace clipper-production \
  --from-literal=DB_PASSWORD='your-db-password' \
  --from-literal=REDIS_PASSWORD='your-redis-password' \
  --from-literal=JWT_SECRET='your-jwt-secret' \
  --from-literal=TWITCH_CLIENT_SECRET='your-twitch-secret' \
  --from-literal=STRIPE_SECRET_KEY='your-stripe-key'

kubectl create secret generic postgres-secret \
  --namespace clipper-production \
  --from-literal=POSTGRES_PASSWORD='your-db-password'

kubectl create secret generic redis-secret \
  --namespace clipper-production \
  --from-literal=REDIS_PASSWORD='your-redis-password'

# Install with production values
helm install clipper ./clipper \
  --namespace clipper-production \
  -f ./clipper/examples/values-production.yaml
```

### 3. Staging Deployment

```bash
# Create namespace
kubectl create namespace clipper-staging

# Create secrets (staging credentials)
kubectl create secret generic backend-secrets \
  --namespace clipper-staging \
  --from-literal=DB_PASSWORD='staging-db-password' \
  # ... other secrets

# Install with staging values
helm install clipper ./clipper \
  --namespace clipper-staging \
  -f ./clipper/examples/values-staging.yaml
```

### 4. Individual Component Installation

Install only specific components:

```bash
# Backend only
helm install backend ./clipper-backend \
  --namespace clipper-production \
  --set image.tag=v1.0.0

# Database only
helm install postgres ./clipper-postgres \
  --namespace clipper-production \
  --set persistence.size=100Gi

# Frontend only
helm install frontend ./clipper-frontend \
  --namespace clipper-production
```

## Verification

### 1. Check Installation Status

```bash
# List releases
helm list -n clipper-production

# Check release status
helm status clipper -n clipper-production

# View all resources
kubectl get all -n clipper-production
```

### 2. Verify Pods are Running

```bash
# Check pod status
kubectl get pods -n clipper-production

# Expected output:
# NAME                                READY   STATUS    RESTARTS   AGE
# clipper-backend-xxx                 1/1     Running   0          2m
# clipper-frontend-xxx                1/1     Running   0          2m
# postgres-0                          1/1     Running   0          2m
# redis-0                             1/1     Running   0          2m

# Watch pods until all are ready
kubectl get pods -n clipper-production -w
```

### 3. Check Services and Endpoints

```bash
# List services
kubectl get svc -n clipper-production

# Check endpoints
kubectl get endpoints -n clipper-production
```

### 4. Verify Ingress and TLS

```bash
# Check ingress
kubectl get ingress -n clipper-production

# Check certificate
kubectl get certificate -n clipper-production

# Describe certificate for details
kubectl describe certificate clipper-tls -n clipper-production
```

### 5. Test Application Access

```bash
# Test backend health endpoint
curl https://clpr.tv/api/health/ready

# Test frontend
curl https://clpr.tv/

# If using port-forward for local testing
kubectl port-forward svc/clipper-backend 8080:80 -n clipper-production
curl http://localhost:8080/health/ready
```

### 6. Check Logs

```bash
# Backend logs
kubectl logs -f deployment/clipper-backend -n clipper-production

# Frontend logs
kubectl logs -f deployment/clipper-frontend -n clipper-production

# Database logs
kubectl logs -f statefulset/postgres -n clipper-production

# All logs with label selector
kubectl logs -f -l app=clipper-backend -n clipper-production
```

## Upgrading

### 1. Update Image Tag (Rolling Update)

```bash
# Update backend to new version
helm upgrade clipper ./clipper \
  --namespace clipper-production \
  --set clipper-backend.image.tag=v1.2.0 \
  --reuse-values

# Watch rollout progress
kubectl rollout status deployment/clipper-backend -n clipper-production
```

### 2. Update Configuration

```bash
# Update with new values file
helm upgrade clipper ./clipper \
  --namespace clipper-production \
  -f ./clipper/examples/values-production.yaml

# Or override specific values
helm upgrade clipper ./clipper \
  --namespace clipper-production \
  --set clipper-backend.replicaCount=5 \
  --set clipper-backend.resources.requests.memory=1Gi \
  --reuse-values
```

### 3. Upgrade with Dry Run (Testing)

```bash
# Preview changes without applying
helm upgrade clipper ./clipper \
  --namespace clipper-production \
  -f ./clipper/examples/values-production.yaml \
  --dry-run --debug
```

### 4. Monitor Rolling Update

```bash
# Watch deployment rollout
kubectl rollout status deployment/clipper-backend -n clipper-production

# Watch pods being replaced
kubectl get pods -n clipper-production -w

# Check rollout history
kubectl rollout history deployment/clipper-backend -n clipper-production
```

### 5. Verify After Upgrade

```bash
# Check new pods are running
kubectl get pods -n clipper-production

# Test application
curl https://clpr.tv/api/health/ready

# Check HPA adjusted
kubectl get hpa -n clipper-production
```

## Rollback

### 1. Helm Rollback

```bash
# View release history
helm history clipper -n clipper-production

# Rollback to previous version
helm rollback clipper -n clipper-production

# Rollback to specific revision
helm rollback clipper 3 -n clipper-production

# Verify rollback
helm history clipper -n clipper-production
```

### 2. Kubernetes Rollback

```bash
# Rollback deployment using kubectl
kubectl rollout undo deployment/clipper-backend -n clipper-production

# Rollback to specific revision
kubectl rollout history deployment/clipper-backend -n clipper-production
kubectl rollout undo deployment/clipper-backend --to-revision=2 -n clipper-production

# Monitor rollback
kubectl rollout status deployment/clipper-backend -n clipper-production
```

### 3. Verify Rollback

```bash
# Check pod versions
kubectl get pods -n clipper-production -o wide

# Check image versions
kubectl get deployment clipper-backend -n clipper-production -o jsonpath='{.spec.template.spec.containers[0].image}'

# Test application
curl https://clpr.tv/api/health/ready
```

## Testing Rolling Updates

### 1. Test Zero-Downtime Updates

```bash
# Start monitoring in one terminal
watch kubectl get pods -n clipper-production

# In another terminal, run continuous requests
while true; do curl -s https://clpr.tv/api/health/ready && echo " - $(date)"; sleep 1; done

# In third terminal, trigger update
helm upgrade clipper ./clipper \
  --namespace clipper-production \
  --set clipper-backend.image.tag=v1.2.0 \
  --reuse-values

# Observe:
# - Pods rolling update one by one
# - No downtime in curl requests
# - PDB ensures minimum availability
```

### 2. Test HPA Scaling

```bash
# Monitor HPA
watch kubectl get hpa -n clipper-production

# Generate load (using tool like hey or apache bench)
hey -z 5m -c 50 https://clpr.tv/api/health/ready

# Observe:
# - HPA metrics increase
# - New pods being created
# - Scale up behavior
# - Scale down after load stops (5min stabilization)
```

### 3. Test Pod Disruption Budget

```bash
# Check PDB
kubectl get pdb -n clipper-production
kubectl describe pdb clipper-backend -n clipper-production

# Try to drain a node (should respect PDB)
kubectl drain <node-name> --ignore-daemonsets

# Verify minimum pods maintained
kubectl get pods -n clipper-production
```

## Troubleshooting

### Pods Not Starting

```bash
# Describe pod to see events
kubectl describe pod <pod-name> -n clipper-production

# Check logs
kubectl logs <pod-name> -n clipper-production

# Common issues:
# - Image pull errors: Check image name and tag
# - ConfigMap/Secret not found: Verify secrets created
# - Resource limits: Check if cluster has resources
```

### Ingress Not Working

```bash
# Check ingress
kubectl describe ingress -n clipper-production

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Check certificate
kubectl describe certificate clipper-tls -n clipper-production

# Common issues:
# - DNS not pointing to ingress IP
# - TLS certificate not issued
# - Ingress class mismatch
```

### Database Connection Issues

```bash
# Check database is running
kubectl get pods -n clipper-production | grep postgres

# Test connection from backend pod
kubectl exec -it deployment/clipper-backend -n clipper-production -- \
  sh -c 'nc -zv postgres 5432'

# Check service endpoints
kubectl get endpoints postgres -n clipper-production

# Check network policies
kubectl get networkpolicy -n clipper-production
kubectl describe networkpolicy clipper-backend -n clipper-production
```

### HPA Not Scaling

```bash
# Check HPA status
kubectl describe hpa clipper-backend -n clipper-production

# Check metrics server
kubectl top nodes
kubectl top pods -n clipper-production

# If metrics unavailable, install metrics-server:
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Cleanup

### Uninstall Release

```bash
# Uninstall (keeps PVCs)
helm uninstall clipper -n clipper-production

# Verify removal
helm list -n clipper-production
kubectl get all -n clipper-production
```

### Delete Persistent Data

```bash
# WARNING: This deletes all data
kubectl delete pvc --all -n clipper-production
```

### Delete Namespace

```bash
# Delete entire namespace and all resources
kubectl delete namespace clipper-production
```

## Best Practices

1. **Always backup data before upgrades**:
   ```bash
   kubectl exec postgres-0 -n clipper-production -- \
     pg_dump -U clipper clipper_db > backup-$(date +%Y%m%d).sql
   ```

2. **Use `--dry-run` before applying changes**:
   ```bash
   helm upgrade clipper ./clipper --dry-run --debug
   ```

3. **Monitor during upgrades**:
   ```bash
   kubectl get pods -w -n clipper-production
   ```

4. **Test in staging first**:
   - Deploy to staging environment
   - Run integration tests
   - Verify no issues
   - Then deploy to production

5. **Keep release history**:
   ```bash
   helm history clipper -n clipper-production
   ```

6. **Use version pinning in production**:
   ```yaml
   image:
     tag: "v1.2.3"  # Not "latest"
   ```

## Related Documentation

- [Helm Charts README](../README.md)
- [Kubernetes Infrastructure](../../infrastructure/k8s/README.md)
- [Backend K8s Guide](../../backend/k8s/README.md)
