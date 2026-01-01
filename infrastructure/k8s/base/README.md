# Kubernetes Base Infrastructure

This directory contains the core infrastructure components for the Clipper Kubernetes cluster, including HPA metrics, resource quotas, and namespace configurations.

## Components

### 1. Metrics Server (`metrics-server.yaml`)

Provides resource metrics (CPU and memory utilization) for HPA.

**Installation:**
```bash
kubectl apply -f metrics-server.yaml
```

**Verification:**
```bash
# Check deployment
kubectl get deployment metrics-server -n kube-system

# Verify metrics are available
kubectl top nodes
kubectl top pods -n clipper-production
```

### Features:**
- Collects resource metrics from kubelet
- 15-second metric resolution
- Required for HPA resource-based scaling (CPU/memory)
- Runs in `kube-system` namespace

### 3. Resource Quotas (`resource-quotas.yaml`)

Enforces hard limits on aggregate resource consumption per namespace to prevent resource exhaustion.

**Installation:**
```bash
kubectl apply -f resource-quotas.yaml
```

**Verification:**
```bash
# Check quota status
kubectl describe resourcequota -n clipper-production
kubectl describe resourcequota -n clipper-staging
kubectl describe resourcequota -n clipper-monitoring

# View quota usage across all namespaces
kubectl get resourcequota -A
```

**Features:**
- CPU and memory quotas per namespace
- Storage and PVC count limits
- Pod and service count limits
- Production: 20 CPU / 40Gi memory requests
- Staging: 10 CPU / 20Gi memory requests
- Monitoring: 8 CPU / 16Gi memory requests

### 4. Limit Ranges (`limit-ranges.yaml`)

Sets default, minimum, and maximum resource constraints for individual pods and containers.

**Installation:**
```bash
kubectl apply -f limit-ranges.yaml
```

**Verification:**
```bash
# Check limit ranges
kubectl describe limitrange -n clipper-production
kubectl describe limitrange -n clipper-staging
kubectl describe limitrange -n clipper-monitoring
```

**Features:**
- Default resource requests and limits for containers
- Enforces minimum and maximum resource constraints
- Prevents resource over-allocation
- Automatically applied to pods without explicit resources
- Different limits per environment (production/staging/monitoring)

