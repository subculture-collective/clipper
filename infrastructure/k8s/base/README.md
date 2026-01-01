# HPA Metrics Infrastructure

This directory contains the infrastructure components required for Horizontal Pod Autoscaler (HPA) to function with both resource metrics (CPU/memory) and custom metrics (requests per second).

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

**Features:**
- Collects resource metrics from kubelet
- 15-second metric resolution
- Required for HPA resource-based scaling (CPU/memory)
- Runs in `kube-system` namespace

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
  wget -O- http://prometheus.clipper-monitoring.svc:9090/-/healthy

# Check if Prometheus has the metrics
kubectl port-forward -n clipper-monitoring svc/prometheus 9090:9090
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
- [HPA Operations Runbook](../../docs/operations/runbooks/hpa-scaling.md)
- [Infrastructure README](./README.md)
