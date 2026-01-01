# Kubernetes Infrastructure

This directory contains Kubernetes manifests, bootstrap scripts, and configurations for deploying Clipper to production and staging environments.

## Directory Structure

```
infrastructure/k8s/
├── base/                      # Base Kubernetes resources
│   ├── namespaces.yaml       # Production, staging, and monitoring namespaces
│   ├── rbac.yaml             # RBAC roles and bindings (least privilege)
│   ├── network-policies.yaml # Network policies for namespace isolation
│   ├── ingress-nginx.yaml    # Ingress controller configuration
│   └── cert-manager.yaml     # TLS certificate automation
├── overlays/                  # Environment-specific overlays (Kustomize)
│   ├── production/           # Production environment
│   │   ├── kustomization.yaml
│   │   ├── deployment-patch.yaml
│   │   └── ingress-patch.yaml
│   └── staging/              # Staging environment
│       ├── kustomization.yaml
│       ├── deployment-patch.yaml
│       └── ingress-patch.yaml
├── external-secrets/          # External Secrets Operator configuration
│   ├── operator.yaml         # ESO deployment
│   ├── secret-stores.yaml    # SecretStore configurations (AWS, GCP, Azure, Vault)
│   └── external-secrets.yaml # ExternalSecret resources
└── bootstrap/                 # Cluster provisioning and setup scripts
    ├── provision-cluster.sh  # Provision cloud cluster (GKE/EKS/AKS)
    ├── setup-cluster.sh      # Configure cluster (operators, RBAC, etc.)
    └── verify-cluster.sh     # Health check and verification
```

## Quick Start

### 1. Provision a New Cluster

```bash
# For GKE
CLOUD_PROVIDER=gke \
CLUSTER_NAME=clipper-prod \
ENVIRONMENT=production \
REGION=us-central1 \
NODE_COUNT=3 \
GCP_PROJECT_ID=your-project-id \
./bootstrap/provision-cluster.sh

# For EKS
CLOUD_PROVIDER=eks \
CLUSTER_NAME=clipper-prod \
ENVIRONMENT=production \
REGION=us-east-1 \
NODE_COUNT=3 \
./bootstrap/provision-cluster.sh

# For AKS
CLOUD_PROVIDER=aks \
CLUSTER_NAME=clipper-prod \
ENVIRONMENT=production \
REGION=eastus \
NODE_COUNT=3 \
AZURE_RESOURCE_GROUP=clipper-rg \
./bootstrap/provision-cluster.sh
```

### 2. Configure the Cluster

```bash
# Install required operators and configure RBAC, network policies, etc.
./bootstrap/setup-cluster.sh
```

### 3. Configure External Secrets

#### For AWS (using IAM Roles for Service Accounts)

```bash
# Create IAM role for External Secrets Operator
eksctl create iamserviceaccount \
  --name clipper-backend \
  --namespace clipper-production \
  --cluster clipper-prod \
  --attach-policy-arn arn:aws:iam::aws:policy/SecretsManagerReadWrite \
  --approve

# Apply SecretStore configuration
kubectl apply -f external-secrets/secret-stores.yaml
kubectl apply -f external-secrets/external-secrets.yaml
```

#### For GCP (using Workload Identity)

```bash
# Enable Workload Identity
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

# Apply SecretStore configuration
kubectl apply -f external-secrets/secret-stores.yaml
kubectl apply -f external-secrets/external-secrets.yaml
```

#### For Azure (using Workload Identity)

```bash
# Create managed identity
az identity create \
  --name clipper-backend-prod \
  --resource-group clipper-rg

# Grant access to Key Vault
az keyvault set-policy \
  --name clipper-prod-kv \
  --object-id $(az identity show --name clipper-backend-prod --resource-group clipper-rg --query principalId -o tsv) \
  --secret-permissions get list

# Configure federated identity
az identity federated-credential create \
  --name clipper-backend-prod-federated \
  --identity-name clipper-backend-prod \
  --resource-group clipper-rg \
  --issuer $(az aks show --name clipper-prod --resource-group clipper-rg --query "oidcIssuerProfile.issuerUrl" -o tsv) \
  --subject system:serviceaccount:clipper-production:clipper-backend

# Apply SecretStore configuration
kubectl apply -f external-secrets/secret-stores.yaml
kubectl apply -f external-secrets/external-secrets.yaml
```

### 4. Deploy Applications

```bash
# Deploy to production
kubectl apply -k overlays/production/

# Deploy to staging
kubectl apply -k overlays/staging/

# Verify deployment
kubectl get pods -n clipper-production
kubectl get ingress -n clipper-production
kubectl get certificate -n clipper-production
```

### 5. Verify Cluster Health

```bash
./bootstrap/verify-cluster.sh
```

## Architecture

### Namespaces

- **clipper-production**: Production environment
- **clipper-staging**: Staging environment for pre-production testing
- **clipper-monitoring**: Monitoring stack (Prometheus, Grafana, etc.)
- **ingress-nginx**: Ingress controller
- **cert-manager**: TLS certificate management
- **external-secrets-system**: External Secrets Operator