**Related Documentation:**
- [Resource Quotas & Limits Guide](../../../docs/operations/resource-quotas.md)
- [Grafana Dashboard](../../../monitoring/dashboards/resource-quotas.json)
- Related Issues: [#853](https://github.com/subculture-collective/clipper/issues/853), [#805](https://github.com/subculture-collective/clipper/issues/805)

### 5. Namespaces (`namespaces.yaml`)

Creates and configures the Clipper namespaces.

**Installation:**
```bash
kubectl apply -f namespaces.yaml
```

**Namespaces:**
- `clipper-production` - Production workloads
- `clipper-staging` - Staging/testing workloads
- `clipper-monitoring` - Monitoring infrastructure

### 2. Prometheus Adapter (`prometheus-adapter.yaml`)

Exposes custom metrics from Prometheus for HPA, enabling scaling based on application-specific metrics like requests per second.

**Prerequisites:**
- Prometheus installed and running in the cluster
- Prometheus service accessible at `http://prometheus.clipper-monitoring.svc:9090`
- Application pods exposing metrics that Prometheus scrapes

**Installation:**
```bash
kubectl apply -f prometheus-adapter.yaml
```

**Verification:**
```bash
# Check deployment
kubectl get deployment prometheus-adapter -n custom-metrics

# Verify custom metrics API
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq .

# Check specific metric
kubectl get --raw "/apis/custom.metrics.k8s.io/namespaces/clipper-production/pods/*/http_requests_per_second" | jq .
```

**Configuration:**
The adapter is configured via the `prometheus-adapter-config` ConfigMap with two main rules:

1. **Generic HTTP requests per second**: Converts any `http_requests_total` metric to `http_requests_per_second`
2. **Application-specific RPS**: Custom metric specifically for `clipper-backend` and `clipper-frontend`

To add new custom metrics, edit the ConfigMap:
```bash
kubectl edit configmap prometheus-adapter-config -n custom-metrics
kubectl rollout restart deployment/prometheus-adapter -n custom-metrics
```

**Features:**
- Exposes Prometheus metrics as Kubernetes custom metrics
- 1-minute metrics relist interval
- 2-minute rate window for request calculations
- Runs in `custom-metrics` namespace

## HPA Configuration

With both components installed, HPA can scale based on:

1. **CPU utilization** (from Metrics Server)
2. **Memory utilization** (from Metrics Server)
3. **HTTP requests per second** (from Prometheus Adapter)

Example HPA using all three metrics:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: clipper-backend
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: clipper-backend
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
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"
```

## Troubleshooting

### Metrics Server Issues

**Symptoms:**
- `kubectl top` commands fail
- HPA shows "unable to get metrics"

**Debug:**
```bash
# Check logs
kubectl logs -n kube-system deployment/metrics-server

# Check API service
kubectl get apiservice v1beta1.metrics.k8s.io
```

**Common Issues:**
1. **Network connectivity**: Ensure metrics-server can reach kubelets
2. **Certificate issues**: Check if TLS validation needs to be skipped
3. **Resource constraints**: Ensure metrics-server has adequate resources

### Prometheus Adapter Issues

**Symptoms:**
- Custom metrics not appearing
- HPA shows "unable to get custom metrics"

**Debug:**
```bash
# Check logs
kubectl logs -n custom-metrics deployment/prometheus-adapter

# Test Prometheus connectivity
kubectl exec -it -n custom-metrics deployment/prometheus-adapter -- \
  wget -O- http://clipper-monitoring-prometheus-server.clipper-monitoring.svc:9090/-/healthy

# Check if Prometheus has the metrics
kubectl port-forward -n clipper-monitoring svc/clipper-monitoring-prometheus-server 9090:9090
# Visit http://localhost:9090 and query: rate(http_requests_total[2m])
```

**Common Issues:**
1. **Prometheus not accessible**: Verify service name and namespace
2. **Metrics not exposed**: Ensure application pods expose metrics
3. **Configuration errors**: Check ConfigMap for syntax errors
4. **Wrong metric names**: Verify metric names match Prometheus

## Monitoring

Key metrics to monitor:

- **Metrics Server health**: `up{job="metrics-server"}`
- **Prometheus Adapter health**: `up{job="prometheus-adapter"}`
- **HPA status**: `kube_horizontalpodautoscaler_status_*`

Alerts are configured in `monitoring/alerts.yml`:
- `MetricsServerDown`
- `HPACustomMetricsNotAvailable`
- `HPAMetricsUnavailable`

## Performance Considerations

### Metrics Server
- **CPU**: 100m request, 1000m limit
- **Memory**: 200Mi request, 1Gi limit
- **Metric resolution**: 15 seconds
- **Recommended**: Run 1-2 replicas (configured as single replica by default)

### Prometheus Adapter
- **CPU**: 100m request, 500m limit
- **Memory**: 128Mi request, 512Mi limit
- **Relist interval**: 1 minute
- **Recommended**: Run 2 replicas for HA (configured)

## Security

Both components follow security best practices:

- **Non-root**: Runs as non-root user
- **Read-only filesystem**: Root filesystem is read-only
- **Dropped capabilities**: All Linux capabilities dropped
- **Seccomp**: RuntimeDefault seccomp profile
- **RBAC**: Least-privilege service accounts

## Scaling Behavior

HPA evaluates metrics every 15 seconds and applies the following logic:

1. **Multiple metrics**: Uses the metric that suggests the highest number of replicas
2. **Scale-up**: Immediate (no stabilization by default)
3. **Scale-down**: 5-minute stabilization window to prevent flapping
4. **Scale-down rate**: Max 50% of current pods per minute
5. **Scale-up rate**: Max 100% or 2 pods per 30 seconds

See `helm/charts/backend/values.yaml` and `helm/charts/frontend/values.yaml` for configuration details.

## Additional Resources

- [Metrics Server GitHub](https://github.com/kubernetes-sigs/metrics-server)
- [Prometheus Adapter GitHub](https://github.com/kubernetes-sigs/prometheus-adapter)
- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [HPA Operations Runbook](../../../docs/operations/runbooks/hpa-scaling.md)
- [Infrastructure README](../README.md)
