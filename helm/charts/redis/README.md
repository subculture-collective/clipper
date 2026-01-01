# Clipper Redis Chart

Helm chart for deploying Redis cache and session store.

## Features

- StatefulSet for stable network identity
- Persistent storage
- Liveness and readiness probes
- Configurable Redis settings
- AOF persistence enabled

## Installation

```bash
helm install redis ./redis -n clipper-production
```

## Configuration

See [values.yaml](values.yaml) for all available configuration options.

### Key Values

- `image.tag`: Redis version (default: "7-alpine")
- `persistence.enabled`: Enable persistent storage (default: true)
- `persistence.size`: Volume size (default: 5Gi)
- `resources`: CPU and memory requests/limits
- `redisConfig`: Redis configuration

## Backup

```bash
kubectl exec redis-0 -n clipper-production -- redis-cli BGSAVE
kubectl cp redis-0:/data/dump.rdb ./redis-backup.rdb -n clipper-production
```

## Restore

```bash
kubectl cp ./redis-backup.rdb redis-0:/data/dump.rdb -n clipper-production
kubectl exec redis-0 -n clipper-production -- redis-cli shutdown nosave
kubectl delete pod redis-0 -n clipper-production  # Will restart
```
