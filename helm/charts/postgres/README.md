# Clipper PostgreSQL Chart

Helm chart for deploying PostgreSQL database with pgvector extension.

## Features

- StatefulSet for stable network identity
- Persistent storage
- Liveness and readiness probes
- Automatic backups (when configured)
- pgvector extension for embeddings

## Installation

```bash
helm install postgres ./postgres -n clipper-production
```

## Configuration

See [values.yaml](values.yaml) for all available configuration options.

### Key Values

- `image.tag`: PostgreSQL version (default: "pg17")
- `persistence.enabled`: Enable persistent storage (default: true)
- `persistence.size`: Volume size (default: 20Gi)
- `persistence.storageClassName`: Storage class
- `resources`: CPU and memory requests/limits
- `config.database`: Database name
- `config.username`: Database user

## Backup

```bash
kubectl exec postgres-0 -n clipper-production -- \
  pg_dump -U clipper clipper_db > backup.sql
```

## Restore

```bash
kubectl exec -i postgres-0 -n clipper-production -- \
  psql -U clipper -d clipper_db < backup.sql
```
