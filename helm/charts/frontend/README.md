# Clipper Frontend Chart

Helm chart for deploying the Clipper frontend web application.

## Features

- Rolling updates with zero downtime
- Horizontal Pod Autoscaling (HPA)
- Liveness and readiness probes
- TLS-enabled ingress
- Static content serving

## Installation

```bash
helm install clipper-frontend ./frontend -n clipper-production
```

## Configuration

See [values.yaml](values.yaml) for all available configuration options.

### Key Values

- `replicaCount`: Number of replicas (default: 2)
- `image.repository`: Docker image repository
- `image.tag`: Image tag (default: "latest")
- `autoscaling.enabled`: Enable HPA (default: true)
- `ingress.enabled`: Enable ingress (default: true)
- `resources`: CPU and memory requests/limits

## Upgrading

```bash
helm upgrade clipper-frontend ./frontend \
  --set image.tag=v1.2.0 \
  --reuse-values \
  -n clipper-production
```
