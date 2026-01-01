---
title: "Kubernetes Cost Optimization Guide"
summary: "Best practices and strategies for optimizing Kubernetes infrastructure costs while maintaining performance and reliability."
tags: ["operations", "kubernetes", "cost-optimization", "finops"]
area: "operations"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2026-01-01
aliases: ["k8s-cost", "kubernetes costs", "finops"]
---

# Kubernetes Cost Optimization Guide

Strategies and best practices for reducing Kubernetes infrastructure costs while maintaining performance, reliability, and availability.

## Table of Contents

- [Cost Overview](#cost-overview)
- [Resource Right-Sizing](#resource-right-sizing)
- [Node Optimization](#node-optimization)
- [Storage Optimization](#storage-optimization)
- [Network Optimization](#network-optimization)
- [Monitoring & Visibility](#monitoring--visibility)
- [Cost Allocation](#cost-allocation)
- [Best Practices](#best-practices)

---

## Cost Overview

### Typical Kubernetes Cost Breakdown

```
┌─────────────────────────────────────────┐
│   Total Monthly Cost: $900-1600 USD     │
├─────────────────────────────────────────┤
│                                         │
│  Compute (Nodes)        45-55%          │ $400-880
│  ├─ Worker nodes                        │
│  ├─ Control plane (EKS only)            │
│  └─ Reserved/spot instances             │
│                                         │
│  Storage (Persistent)   15-25%          │ $135-400
│  ├─ PersistentVolumes                   │
│  ├─ Snapshots/backups                   │
│  └─ Object storage (S3/GCS)             │
│                                         │
│  Networking             15-20%          │ $135-320
│  ├─ LoadBalancers                       │
│  ├─ Data transfer                       │
│  └─ NAT Gateway                         │
│                                         │
│  Add-ons & Services     10-15%          │ $90-240
│  ├─ Monitoring (Grafana Cloud)          │
│  ├─ WAF/DDoS protection                 │
│  └─ Secret managers                     │
│                                         │
└─────────────────────────────────────────┘
```

### Cloud Provider Comparison

| Provider | Control Plane | Compute (3 nodes) | Est. Total |
|----------|--------------|-------------------|------------|
| **GKE** | Free | $150-200/mo | $400-600/mo |
| **EKS** | $73/mo | $150-200/mo | $450-700/mo |
| **AKS** | Free | $190-300/mo | $450-700/mo |

*Assumes 3x e2-standard-4 (GKE), t3.large (EKS), or Standard_D4s_v3 (AKS) nodes*

---

## Resource Right-Sizing

### Analyze Resource Usage

```bash
# Check actual resource usage
kubectl top nodes
kubectl top pods --all-namespaces

# Compare requests vs actual usage
kubectl get pods --all-namespaces -o custom-columns=\
NAME:.metadata.name,\
NAMESPACE:.metadata.namespace,\
CPU_REQUEST:.spec.containers[*].resources.requests.cpu,\
MEM_REQUEST:.spec.containers[*].resources.requests.memory

# Get resource utilization
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Identify Over-Provisioned Pods

```bash
# Pods using less than 50% of requested resources
kubectl top pods --all-namespaces | awk 'NR>1 {if ($3 < 50) print $0}'
```

### Right-Sizing Recommendations

| Service | Current | Optimized | Savings |
|---------|---------|-----------|---------|
| **Backend (Production)** | cpu: 250m<br>memory: 512Mi | cpu: 200m<br>memory: 400Mi | ~20% |
| **Backend (Staging)** | cpu: 250m<br>memory: 512Mi | cpu: 100m<br>memory: 256Mi | ~50% |
| **Frontend** | cpu: 100m<br>memory: 128Mi | cpu: 50m<br>memory: 96Mi | ~25% |
| **PostgreSQL** | cpu: 250m<br>memory: 512Mi | Depends on load | Varies |

### Apply Optimized Resources

```bash
# Update backend resources
helm upgrade clipper ./helm/charts/clipper \
  -n clipper-production \
  --set backend.resources.requests.cpu=200m \
  --set backend.resources.requests.memory=400Mi \
  --reuse-values

# Update staging with lower resources
helm upgrade clipper ./helm/charts/clipper \
  -n clipper-staging \
  --set backend.resources.requests.cpu=100m \
  --set backend.resources.requests.memory=256Mi \
  --reuse-values
```

**Estimated Savings**: $50-100/month

---

## Node Optimization

### Cluster Autoscaler

Enable cluster autoscaler to automatically scale nodes based on demand:

```bash
# GKE
gcloud container clusters update clipper-prod \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10

# EKS - already configured in provision script
# AKS
az aks update \
  --resource-group clipper-rg \
  --name clipper-prod \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 10
```

**Savings**: Scale down to min nodes during off-hours (50% savings during low traffic)

### Spot/Preemptible Instances

Use spot instances for non-critical workloads (30-80% cost savings):

#### GKE Preemptible Nodes

```bash
# Create preemptible node pool
gcloud container node-pools create preemptible-pool \
  --cluster=clipper-prod \
  --region=us-central1 \
  --preemptible \
  --machine-type=e2-standard-4 \
  --num-nodes=2 \
  --enable-autoscaling \
  --min-nodes=0 \
  --max-nodes=5

# Label nodes for workload targeting
kubectl label nodes <node-name> workload-type=preemptible
```

#### AWS Spot Instances

```bash
# Create spot instance node group (via eksctl)
eksctl create nodegroup \
  --cluster=clipper-prod \
  --name=spot-workers \
  --instance-types=t3.large,t3a.large \
  --spot \
  --nodes-min=0 \
  --nodes-max=5 \
  --nodes=2
```

#### Azure Spot VMs

```bash
# Create spot node pool
az aks nodepool add \
  --resource-group clipper-rg \
  --cluster-name clipper-prod \
  --name spotpool \
  --priority Spot \
  --eviction-policy Delete \
  --spot-max-price -1 \
  --enable-cluster-autoscaler \
  --min-count 0 \
  --max-count 5 \
  --node-count 2
```

#### Target Spot Nodes

```yaml
# Deployment with spot node affinity
spec:
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: workload-type
                operator: In
                values:
                - preemptible
      tolerations:
      - key: "preemptible"
        operator: "Exists"
```

**Recommended for**:
- Development/staging environments (100% spot)
- Background jobs (batch processing, ETL)
- Stateless services with PodDisruptionBudget

**NOT recommended for**:
- Databases (PostgreSQL, Redis)
- Critical production services without PDB

**Estimated Savings**: $100-300/month (30-50% reduction on compute)

### Node Pool Segregation

Separate node pools by workload type:

```bash
# Production pool (on-demand, higher resources)
gcloud container node-pools create production-pool \
  --cluster=clipper-prod \
  --machine-type=e2-standard-4 \
  --num-nodes=2 \
  --min-nodes=2 \
  --max-nodes=5

# Batch jobs pool (preemptible, can scale to 0)
gcloud container node-pools create batch-pool \
  --cluster=clipper-prod \
  --machine-type=e2-standard-2 \
  --preemptible \
  --num-nodes=0 \
  --min-nodes=0 \
  --max-nodes=10 \
  --enable-autoscaling
```

### Reserved Instances / Committed Use Discounts

For stable workloads, commit to 1-3 year terms for discounts:

| Provider | Term | Discount |
|----------|------|----------|
| **GCP Committed Use** | 1 year | 25-37% |
| **GCP Committed Use** | 3 years | 40-55% |
| **AWS Reserved Instances** | 1 year | 30-40% |
| **AWS Reserved Instances** | 3 years | 50-60% |
| **Azure Reserved VMs** | 1 year | 30-40% |
| **Azure Reserved VMs** | 3 years | 50-60% |

**Recommendation**: Reserve capacity for minimum baseline (2-3 nodes)

**Estimated Savings**: $50-150/month

---

## Storage Optimization

### Storage Class Selection

Use appropriate storage classes for workload:

```yaml
# Production database - High performance SSD
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  storageClassName: ssd       # or pd-ssd (GKE), gp3 (AWS)
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi

# Backups - Standard/Cold storage
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: backup-storage
spec:
  storageClassName: standard  # or pd-standard (GKE), gp2 (AWS)
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
```

**Cost Comparison**:
- **SSD (Premium)**: $0.17-0.20/GB/month
- **Standard HDD**: $0.04-0.08/GB/month
- **Savings**: 60-75% for non-critical storage

### Volume Snapshot Management

Automate cleanup of old snapshots:

```bash
# Delete snapshots older than 14 days
kubectl get volumesnapshot -n clipper-production -o json | \
  jq -r '.items[] | select(.metadata.creationTimestamp | fromdateiso8601 < (now - 14*86400)) | .metadata.name' | \
  xargs -I {} kubectl delete volumesnapshot {} -n clipper-production
```

**Estimated Savings**: $10-30/month

### Object Storage Lifecycle Policies

Configure automatic tiering and deletion:

#### GCS Lifecycle Policy

```json
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "SetStorageClass", "storageClass": "NEARLINE"},
        "condition": {"age": 30}
      },
      {
        "action": {"type": "SetStorageClass", "storageClass": "COLDLINE"},
        "condition": {"age": 90}
      },
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
```

```bash
gsutil lifecycle set lifecycle.json gs://clipper-backups
```

#### S3 Lifecycle Policy

```json
{
  "Rules": [
    {
      "Id": "ArchiveOldBackups",
      "Status": "Enabled",
      "Transitions": [
        {"Days": 30, "StorageClass": "STANDARD_IA"},
        {"Days": 90, "StorageClass": "GLACIER"}
      ],
      "Expiration": {"Days": 365}
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket clipper-backups \
  --lifecycle-configuration file://lifecycle.json
```

**Estimated Savings**: $20-50/month

---

## Network Optimization

### LoadBalancer Consolidation

Use single LoadBalancer with Ingress instead of multiple LoadBalancers:

**Before** (Multiple LoadBalancers):
```yaml
# $15/month per LoadBalancer
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: LoadBalancer  # ❌ $15/mo
---
apiVersion: v1
kind: Service
metadata:
  name: frontend
spec:
  type: LoadBalancer  # ❌ $15/mo
# Total: $30/month
```

**After** (Single LoadBalancer + Ingress):
```yaml
# Single LoadBalancer for ingress controller
apiVersion: v1
kind: Service
metadata:
  name: ingress-nginx
  namespace: ingress-nginx
spec:
  type: LoadBalancer  # ✅ $15/mo

# Services use ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  name: backend
spec:
  type: ClusterIP  # ✅ Free

# Ingress routes traffic
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: clipper
spec:
  rules:
  - host: clpr.tv
    http:
      paths:
      - path: /api
        backend:
          service:
            name: backend
            port:
              number: 80
# Total: $15/month
```

**Savings**: $15-30/month per eliminated LoadBalancer

### Data Transfer Optimization

Reduce cross-region/cross-zone data transfer:

1. **Use regional storage** for PersistentVolumes
2. **Deploy pods in same zone** as storage when possible
3. **Use CDN** for static assets (Cloudflare, CloudFront)
4. **Compress responses** (gzip, brotli)

```yaml
# Pod affinity for zone colocation
affinity:
  podAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchLabels:
            app: backend
        topologyKey: topology.kubernetes.io/zone
```

**Estimated Savings**: $20-50/month

### NAT Gateway Optimization

**AWS**: NAT Gateway costs $0.045/hour ($32/month) + data processing

**Alternatives**:
1. **Use VPC endpoints** for AWS services (S3, DynamoDB) - Free
2. **Public subnets** for non-sensitive workloads
3. **NAT instance** on t3.micro ($7/month) for low traffic

```bash
# Create VPC endpoint for S3 (free)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-xxx \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-xxx
```

**Estimated Savings**: $20-60/month (if replacing NAT Gateway)

---

## Monitoring & Visibility

### Cost Monitoring Tools

#### Kubecost

Free open-source cost allocation for Kubernetes:

```bash
# Install Kubecost
helm repo add kubecost https://kubecost.github.io/cost-analyzer/
helm install kubecost kubecost/cost-analyzer \
  -n kubecost --create-namespace \
  --set kubecostToken="<your-token>"

# Access UI
kubectl port-forward -n kubecost svc/kubecost-cost-analyzer 9090:9090
open http://localhost:9090
```

Features:
- Per-namespace cost breakdown
- Cost allocation by labels
- Savings recommendations
- Budget alerts

#### Cloud Provider Cost Tools

```bash
# GCP: Enable Cost Management API
gcloud services enable cloudbilling.googleapis.com

# AWS: Enable Cost Explorer
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --group-by Type=TAG,Key=kubernetes.io/cluster/clipper-prod

# Azure: Query costs
az consumption usage list \
  --start-date 2026-01-01 \
  --end-date 2026-01-31 \
  --query "[?contains(instanceName, 'clipper-prod')]"
```

### Resource Monitoring Queries

```promql
# Total CPU requests by namespace
sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace)

# Total memory requests by namespace
sum(kube_pod_container_resource_requests{resource="memory"}) by (namespace)

# Pod count by namespace
count(kube_pod_info) by (namespace)

# PVC size by namespace
sum(kube_persistentvolumeclaim_resource_requests_storage_bytes) by (namespace)
```

---

## Cost Allocation

### Label Strategy

Implement consistent labeling for cost tracking:

```yaml
metadata:
  labels:
    app: clipper-backend
    team: engineering
    environment: production
    cost-center: ops
    project: clipper
```

### Namespace-Based Billing

Separate namespaces by cost center:

```yaml
# Production namespace
apiVersion: v1
kind: Namespace
metadata:
  name: clipper-production
  labels:
    cost-center: revenue
    environment: production

# Staging namespace
apiVersion: v1
kind: Namespace
metadata:
  name: clipper-staging
  labels:
    cost-center: engineering
    environment: staging

# Monitoring namespace
apiVersion: v1
kind: Namespace
metadata:
  name: clipper-monitoring
  labels:
    cost-center: ops
    environment: shared
```

### Resource Quotas by Environment

```yaml
# Production - higher limits
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: clipper-production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi

# Staging - lower limits
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: clipper-staging
spec:
  hard:
    requests.cpu: "5"
    requests.memory: 10Gi
    limits.cpu: "10"
    limits.memory: 20Gi
```

---

## Best Practices

### Cost Optimization Checklist

- [ ] **Enable cluster autoscaler** (scale down during off-hours)
- [ ] **Right-size pod resources** (analyze actual usage)
- [ ] **Use HPA** (scale pods instead of over-provisioning)
- [ ] **Implement spot/preemptible nodes** (30-80% savings)
- [ ] **Consolidate LoadBalancers** (use Ingress)
- [ ] **Set resource quotas** (prevent runaway costs)
- [ ] **Configure storage lifecycle** (auto-delete old backups)
- [ ] **Use appropriate storage classes** (standard for non-critical)
- [ ] **Enable cost monitoring** (Kubecost or cloud provider tools)
- [ ] **Reserve baseline capacity** (committed use discounts)
- [ ] **Compress data transfer** (reduce bandwidth costs)
- [ ] **Use CDN for static assets** (reduce origin traffic)
- [ ] **Delete unused resources** (PVCs, snapshots, test namespaces)
- [ ] **Shut down staging overnight** (50% savings on staging)
- [ ] **Review costs monthly** (identify trends and anomalies)

### Staging Environment Schedule

Automate staging environment shutdown during off-hours:

```yaml
# CronJob to scale down staging at 6 PM
apiVersion: batch/v1
kind: CronJob
metadata:
  name: staging-shutdown
  namespace: clipper-staging
spec:
  schedule: "0 18 * * 1-5"  # 6 PM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scaler
            image: bitnami/kubectl:1.31.1
            command:
            - /bin/sh
            - -c
            - |
              kubectl scale deployment --all --replicas=0 -n clipper-staging
          restartPolicy: OnFailure

# CronJob to scale up staging at 8 AM
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: staging-startup
  namespace: clipper-staging
spec:
  schedule: "0 8 * * 1-5"  # 8 AM weekdays
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: scaler
            image: bitnami/kubectl:1.31.1
            command:
            - /bin/sh
            - -c
            - |
              kubectl scale deployment clipper-backend --replicas=2 -n clipper-staging
              kubectl scale deployment clipper-frontend --replicas=2 -n clipper-staging
          restartPolicy: OnFailure
```

**Savings**: ~$150-200/month (50% reduction on staging costs)

### Monthly Cost Review

```bash
#!/bin/bash
# monthly-cost-review.sh

echo "=== Kubernetes Cost Review ==="
echo "Date: $(date)"
echo

# Node costs
echo "Node Count and Types:"
kubectl get nodes -o custom-columns=NAME:.metadata.name,TYPE:.metadata.labels."node\.kubernetes\.io/instance-type"

# Resource usage
echo -e "\nResource Usage:"
kubectl top nodes

# Namespace costs (requires Kubecost)
echo -e "\nTop 5 Namespaces by Cost:"
kubectl exec -n kubecost deployment/kubecost-cost-analyzer -- \
  curl -s http://localhost:9090/model/allocation \
  | jq -r '.data[] | "\(.name): $\(.totalCost)"' \
  | sort -t '$' -k2 -rn \
  | head -5

# Unused resources
echo -e "\nUnused PVCs:"
kubectl get pvc --all-namespaces \
  --field-selector=status.phase=Bound \
  -o json | jq -r '.items[] | select(.spec.volumeName != null and (.metadata.annotations."pv.kubernetes.io/bind-completed" // "false") == "yes") | "\(.metadata.namespace)/\(.metadata.name)"'
```

---

## Summary: Estimated Total Savings

| Optimization | Monthly Savings | Implementation Effort |
|--------------|----------------|---------------------|
| Resource right-sizing | $50-100 | Low (1-2 hours) |
| Spot/preemptible instances | $100-300 | Medium (4-6 hours) |
| LoadBalancer consolidation | $15-30 | Low (1 hour) |
| Storage optimization | $30-80 | Low (2-3 hours) |
| Staging shutdown schedule | $150-200 | Low (1 hour) |
| Reserved instances | $50-150 | Low (1 hour) |
| Network optimization | $20-50 | Medium (2-4 hours) |
| **Total Potential Savings** | **$415-910/month** | **12-19 hours** |

**ROI**: 25-50% cost reduction with ~2-3 weeks implementation effort

---

## Related Documentation

- [[kubernetes-runbook|Kubernetes Operations Runbook]] - Operational procedures
- [[kubernetes-scaling|Kubernetes Scaling Guide]] - Autoscaling strategies
- [[monitoring|Monitoring & Observability]] - Metrics and dashboards
- [[../deployment/infra|Infrastructure Overview]] - Architecture

## Related Issues

- [#852 - Kubernetes Cluster Setup](https://github.com/subculture-collective/clipper/issues/852)
- [#853 - Application Helm Charts](https://github.com/subculture-collective/clipper/issues/853)
- [#854 - Kubernetes Documentation](https://github.com/subculture-collective/clipper/issues/854)
- [#805 - Roadmap 5.0 Master Tracker](https://github.com/subculture-collective/clipper/issues/805)

---

[[index|← Back to Operations]]
