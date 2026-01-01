---
title: "Kubernetes Scaling Guide"
summary: "Comprehensive guide to scaling Clipper on Kubernetes including HPA, cluster autoscaling, and resource optimization."
tags: ["operations", "kubernetes", "scaling", "performance"]
area: "operations"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2026-01-01
aliases: ["k8s-scaling", "kubernetes scaling", "autoscaling"]
---

# Kubernetes Scaling Guide

Complete guide to scaling Clipper's Kubernetes infrastructure for handling variable traffic loads efficiently and cost-effectively.

## Table of Contents

- [Overview](#overview)
- [Horizontal Pod Autoscaling (HPA)](#horizontal-pod-autoscaling-hpa)
- [Cluster Autoscaling](#cluster-autoscaling)
- [Vertical Pod Autoscaling (VPA)](#vertical-pod-autoscaling-vpa)
- [Database Scaling](#database-scaling)
- [Redis Cache Scaling](#redis-cache-scaling)
- [Monitoring Scaling Events](#monitoring-scaling-events)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

Clipper uses multiple scaling strategies to handle varying load:

1. **Horizontal Pod Autoscaling (HPA)** - Scale pod replicas based on CPU, memory, and custom metrics
2. **Cluster Autoscaling** - Add or remove nodes based on resource requests
3. **Vertical Pod Autoscaling (VPA)** - Adjust pod resource requests/limits (optional)
4. **Database Connection Pooling** - Scale database connections efficiently
5. **Cache Layer Scaling** - Scale Redis for session and cache management

### Scaling Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Load Balancer                       │
└─────────────────────┬──────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │      Ingress Controller    │
        └─────────────┬──────────────┘
                      │
        ┌─────────────┴─────────────┐
        │    HPA: Backend Pods      │  ← Horizontal Scaling (2-20 replicas)
        │  (CPU: 70%, Memory: 80%)  │
        └─────────────┬──────────────┘
                      │
        ┌─────────────┴─────────────┐
        │   Cluster Autoscaler      │  ← Node Scaling (2-10 nodes)
        │   (Node Pool Scaling)     │
        └───────────────────────────┘
```

---

## Horizontal Pod Autoscaling (HPA)

### Backend Service HPA

The backend service is configured with HPA to handle traffic spikes automatically.

#### Configuration

```yaml
# Production configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: clipper-backend
  namespace: clipper-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: clipper-backend
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30  # Double pods every 30s during spikes
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300  # 5 min stabilization
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60  # Reduce by 50% per minute max
      selectPolicy: Min
```

#### View HPA Status

```bash
# Check HPA status
kubectl get hpa -n clipper-production

# Detailed HPA info
kubectl describe hpa clipper-backend -n clipper-production

# Watch HPA in real-time
kubectl get hpa -n clipper-production -w
```

#### Adjust HPA Configuration

```bash
# Update min/max replicas
kubectl patch hpa clipper-backend -n clipper-production -p \
  '{"spec":{"minReplicas":5,"maxReplicas":30}}'

# Update CPU target
kubectl patch hpa clipper-backend -n clipper-production -p \
  '{"spec":{"metrics":[{"type":"Resource","resource":{"name":"cpu","target":{"type":"Utilization","averageUtilization":60}}}]}}'

# Via Helm
helm upgrade clipper ./helm/charts/clipper \
  -n clipper-production \
  --set backend.autoscaling.minReplicas=5 \
  --set backend.autoscaling.maxReplicas=30 \
  --reuse-values
```

### Frontend Service HPA

```yaml
# Frontend HPA configuration
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: clipper-frontend
  namespace: clipper-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: clipper-frontend
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### Custom Metrics HPA (Advanced)

For custom metrics like requests per second:

```yaml
metrics:
- type: Pods
  pods:
    metric:
      name: http_requests_per_second
    target:
      type: AverageValue
      averageValue: "1000"  # 1000 requests/sec per pod
```

**Requirements**:
- Prometheus Adapter installed
- Backend exposing custom metrics
- ServiceMonitor configured

---

## Cluster Autoscaling

Cluster autoscaling automatically adds or removes nodes based on pod resource requests.

### GKE Cluster Autoscaler

```bash
# Enable cluster autoscaler during creation
gcloud container clusters create clipper-prod \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10 \
  --region=us-central1

# Update existing cluster
gcloud container node-pools update default-pool \
  --cluster=clipper-prod \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=10 \
  --region=us-central1
```

### EKS Cluster Autoscaler

```bash
# Install cluster autoscaler
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

# Patch deployment to use correct cluster name
kubectl patch deployment cluster-autoscaler \
  -n kube-system \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"cluster-autoscaler","command":["./cluster-autoscaler","--v=4","--stderrthreshold=info","--cloud-provider=aws","--skip-nodes-with-local-storage=false","--expander=least-waste","--node-group-auto-discovery=asg:tag=k8s.io/cluster-autoscaler/enabled,k8s.io/cluster-autoscaler/clipper-prod"]}]}}}}'

# Configure node group in eksctl
eksctl create nodegroup \
  --cluster=clipper-prod \
  --name=standard-workers \
  --node-type=t3.large \
  --nodes=3 \
  --nodes-min=2 \
  --nodes-max=10 \
  --node-volume-size=50
```

### AKS Cluster Autoscaler

```bash
# Enable cluster autoscaler
az aks update \
  --resource-group clipper-rg \
  --name clipper-prod \
  --enable-cluster-autoscaler \
  --min-count 2 \
  --max-count 10

# Update autoscaler settings
az aks update \
  --resource-group clipper-rg \
  --name clipper-prod \
  --cluster-autoscaler-profile \
    scale-down-delay-after-add=10m \
    scale-down-unneeded-time=10m
```

### Monitor Cluster Autoscaler

```bash
# Check autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler --tail=100 -f

# View node status
kubectl get nodes -o wide

# Check pending pods (triggers scale-up)
kubectl get pods --all-namespaces --field-selector=status.phase=Pending
```

### Cluster Autoscaler Configuration

```yaml
# ConfigMap for cluster autoscaler tuning
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-autoscaler-status
  namespace: kube-system
data:
  scale-down-delay-after-add: "10m"        # Wait before scaling down new nodes
  scale-down-unneeded-time: "10m"          # Time before removing underutilized nodes
  scale-down-utilization-threshold: "0.5"  # 50% utilization threshold
  max-node-provision-time: "15m"           # Max time to provision new node
  skip-nodes-with-local-storage: "false"   # Scale nodes with local storage
  skip-nodes-with-system-pods: "true"      # Don't scale nodes with system pods
```

---

## Vertical Pod Autoscaling (VPA)

VPA automatically adjusts pod resource requests and limits based on actual usage.

**⚠️ WARNING**: VPA requires pod restarts and can cause disruption. Use with caution in production.

### Install VPA

```bash
# Install VPA components
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

### Configure VPA

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: clipper-backend-vpa
  namespace: clipper-production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: clipper-backend
  updatePolicy:
    updateMode: "Auto"  # Options: Off, Initial, Recreate, Auto
  resourcePolicy:
    containerPolicies:
    - containerName: backend
      minAllowed:
        cpu: 100m
        memory: 256Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
      controlledResources: ["cpu", "memory"]
```

### VPA Recommendations

```bash
# Get VPA recommendations (without applying)
kubectl get vpa -n clipper-production

# View detailed recommendations
kubectl describe vpa clipper-backend-vpa -n clipper-production
```

**Best Practice**: Use VPA in "Off" or "Initial" mode to get recommendations without automatic updates:

```yaml
updatePolicy:
  updateMode: "Off"  # Get recommendations only
```

---

## Database Scaling

### PostgreSQL Scaling Strategies

#### 1. Vertical Scaling (Increase Resources)

```bash
# Increase PostgreSQL resources via Helm
helm upgrade clipper ./helm/charts/clipper \
  -n clipper-production \
  --set postgres.resources.requests.cpu=500m \
  --set postgres.resources.requests.memory=2Gi \
  --set postgres.resources.limits.cpu=2000m \
  --set postgres.resources.limits.memory=4Gi \
  --reuse-values
```

#### 2. Connection Pooling with PgBouncer

```yaml
# PgBouncer deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: clipper-production
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: pgbouncer
        image: edoburu/pgbouncer:1.21.0
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        env:
        - name: DATABASE_URL
          value: "postgres://clipper:password@postgres:5432/clipper_db"
        - name: POOL_MODE
          value: "transaction"
        - name: MAX_CLIENT_CONN
          value: "1000"
        - name: DEFAULT_POOL_SIZE
          value: "25"
        - name: RESERVE_POOL_SIZE
          value: "5"
```

#### 3. Read Replicas

```bash
# Create read replica (managed PostgreSQL)
# GCP Cloud SQL
gcloud sql replicas create clipper-prod-replica-1 \
  --master-instance-name=clipper-prod-db \
  --region=us-central1

# AWS RDS
aws rds create-db-instance-read-replica \
  --db-instance-identifier clipper-prod-replica-1 \
  --source-db-instance-identifier clipper-prod-db \
  --db-instance-class db.r5.large
```

### Monitor Database Performance

```bash
# Check database connections
kubectl exec -it statefulset/postgres -n clipper-production -- \
  psql -U clipper -d clipper_db -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
kubectl exec -it statefulset/postgres -n clipper-production -- \
  psql -U clipper -d clipper_db -c \
  "SELECT query, calls, total_exec_time, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Connection pool stats (PgBouncer)
kubectl exec -it deployment/pgbouncer -n clipper-production -- \
  psql -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
```

---

## Redis Cache Scaling

### Horizontal Scaling with Redis Cluster

```yaml
# Redis Cluster (3 master + 3 replica)
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cluster
  namespace: clipper-production
spec:
  serviceName: redis-cluster
  replicas: 6
  template:
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
        - redis-server
        - --cluster-enabled
        - "yes"
        - --cluster-config-file
        - /data/nodes.conf
        - --cluster-node-timeout
        - "5000"
        - --appendonly
        - "yes"
```

### Vertical Scaling

```bash
# Increase Redis memory
helm upgrade clipper ./helm/charts/clipper \
  -n clipper-production \
  --set redis.resources.limits.memory=2Gi \
  --set redis.config.maxmemory=1.5Gi \
  --reuse-values
```

### Monitor Redis Performance

```bash
# Redis stats
kubectl exec -it statefulset/redis -n clipper-production -- redis-cli INFO stats

# Memory usage
kubectl exec -it statefulset/redis -n clipper-production -- redis-cli INFO memory

# Hit rate
kubectl exec -it statefulset/redis -n clipper-production -- redis-cli INFO stats | grep hit
```

---

## Monitoring Scaling Events

### Prometheus Queries

```promql
# HPA current replicas
kube_horizontalpodautoscaler_status_current_replicas{namespace="clipper-production"}

# HPA desired replicas
kube_horizontalpodautoscaler_status_desired_replicas{namespace="clipper-production"}

# Pod CPU usage
container_cpu_usage_seconds_total{namespace="clipper-production",pod=~"clipper-backend.*"}

# Pod memory usage
container_memory_working_set_bytes{namespace="clipper-production",pod=~"clipper-backend.*"}

# Cluster autoscaler events
rate(cluster_autoscaler_scaled_up_nodes_total[5m])
```

### Grafana Dashboards

```bash
# Import Kubernetes Capacity Dashboard
# Dashboard ID: 5228

# Import HPA Dashboard
# Dashboard ID: 7249
```

### Scaling Events

```bash
# View scaling events
kubectl get events -n clipper-production --sort-by='.lastTimestamp' | grep -i scale

# Watch HPA events
kubectl get events -n clipper-production -w | grep HorizontalPodAutoscaler
```

---

## Best Practices

### Resource Requests and Limits

**Always set resource requests and limits**:

```yaml
resources:
  requests:
    cpu: 250m      # Guaranteed CPU
    memory: 512Mi  # Guaranteed memory
  limits:
    cpu: 1000m     # Max CPU (4x request)
    memory: 1Gi    # Max memory (2x request)
```

**Guidelines**:
- Set `requests` based on baseline usage
- Set `limits` at 2-4x `requests` for bursting
- Monitor actual usage and adjust over time

### HPA Configuration

1. **Start conservative**: Begin with higher thresholds (80%) and adjust down
2. **Stabilization windows**: Use 5-10 minute scale-down windows to prevent flapping
3. **Min replicas**: Set to 2+ for high availability
4. **Max replicas**: Set based on maximum expected load (test with load testing)

### Cluster Autoscaling

1. **Node headroom**: Configure 10-20% buffer to prevent pod pending delays
2. **Scale-down delay**: Wait 10+ minutes before removing nodes
3. **Multiple node pools**: Use different instance types for different workloads
4. **Spot/preemptible instances**: Use for non-critical workloads (30-80% cost savings)

### Load Testing

**Test scaling before production**:

```bash
# Load test with k6
k6 run --vus 100 --duration 10m load-test.js

# Watch pods scale
kubectl get pods -n clipper-production -w

# Monitor HPA
kubectl get hpa -n clipper-production -w
```

---

## Troubleshooting

### HPA Not Scaling

**Symptoms**: HPA shows `<unknown>` for metrics

```bash
# Check metrics server
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml

# Check metrics server pods
kubectl get pods -n kube-system | grep metrics-server

# Test metrics API
kubectl top nodes
kubectl top pods -n clipper-production
```

**Solution**: Install or restart metrics-server:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Pods Pending (Not Enough Resources)

**Symptoms**: Pods stuck in `Pending` state

```bash
# Check pod events
kubectl describe pod <pod-name> -n clipper-production

# Common error:
# "0/3 nodes are available: 3 Insufficient cpu."
```

**Solutions**:

1. **Increase cluster size**:
   ```bash
   # GKE
   gcloud container clusters resize clipper-prod --num-nodes 5
   
   # EKS
   eksctl scale nodegroup --cluster=clipper-prod --nodes=5 standard-workers
   ```

2. **Adjust pod resource requests**:
   ```bash
   helm upgrade clipper ./helm/charts/clipper \
     --set backend.resources.requests.cpu=100m \
     --reuse-values
   ```

3. **Enable cluster autoscaler** (see section above)

### Cluster Not Scaling Down

**Symptoms**: Nodes not removed despite low utilization

**Common causes**:
- Pods with local storage
- Pods without PodDisruptionBudget
- System pods on nodes
- Scale-down disabled

**Check**:

```bash
# Check autoscaler logs
kubectl logs -n kube-system deployment/cluster-autoscaler | grep -i "scale down"

# Check node annotations
kubectl describe node <node-name> | grep "cluster-autoscaler"
```

**Solutions**:

```bash
# Enable scale-down
kubectl patch configmap cluster-autoscaler-status -n kube-system \
  -p '{"data":{"scale-down-enabled":"true"}}'

# Cordon and drain node manually
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data
```

### HPA Flapping (Rapid Scale Up/Down)

**Symptoms**: Replicas constantly changing

**Solutions**:

1. **Increase stabilization window**:
   ```bash
   kubectl patch hpa clipper-backend -n clipper-production -p \
     '{"spec":{"behavior":{"scaleDown":{"stabilizationWindowSeconds":600}}}}'
   ```

2. **Adjust thresholds**: Increase CPU/memory targets to reduce sensitivity

3. **Use custom metrics**: Add request-based metrics for more stable scaling

---

## Related Documentation

- [[kubernetes-runbook|Kubernetes Operations Runbook]] - Complete operational procedures
- [[monitoring|Monitoring & Observability]] - Metrics and alerting
- [[performance|Performance Optimization]] - Application-level optimizations
- [[../deployment/infra|Infrastructure Overview]] - Architecture and design

## Related Issues

- [#852 - Kubernetes Cluster Setup](https://github.com/subculture-collective/clipper/issues/852)
- [#853 - Application Helm Charts](https://github.com/subculture-collective/clipper/issues/853)
- [#854 - Kubernetes Documentation](https://github.com/subculture-collective/clipper/issues/854)
- [#805 - Roadmap 5.0 Master Tracker](https://github.com/subculture-collective/clipper/issues/805)

---

[[index|← Back to Operations]]