### RBAC (Least Privilege)

- **clipper-backend** ServiceAccount: Minimal permissions for backend pods (read ConfigMaps, Secrets)
- **clipper-deployer** ServiceAccount: Deploy permissions for CI/CD
- **clipper-monitor** ServiceAccount: Read-only access for monitoring

### Network Policies

- Default deny all ingress traffic
- Allow ingress from ingress controller to backend/frontend
- Allow backend to access databases (Postgres, Redis, OpenSearch)
- Allow backend to reach external APIs (HTTPS)
- Allow monitoring to scrape metrics from all namespaces

### Ingress & TLS

- **ingress-nginx**: Load balancer and ingress controller
- **cert-manager**: Automated TLS certificate issuance via Let's Encrypt
- HTTP to HTTPS redirect enforced
- Separate domains for production and staging

### External Secrets

- Secrets stored in cloud provider secret managers (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault)
- External Secrets Operator syncs secrets to Kubernetes
- No secrets stored in Git or cluster manifests

## Cost Estimates

### GKE (Google Kubernetes Engine)
- **Control Plane**: Free
- **Nodes**: 3x e2-standard-4 (4 vCPU, 16GB RAM) = ~$150-200/month
- **Networking**: ~$50-100/month
- **Total**: ~$200-400/month

### EKS (Amazon Elastic Kubernetes Service)
- **Control Plane**: $73/month
- **Nodes**: 3x t3.large (2 vCPU, 8GB RAM) = ~$150-200/month
- **Networking**: ~$50-100/month
- **Total**: ~$220-450/month

### AKS (Azure Kubernetes Service)
- **Control Plane**: Free
- **Nodes**: 3x Standard_D4s_v3 (4 vCPU, 16GB RAM) = ~$190-300/month
- **Networking**: ~$50-100/month
- **Total**: ~$240-480/month

### Additional Services
- **Load Balancer**: $15-30/month
- **Persistent Volumes**: $10-50/month (depends on storage class and size)
- **Data Transfer**: Variable (can be $50-200/month)

**Total Estimated Monthly Cost**: $300-700 USD depending on cloud provider and usage

## Scaling

### Horizontal Pod Autoscaling (HPA)

HPA is configured for backend pods (see `backend/k8s/hpa-backend.yaml`):
- Min replicas: 2 (staging: 2, production: 3)
- Max replicas: 10
- Target CPU utilization: 70%
- Target memory utilization: 80%

### Cluster Autoscaling

Cluster autoscaling is enabled during provisioning:
- Min nodes: 2
- Max nodes: 10
- Automatically adds/removes nodes based on pod resource requests

## Security

### Network Isolation

- Network policies enforce namespace isolation
- Default deny all ingress
- Explicit allow rules for required traffic
- Egress restricted to necessary services

### Secret Management

- Secrets stored in cloud provider secret managers
- External Secrets Operator syncs to Kubernetes
- Automatic rotation supported (varies by provider)
- No secrets in Git or manifests

### RBAC

- Service accounts with least privilege
- Separate roles for applications, deployers, and monitoring
- No cluster-admin access for applications

### TLS

- All traffic encrypted with TLS
- Certificates auto-renewed by cert-manager
- HTTP to HTTPS redirect enforced

## Monitoring & Observability

See [Monitoring Setup](../../docs/operations/monitoring.md) for details on:
- Prometheus for metrics collection
- Grafana for visualization
- Loki for log aggregation
- Alert rules and notifications

## Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod <pod-name> -n <namespace>
kubectl logs <pod-name> -n <namespace>
```

### Ingress Not Working

```bash
kubectl describe ingress -n <namespace>
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller
```

### Certificate Not Issuing

```bash
kubectl get certificaterequest -n <namespace>
kubectl describe certificate <cert-name> -n <namespace>
kubectl logs -n cert-manager deployment/cert-manager
```

### External Secrets Not Syncing

```bash
kubectl get externalsecret -n <namespace>
kubectl describe externalsecret <name> -n <namespace>
kubectl logs -n external-secrets-system deployment/external-secrets
```

## Related Documentation

- [Operations Runbook](../../docs/operations/kubernetes-runbook.md) - Complete operational procedures
- [Deployment Guide](../../docs/deployment/infra.md) - Infrastructure overview
- [Monitoring](../../docs/operations/monitoring.md) - Observability setup
- [Secrets Management](../../docs/operations/secrets-management.md) - Secret rotation and management

## Links to Related Issues

- [subculture-collective/clipper#805](https://github.com/subculture-collective/clipper/issues/805) - Roadmap 5.0 Master Tracker
- [subculture-collective/clipper#852](https://github.com/subculture-collective/clipper/issues/852) - Kubernetes Cluster Setup (this implementation)
- [subculture-collective/clipper#836](https://github.com/subculture-collective/clipper/issues/836) - Infrastructure Modernization RFC

## Support

For questions or issues, please:
1. Check the [troubleshooting section](#troubleshooting)
2. Review the [operations runbook](../../docs/operations/kubernetes-runbook.md)
3. Open an issue on GitHub
