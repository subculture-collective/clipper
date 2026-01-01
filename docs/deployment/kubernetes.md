---
title: "Kubernetes Deployment Guide"
summary: "Complete guide for deploying Clipper to Kubernetes including cluster setup, application deployment, and post-deployment verification."
tags: ["deployment", "kubernetes", "guide", "operations"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2026-01-01
aliases: ["k8s-deployment", "kubernetes deployment"]
---

# Kubernetes Deployment Guide

Complete end-to-end guide for deploying Clipper to production-ready Kubernetes clusters.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Deployment Steps](#deployment-steps)
- [Post-Deployment Verification](#post-deployment-verification)
- [Production Checklist](#production-checklist)
- [Rollback Procedures](#rollback-procedures)
- [Next Steps](#next-steps)

---

## Overview

This guide walks through the complete deployment process from cluster provisioning to production verification. The deployment follows these phases:

```
Phase 1: Cluster Setup
  ├─ Provision cluster (GKE/EKS/AKS)
  ├─ Configure cluster components
  └─ Setup external secrets

Phase 2: Application Deployment
  ├─ Deploy Helm charts
  ├─ Configure DNS & TLS
  └─ Run database migrations

Phase 3: Verification
  ├─ Health checks
  ├─ Integration tests
  └─ Monitoring setup

Phase 4: Production Cutover
  ├─ Update DNS
  ├─ Monitor traffic
  └─ Validate functionality
```

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet Traffic                        │
└────────────────────┬────────────────────────────────────────┘
                     │
              ┌──────▼──────┐
              │ LoadBalancer │
              └──────┬───────┘
                     │
          ┌──────────▼──────────┐
          │  Ingress Controller  │
          │   (nginx/traefik)    │
          └──────────┬───────────┘
                     │
      ┌──────────────┼──────────────┐
      │              │              │
 ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐
 │ Frontend │  │ Backend  │  │   API    │
 │ (2-10)   │  │ (3-20)   │  │ Gateway  │
 └──────────┘  └────┬─────┘  └──────────┘
                    │
      ┌─────────────┼─────────────┐
      │             │             │
 ┌────▼────┐  ┌────▼────┐  ┌────▼────┐
 │Postgres │  │  Redis  │  │OpenSearch│
 │ Primary │  │ Primary │  │ Cluster  │
 └─────────┘  └─────────┘  └──────────┘
```

---

## Prerequisites

### Required Tools

```bash
# Verify required tools are installed
kubectl version --client
helm version
gcloud version  # or aws, az cli

# Minimum versions
kubectl >= 1.28
helm >= 3.12
```

### Cloud Provider Access

Ensure you have appropriate permissions:

- **GCP**: `roles/container.admin`, `roles/iam.serviceAccountAdmin`
- **AWS**: `AdministratorAccess` or custom policy with EKS permissions
- **Azure**: `Azure Kubernetes Service Contributor` role

### DNS Configuration

Prepare DNS records (will be updated later):
- **Production**: `clpr.tv`, `api.clpr.tv`
- **Staging**: `staging.clpr.tv`, `staging-api.clpr.tv`

### Secret Management

Prepare secrets for:
- Database credentials
- Redis password
- JWT secrets
- Twitch client secret
- Stripe API keys
- External service credentials

Store these in your cloud provider's secret manager (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault).

---

## Deployment Steps

### Step 1: Provision Kubernetes Cluster

Choose your cloud provider and provision a cluster:

#### Google Kubernetes Engine (GKE)

```bash
cd infrastructure/k8s/bootstrap

# Production cluster
CLOUD_PROVIDER=gke \
CLUSTER_NAME=clipper-prod \
ENVIRONMENT=production \
REGION=us-central1 \
NODE_COUNT=3 \
NODE_TYPE=e2-standard-4 \
GCP_PROJECT_ID=your-project-id \
./provision-cluster.sh

# Staging cluster (optional, smaller)
CLOUD_PROVIDER=gke \
CLUSTER_NAME=clipper-staging \
ENVIRONMENT=staging \
REGION=us-central1 \
NODE_COUNT=2 \
NODE_TYPE=e2-standard-2 \
GCP_PROJECT_ID=your-project-id \
./provision-cluster.sh
```

#### Amazon EKS

```bash
cd infrastructure/k8s/bootstrap

CLOUD_PROVIDER=eks \
CLUSTER_NAME=clipper-prod \
ENVIRONMENT=production \
REGION=us-east-1 \
NODE_COUNT=3 \
NODE_TYPE=t3.large \
./provision-cluster.sh
```

#### Azure AKS

```bash
cd infrastructure/k8s/bootstrap

CLOUD_PROVIDER=aks \
CLUSTER_NAME=clipper-prod \
ENVIRONMENT=production \
REGION=eastus \
NODE_COUNT=3 \
NODE_TYPE=Standard_D4s_v3 \
AZURE_RESOURCE_GROUP=clipper-rg \
./provision-cluster.sh
```

**Estimated Time**: 10-15 minutes

### Step 2: Configure Cluster

Install required operators and configure cluster components:

```bash
cd infrastructure/k8s/bootstrap
./setup-cluster.sh

# This installs:
# - Namespaces (production, staging, monitoring)
# - RBAC roles and bindings
# - Network policies
# - ingress-nginx controller
# - cert-manager for TLS
# - External Secrets Operator
# - metrics-server for HPA
```

**Estimated Time**: 5-10 minutes

Verify installation:

```bash
./verify-cluster.sh
```

Expected output:
```
✓ Namespaces created
✓ ingress-nginx running
✓ cert-manager running
✓ external-secrets-operator running
✓ metrics-server running
✓ Cluster ready for deployment
```

### Step 3: Configure External Secrets

Setup external secrets integration with your cloud provider:

#### AWS Secrets Manager

```bash
# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name clipper/production/database \
  --secret-string '{"password":"your-secure-db-password"}'

aws secretsmanager create-secret \
  --name clipper/production/redis \
  --secret-string '{"password":"your-secure-redis-password"}'

aws secretsmanager create-secret \
  --name clipper/production/jwt \
  --secret-string '{"secret":"your-jwt-secret-key"}'

aws secretsmanager create-secret \
  --name clipper/production/twitch \
  --secret-string '{"client_id":"your-twitch-client-id","client_secret":"your-twitch-secret"}'

aws secretsmanager create-secret \
  --name clipper/production/stripe \
  --secret-string '{"secret_key":"your-stripe-secret-key"}'

# Create IAM policy (least privilege)
cat > clipper-secrets-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": [
        "arn:aws:secretsmanager:REGION:ACCOUNT_ID:secret:clipper/production/*"
      ]
    }
  ]
}
EOF

aws iam create-policy \
  --policy-name ClipperBackendSecretsReadOnly \
  --policy-document file://clipper-secrets-policy.json

# Create IAM role with IRSA
eksctl create iamserviceaccount \
  --name clipper-backend \
  --namespace clipper-production \
  --cluster clipper-prod \
  --region us-east-1 \
  --attach-policy-arn arn:aws:iam::ACCOUNT_ID:policy/ClipperBackendSecretsReadOnly \
  --approve

# Apply SecretStore and ExternalSecrets
kubectl apply -f infrastructure/k8s/external-secrets/secret-stores.yaml
kubectl apply -f infrastructure/k8s/external-secrets/external-secrets.yaml

# Verify synchronization
kubectl get externalsecret -n clipper-production
kubectl get secret backend-secrets -n clipper-production
```

#### GCP Secret Manager

```bash
# Create secrets in Secret Manager
echo -n "your-secure-db-password" | \
  gcloud secrets create clipper-production-db-password --data-file=-

echo -n "your-secure-redis-password" | \
  gcloud secrets create clipper-production-redis-password --data-file=-

echo -n "your-jwt-secret-key" | \
  gcloud secrets create clipper-production-jwt-secret --data-file=-

# Configure Workload Identity
gcloud iam service-accounts create clipper-backend-prod \
  --project=your-project-id

gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:clipper-backend-prod@your-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud iam service-accounts add-iam-policy-binding \
  clipper-backend-prod@your-project-id.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:your-project-id.svc.id.goog[clipper-production/clipper-backend]"

kubectl annotate serviceaccount clipper-backend \
  -n clipper-production \
  iam.gke.io/gcp-service-account=clipper-backend-prod@your-project-id.iam.gserviceaccount.com

# Apply SecretStore and ExternalSecrets
kubectl apply -f infrastructure/k8s/external-secrets/secret-stores.yaml
kubectl apply -f infrastructure/k8s/external-secrets/external-secrets.yaml
```

#### Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name clipper-prod-kv \
  --resource-group clipper-rg \
  --location eastus

# Create secrets
az keyvault secret set --vault-name clipper-prod-kv \
  --name db-password --value "your-secure-db-password"

az keyvault secret set --vault-name clipper-prod-kv \
  --name redis-password --value "your-secure-redis-password"

az keyvault secret set --vault-name clipper-prod-kv \
  --name jwt-secret --value "your-jwt-secret-key"

# Configure Workload Identity
az identity create \
  --name clipper-backend-prod \
  --resource-group clipper-rg

IDENTITY_ID=$(az identity show \
  --name clipper-backend-prod \
  --resource-group clipper-rg \
  --query principalId -o tsv)

az keyvault set-policy \
  --name clipper-prod-kv \
  --object-id $IDENTITY_ID \
  --secret-permissions get list

# Apply SecretStore and ExternalSecrets
kubectl apply -f infrastructure/k8s/external-secrets/secret-stores.yaml
kubectl apply -f infrastructure/k8s/external-secrets/external-secrets.yaml
```

**Estimated Time**: 15-20 minutes

### Step 4: Deploy Applications with Helm

Deploy the complete Clipper stack using Helm:

```bash
cd helm/charts

# Production deployment
helm install clipper ./clipper \
  --namespace clipper-production \
  --create-namespace \
  -f ./clipper/examples/values-production.yaml \
  --set global.domain=clpr.tv \
  --set backend.image.tag=v1.0.0 \
  --set frontend.image.tag=v1.0.0 \
  --timeout 10m \
  --wait

# Staging deployment (optional)
helm install clipper ./clipper \
  --namespace clipper-staging \
  --create-namespace \
  -f ./clipper/examples/values-staging.yaml \
  --set global.domain=staging.clpr.tv \
  --set backend.image.tag=v1.0.0 \
  --set frontend.image.tag=v1.0.0 \
  --timeout 10m \
  --wait
```

**Estimated Time**: 5-10 minutes

### Step 5: Run Database Migrations

```bash
# Wait for database to be ready
kubectl wait --for=condition=ready pod -l app=postgres \
  -n clipper-production --timeout=5m

# Run migrations
kubectl exec -it deployment/clipper-backend -n clipper-production -- \
  /app/api migrate up

# Verify migrations
kubectl exec -it deployment/clipper-backend -n clipper-production -- \
  /app/api migrate version
```

**Estimated Time**: 2-5 minutes

### Step 6: Configure DNS and TLS

#### Get LoadBalancer IP

```bash
# Get ingress LoadBalancer IP
kubectl get svc ingress-nginx-controller -n ingress-nginx \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Example output: 35.123.45.67
```

#### Update DNS Records

Create A records pointing to the LoadBalancer IP:
- `clpr.tv` → `35.123.45.67`
- `api.clpr.tv` → `35.123.45.67`
- `staging.clpr.tv` → `35.123.45.67` (if staging deployed)

**DNS propagation time**: 5-60 minutes

#### Verify TLS Certificates

```bash
# Check certificate status
kubectl get certificate -n clipper-production
kubectl describe certificate clipper-tls -n clipper-production

# Wait for certificate to be ready
kubectl wait --for=condition=ready certificate/clipper-tls \
  -n clipper-production --timeout=10m
```

**Estimated Time**: 10-20 minutes (including DNS propagation)

---

## Post-Deployment Verification

### Health Checks

```bash
# Check pod status
kubectl get pods -n clipper-production

# All pods should show Running status:
# NAME                              READY   STATUS    RESTARTS   AGE
# clipper-backend-xxx               1/1     Running   0          5m
# clipper-frontend-xxx              1/1     Running   0          5m
# postgres-0                        1/1     Running   0          5m
# redis-0                           1/1     Running   0          5m

# Check HPA status
kubectl get hpa -n clipper-production

# Check ingress
kubectl get ingress -n clipper-production

# Test backend health endpoint
curl https://api.clpr.tv/health/ready

# Expected: {"status":"ok","timestamp":"..."}

# Test frontend
curl -I https://clpr.tv

# Expected: HTTP/2 200
```

### Integration Tests

```bash
# Run integration test suite (if available)
kubectl run -it --rm test --image=curlimages/curl --restart=Never -- \
  sh -c 'curl -f https://api.clpr.tv/health/ready && echo "✓ Backend OK"'

# Test database connectivity
kubectl exec -it deployment/clipper-backend -n clipper-production -- \
  sh -c 'echo "SELECT 1" | psql $DATABASE_URL'

# Test Redis connectivity
kubectl exec -it deployment/clipper-backend -n clipper-production -- \
  sh -c 'redis-cli -h redis ping'
```

### Monitoring Setup

```bash
# Verify Prometheus is scraping metrics
kubectl port-forward -n clipper-monitoring svc/prometheus 9090:9090

# Open http://localhost:9090 and query:
# up{namespace="clipper-production"}

# Check Grafana dashboards
kubectl port-forward -n clipper-monitoring svc/grafana 3000:80

# Open http://localhost:3000 (admin/password from secrets)
```

---

## Production Checklist

Before declaring production ready, verify:

### Infrastructure
- [ ] Cluster autoscaler enabled
- [ ] HPA configured for backend and frontend
- [ ] PodDisruptionBudgets configured
- [ ] Network policies applied
- [ ] Resource quotas set
- [ ] Monitoring stack deployed

### Security
- [ ] External secrets syncing correctly
- [ ] TLS certificates valid and auto-renewing
- [ ] RBAC roles configured (least privilege)
- [ ] Network policies enforcing isolation
- [ ] Secrets not stored in Git or manifests
- [ ] Image pull secrets configured

### Data & Backups
- [ ] Database backups automated (daily)
- [ ] WAL archiving enabled (PITR)
- [ ] Volume snapshots scheduled
- [ ] Backup retention policies configured
- [ ] DR procedures documented and tested

### Observability
- [ ] Prometheus scraping all services
- [ ] Grafana dashboards created
- [ ] AlertManager configured
- [ ] Log aggregation working
- [ ] Distributed tracing enabled (optional)

### Performance
- [ ] Load testing completed
- [ ] Resource limits tuned
- [ ] Connection pooling configured
- [ ] Caching enabled and verified
- [ ] CDN configured for static assets

### Documentation
- [ ] Deployment procedures documented
- [ ] Runbook updated
- [ ] On-call rotation configured
- [ ] Incident response plan defined

---

## Rollback Procedures

If deployment fails or issues discovered:

### Helm Rollback

```bash
# View release history
helm history clipper -n clipper-production

# Rollback to previous version
helm rollback clipper -n clipper-production

# Rollback to specific revision
helm rollback clipper 3 -n clipper-production
```

### Kubernetes Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/clipper-backend -n clipper-production

# Rollback to specific revision
kubectl rollout history deployment/clipper-backend -n clipper-production
kubectl rollout undo deployment/clipper-backend --to-revision=2 -n clipper-production
```

### DNS Rollback

Update DNS records to point back to previous infrastructure.

**Estimated Time**: 5-10 minutes (plus DNS propagation)

---

## Next Steps

After successful deployment:

1. **Monitor Performance**: Watch metrics for first 24-48 hours
2. **Run Load Tests**: Validate cluster can handle expected traffic
3. **Test Disaster Recovery**: Verify backup and restore procedures
4. **Optimize Costs**: Review resource usage and apply optimizations
5. **Document Learnings**: Update runbooks with any issues encountered

### Additional Documentation

- [[../operations/kubernetes-runbook|Kubernetes Operations Runbook]] - Day-to-day operations
- [[../operations/kubernetes-scaling|Kubernetes Scaling Guide]] - Autoscaling strategies
- [[../operations/kubernetes-troubleshooting|Kubernetes Troubleshooting]] - Common issues
- [[../operations/kubernetes-disaster-recovery|Kubernetes Disaster Recovery]] - Backup and restore
- [[../operations/kubernetes-cost-optimization|Kubernetes Cost Optimization]] - Cost reduction

### Related Helm Documentation

- [Helm Charts README](../../helm/README.md) - Overview of Helm charts
- [Helm Installation Guide](../../helm/INSTALLATION.md) - Detailed installation procedures

---

## Related Issues

- [#852 - Kubernetes Cluster Setup](https://github.com/subculture-collective/clipper/issues/852)
- [#853 - Application Helm Charts](https://github.com/subculture-collective/clipper/issues/853)
- [#854 - Kubernetes Documentation](https://github.com/subculture-collective/clipper/issues/854)
- [#805 - Roadmap 5.0 Master Tracker](https://github.com/subculture-collective/clipper/issues/805)

---

[[index|← Back to Deployment]]
