# Clipper Backend Chart

Helm chart for deploying the Clipper backend API service.

## Features

- Rolling updates with zero downtime
- Horizontal Pod Autoscaling (HPA)
- Liveness and readiness probes
- Pod Disruption Budget (PDB)
- Network policies for security
- TLS-enabled ingress
- ConfigMap for non-sensitive configuration
- External secrets integration

## Installation

```bash
helm install clipper-backend ./backend -n clipper-production
```

## Configuration

See [values.yaml](values.yaml) for all available configuration options.

### Key Values

- `replicaCount`: Number of replicas (default: 2)
- `image.repository`: Docker image repository
- `image.tag`: Image tag (default: "latest")
- `autoscaling.enabled`: Enable HPA (default: true)
- `autoscaling.minReplicas`: Minimum replicas (default: 2)
- `autoscaling.maxReplicas`: Maximum replicas (default: 10)
- `ingress.enabled`: Enable ingress (default: true)
- `resources`: CPU and memory requests/limits

## Examples

Production deployment:
```bash
helm install clipper-backend ./backend \
  -f examples/values-production.yaml \
  -n clipper-production
```

Staging deployment:
```bash
helm install clipper-backend ./backend \
  -f examples/values-staging.yaml \
  -n clipper-staging
```

## Upgrading

```bash
helm upgrade clipper-backend ./backend \
  --set image.tag=v1.2.0 \
  --reuse-values \
  -n clipper-production
```

## Rollback

```bash
helm rollback clipper-backend -n clipper-production
```
