---
title: "Kubernetes Operations Runbook"
summary: "Complete operational procedures for Kubernetes cluster management, deployment, troubleshooting, and maintenance."
tags: ["operations", "kubernetes", "runbook", "infrastructure"]
area: "operations"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2026-01-01
aliases: ["k8s-runbook", "kubernetes runbook", "cluster operations"]
---

# Kubernetes Operations Runbook

Complete operational procedures for managing Clipper's Kubernetes infrastructure.

## Table of Contents

- [Cluster Provisioning](#cluster-provisioning)
- [Initial Setup](#initial-setup)
- [Access Control](#access-control)
- [Deployment Procedures](#deployment-procedures)
- [Monitoring & Alerting](#monitoring--alerting)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)
- [Disaster Recovery](#disaster-recovery)
- [Cost Optimization](#cost-optimization)

---

## Cluster Provisioning

### Prerequisites

- Cloud provider CLI installed (gcloud, aws, or az)
- kubectl v1.31+
- helm v3.12+
- eksctl (for AWS EKS)

### Provision New Cluster

#### Google Kubernetes Engine (GKE)

```bash
cd infrastructure/k8s/bootstrap

CLOUD_PROVIDER=gke \
CLUSTER_NAME=clipper-prod \
ENVIRONMENT=production \
REGION=us-central1 \
NODE_COUNT=3 \
NODE_TYPE=e2-standard-4 \
GCP_PROJECT_ID=your-project-id \
./provision-cluster.sh
```

**Estimated Cost**: $200-400/month
- Control plane: Free
- 3x e2-standard-4 nodes: ~$150-200/month
- Networking & load balancer: ~$50-100/month

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

**Estimated Cost**: $220-450/month
- Control plane: $73/month
- 3x t3.large nodes: ~$150-200/month
- Networking & load balancer: ~$50-100/month

#### Azure Kubernetes Service (AKS)

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

**Estimated Cost**: $240-480/month
- Control plane: Free
- 3x Standard_D4s_v3 nodes: ~$190-300/month
- Networking & load balancer: ~$50-100/month

---

## Initial Setup

### Configure Cluster Components

After provisioning, run the setup script to install required operators:

```bash
cd infrastructure/k8s/bootstrap
./setup-cluster.sh
```

This installs:
- Namespaces (production, staging, monitoring)
- RBAC roles and bindings
- Network policies
- ingress-nginx controller
- cert-manager for TLS
- External Secrets Operator
- metrics-server for HPA

### Configure External Secrets

#### AWS Secrets Manager

```bash
# Create IAM role with IRSA
eksctl create iamserviceaccount \
  --name clipper-backend \
  --namespace clipper-production \
  --cluster clipper-prod \
  --region us-east-1 \
  --attach-policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite \
  --approve

# Create secrets in AWS Secrets Manager
aws secretsmanager create-secret \
  --name clipper/production/database \
  --description "Database credentials for production" \
  --secret-string '{"password":"your-secure-password"}'

# Apply SecretStore
kubectl apply -f infrastructure/k8s/external-secrets/secret-stores.yaml
kubectl apply -f infrastructure/k8s/external-secrets/external-secrets.yaml

# Verify synchronization
kubectl get externalsecret -n clipper-production
kubectl get secret backend-secrets -n clipper-production
```

#### GCP Secret Manager

```bash
# Create service account
gcloud iam service-accounts create clipper-backend-prod \
  --project=your-project-id \
  --display-name="Clipper Backend Production"

# Grant Secret Manager access
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:clipper-backend-prod@your-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Configure Workload Identity
gcloud iam service-accounts add-iam-policy-binding \
  clipper-backend-prod@your-project-id.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:your-project-id.svc.id.goog[clipper-production/clipper-backend]"

kubectl annotate serviceaccount clipper-backend \
  -n clipper-production \
  iam.gke.io/gcp-service-account=clipper-backend-prod@your-project-id.iam.gserviceaccount.com

# Create secrets in Secret Manager
echo -n "your-secure-password" | gcloud secrets create clipper-production-db-password \
  --data-file=- \
  --replication-policy="automatic"

# Apply SecretStore
kubectl apply -f infrastructure/k8s/external-secrets/secret-stores.yaml
kubectl apply -f infrastructure/k8s/external-secrets/external-secrets.yaml
```

#### Azure Key Vault

```bash
# Create managed identity
az identity create \
  --name clipper-backend-prod \
  --resource-group clipper-rg \
  --location eastus

# Create Key Vault
az keyvault create \
  --name clipper-prod-kv \
  --resource-group clipper-rg \
  --location eastus

# Grant access to Key Vault
IDENTITY_ID=$(az identity show \
  --name clipper-backend-prod \
  --resource-group clipper-rg \
  --query principalId -o tsv)

az keyvault set-policy \
  --name clipper-prod-kv \
  --object-id $IDENTITY_ID \
  --secret-permissions get list

# Configure federated identity
OIDC_ISSUER=$(az aks show \
  --name clipper-prod \
  --resource-group clipper-rg \
  --query "oidcIssuerProfile.issuerUrl" -o tsv)

az identity federated-credential create \
  --name clipper-backend-prod-federated \
  --identity-name clipper-backend-prod \
  --resource-group clipper-rg \
  --issuer $OIDC_ISSUER \
  --subject system:serviceaccount:clipper-production:clipper-backend

# Create secrets in Key Vault
az keyvault secret set \
  --vault-name clipper-prod-kv \
  --name db-password \
  --value "your-secure-password"

# Apply SecretStore
kubectl apply -f infrastructure/k8s/external-secrets/secret-stores.yaml
kubectl apply -f infrastructure/k8s/external-secrets/external-secrets.yaml
```

### Update DNS Records

Get the LoadBalancer IP:

```bash
kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

Create DNS A records:
- **Production**: `api.clpr.tv` → LoadBalancer IP
- **Staging**: `staging-api.clpr.tv` → LoadBalancer IP

### Verify Installation

```bash
cd infrastructure/k8s/bootstrap
./verify-cluster.sh
```

---

## Access Control

### Get Cluster Credentials

```bash
# GKE
gcloud container clusters get-credentials clipper-prod \
  --region us-central1 \
  --project your-project-id

# EKS
aws eks update-kubeconfig \
  --region us-east-1 \
  --name clipper-prod

# AKS
az aks get-credentials \
  --resource-group clipper-rg \
  --name clipper-prod
```

### Grant Team Access

#### Read-Only Access (Developers)

```bash
kubectl create rolebinding dev-view-prod \
  --clusterrole=view \
  --user=developer@example.com \
  --namespace=clipper-production
```

#### Deployer Access (CI/CD)

```bash
kubectl create rolebinding cicd-deployer-prod \
  --clusterrole=edit \
  --serviceaccount=clipper-production:clipper-deployer \
  --namespace=clipper-production
```

#### Admin Access (Ops Team)

```bash
kubectl create clusterrolebinding ops-admin \
  --clusterrole=admin \
  --user=ops@example.com
```

### Generate Service Account Token (CI/CD)

```bash
# Create token for deployer service account
kubectl create token clipper-deployer \
  -n clipper-production \
  --duration=87600h  # 10 years

# Or create a long-lived secret (deprecated but still works in older clusters)
kubectl apply -f - <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: clipper-deployer-token
  namespace: clipper-production
  annotations:
    kubernetes.io/service-account.name: clipper-deployer
type: kubernetes.io/service-account-token
EOF

kubectl get secret clipper-deployer-token -n clipper-production -o jsonpath='{.data.token}' | base64 -d
```

---

## Deployment Procedures

### Deploy to Production

```bash
# Build and push images
cd backend
docker build -t ghcr.io/subculture-collective/clipper-backend:v1.2.3 .
docker push ghcr.io/subculture-collective/clipper-backend:v1.2.3

cd ../frontend
docker build -t ghcr.io/subculture-collective/clipper-frontend:v1.2.3 .
docker push ghcr.io/subculture-collective/clipper-frontend:v1.2.3

# Update image tags in kustomization
cd ../infrastructure/k8s/overlays/production
# Edit kustomization.yaml to set newTag: v1.2.3

# Apply with kustomize
kubectl apply -k .

# Or apply directly
kubectl set image deployment/clipper-backend \
  backend=ghcr.io/subculture-collective/clipper-backend:v1.2.3 \
  -n clipper-production

# Watch rollout
kubectl rollout status deployment/clipper-backend -n clipper-production
```

### Deploy to Staging

```bash
kubectl apply -k infrastructure/k8s/overlays/staging/
kubectl rollout status deployment/clipper-backend -n clipper-staging
```

### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/clipper-backend -n clipper-production

# Rollback to previous version
kubectl rollout undo deployment/clipper-backend -n clipper-production

# Rollback to specific revision
kubectl rollout undo deployment/clipper-backend -n clipper-production --to-revision=3
```

### Run Database Migrations

```bash
# Option 1: Run in existing pod
kubectl exec -it deployment/clipper-backend -n clipper-production -- /app/api migrate up

# Option 2: Run as Kubernetes Job
kubectl create job migration-$(date +%s) \
  --image=ghcr.io/subculture-collective/clipper-backend:latest \
  -n clipper-production \
  -- /app/api migrate up

kubectl logs job/migration-<timestamp> -n clipper-production
```

---

## Monitoring & Alerting

### View Logs

```bash
# View backend logs
kubectl logs -f deployment/clipper-backend -n clipper-production

# View logs from all pods
kubectl logs -f -l app=clipper-backend -n clipper-production

# View previous container logs (if pod restarted)
kubectl logs deployment/clipper-backend -n clipper-production --previous
```

### Check Resource Usage

```bash
# Node resource usage
kubectl top nodes

# Pod resource usage
kubectl top pods -n clipper-production

# Pod resource requests/limits
kubectl describe pod <pod-name> -n clipper-production | grep -A 5 "Limits:"
```

### Check HPA Status

```bash
kubectl get hpa -n clipper-production
kubectl describe hpa clipper-backend -n clipper-production
```

### View Events

```bash
# Recent events in namespace
kubectl get events -n clipper-production --sort-by='.lastTimestamp'

# Events for specific resource
kubectl describe deployment clipper-backend -n clipper-production
```

---

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl get pods -n clipper-production

# Get detailed info
kubectl describe pod <pod-name> -n clipper-production

# Check logs
kubectl logs <pod-name> -n clipper-production

# Common issues:
# - ImagePullBackOff: Check image name and registry credentials
# - CrashLoopBackOff: Check application logs
# - Pending: Check resource requests and node capacity
```

### Ingress Not Working

```bash
# Check ingress status
kubectl get ingress -n clipper-production
kubectl describe ingress clipper-backend -n clipper-production

# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=100

# Test from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://clipper-backend.clipper-production.svc.cluster.local

# Verify DNS
nslookup api.clpr.tv
```

### Certificate Issues

```bash
# Check certificate status
kubectl get certificate -n clipper-production
kubectl describe certificate clipper-backend-tls-prod -n clipper-production

# Check certificate requests
kubectl get certificaterequest -n clipper-production

# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager --tail=100

# Manually trigger certificate renewal
kubectl delete certificaterequest -n clipper-production --all
```

### External Secrets Not Syncing

```bash
# Check ExternalSecret status
kubectl get externalsecret -n clipper-production
kubectl describe externalsecret backend-secrets -n clipper-production

# Check SecretStore
kubectl get secretstore -n clipper-production
kubectl describe secretstore aws-secrets-manager -n clipper-production

# Check External Secrets Operator logs
kubectl logs -n external-secrets-system deployment/external-secrets --tail=100

# Verify secret was created
kubectl get secret backend-secrets -n clipper-production
kubectl describe secret backend-secrets -n clipper-production
```

### Database Connection Issues

```bash
# Test database connectivity from pod
kubectl exec -it deployment/clipper-backend -n clipper-production -- \
  sh -c 'echo "SELECT 1" | psql $DATABASE_URL'

# Check if database pods are running (if using in-cluster DB)
kubectl get pods -n clipper-production -l app=postgres

# Check network policies
kubectl get networkpolicy -n clipper-production
kubectl describe networkpolicy allow-backend-to-databases -n clipper-production
```

### High Resource Usage

```bash
# Check current usage
kubectl top pods -n clipper-production

# Check limits
kubectl describe deployment clipper-backend -n clipper-production | grep -A 5 "Limits:"

# Scale manually if needed
kubectl scale deployment clipper-backend --replicas=5 -n clipper-production

# Adjust HPA
kubectl patch hpa clipper-backend -n clipper-production -p '{"spec":{"maxReplicas":15}}'
```

---

## Maintenance

### Update Kubernetes Version

```bash
# GKE
gcloud container clusters upgrade clipper-prod \
  --master --cluster-version 1.32 \
  --region us-central1

gcloud container clusters upgrade clipper-prod \
  --node-pool=default-pool \
  --region us-central1

# EKS
eksctl upgrade cluster --name=clipper-prod --version=1.32 --approve

# AKS
az aks upgrade \
  --resource-group clipper-rg \
  --name clipper-prod \
  --kubernetes-version 1.32
```

### Update Operators

```bash
# Update ingress-nginx
helm repo update
helm upgrade ingress-nginx ingress-nginx/ingress-nginx \
  -n ingress-nginx

# Update cert-manager
helm upgrade cert-manager jetstack/cert-manager \
  -n cert-manager \
  --version v1.16.2

# Update External Secrets Operator
helm upgrade external-secrets external-secrets/external-secrets \
  -n external-secrets-system
```

### Rotate Secrets

```bash
# Update secret in cloud provider secret manager
aws secretsmanager update-secret \
  --secret-id clipper/production/database \
  --secret-string '{"password":"new-secure-password"}'

# Force ExternalSecret to sync
kubectl annotate externalsecret backend-secrets \
  -n clipper-production \
  force-sync="$(date +%s)" --overwrite

# Restart pods to pick up new secrets
kubectl rollout restart deployment/clipper-backend -n clipper-production
```

### Backup & Restore

See [Disaster Recovery](#disaster-recovery) section.

---

## Disaster Recovery

### Backup Procedures

#### Backup Cluster Configuration

```bash
# Backup all resources
kubectl get all --all-namespaces -o yaml > cluster-backup-$(date +%Y%m%d).yaml

# Backup specific namespace
kubectl get all -n clipper-production -o yaml > prod-backup-$(date +%Y%m%d).yaml
```

#### Backup Persistent Volumes

```bash
# Create VolumeSnapshot (requires CSI snapshot controller)
kubectl apply -f - <<EOF
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: postgres-snapshot-$(date +%Y%m%d)
  namespace: clipper-production
spec:
  volumeSnapshotClassName: csi-snapshot-class
  source:
    persistentVolumeClaimName: postgres-data
EOF
```

### Restore Procedures

#### Restore from Backup

```bash
# Apply backup
kubectl apply -f cluster-backup-20260101.yaml

# Verify
kubectl get all -n clipper-production
```

#### Disaster Recovery Steps

1. **Provision new cluster** (if needed)
2. **Configure cluster** (RBAC, network policies, etc.)
3. **Restore persistent volumes** from snapshots/backups
4. **Deploy applications** from manifests
5. **Update DNS** to point to new cluster
6. **Verify functionality**

**RTO (Recovery Time Objective)**: 1-2 hours
**RPO (Recovery Point Objective)**: 1 hour (based on backup frequency)

---

## Cost Optimization

### Monitor Costs

```bash
# Check node utilization
kubectl top nodes

# Check pod resource usage
kubectl top pods --all-namespaces

# Identify over-provisioned resources
kubectl get pods --all-namespaces -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
CPU_REQUEST:.spec.containers[*].resources.requests.cpu,\
MEM_REQUEST:.spec.containers[*].resources.requests.memory
```

### Optimize Resources

```bash
# Right-size pod resources based on actual usage
kubectl set resources deployment clipper-backend \
  -n clipper-production \
  --requests=cpu=200m,memory=512Mi \
  --limits=cpu=1000m,memory=1Gi

# Adjust HPA min/max replicas
kubectl patch hpa clipper-backend \
  -n clipper-production \
  -p '{"spec":{"minReplicas":2,"maxReplicas":8}}'
```

### Use Spot/Preemptible Nodes

```bash
# GKE: Create preemptible node pool
gcloud container node-pools create preemptible-pool \
  --cluster=clipper-prod \
  --preemptible \
  --num-nodes=2

# EKS: Use Spot instances in node group
# (configure in eksctl config file)

# AKS: Use Spot VMs
az aks nodepool add \
  --resource-group clipper-rg \
  --cluster-name clipper-prod \
  --name spotpool \
  --priority Spot \
  --eviction-policy Delete \
  --spot-max-price -1 \
  --node-count 2
```

---

## Related Documentation

- [Infrastructure Overview](../deployment/infra.md)
- [Monitoring & Observability](./monitoring.md)
- [Secrets Management](./secrets-management.md)
- [CI/CD Integration](./cicd.md)

## Related Issues

- [#805 - Roadmap 5.0 Master Tracker](https://github.com/subculture-collective/clipper/issues/805)
- [#852 - Kubernetes Cluster Setup](https://github.com/subculture-collective/clipper/issues/852)
- [#836 - Infrastructure Modernization RFC](https://github.com/subculture-collective/clipper/issues/836)

---

[[index|← Back to Operations]]
