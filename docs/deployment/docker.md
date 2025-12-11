---
title: "Docker Configuration"
summary: "Docker and Docker Compose setup for local development and production deployment."
tags: ["deployment", "docker", "containers"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-11
aliases: ["docker setup", "containers", "docker compose"]
---

# Docker Configuration

Clipper uses Docker for both local development and production deployment.

## Local Development

### Prerequisites

- Docker Engine 24.0+
- Docker Compose 2.20+

### Quick Start

```bash
# Start all services
make docker-up

# Or manually:
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Services

The `docker-compose.yml` defines these services:

| Service | Port | Purpose |
|---------|------|---------|
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Cache and session store |
| opensearch | 9200 | Search engine |

## Production Deployment

### Multi-Stage Builds

Both backend and frontend use multi-stage Docker builds for optimization:

**Backend (`backend/Dockerfile`):**
```dockerfile
FROM golang:1.24-alpine AS builder
# Build stage...

FROM alpine:latest
# Runtime stage with minimal footprint
```

**Frontend (`frontend/Dockerfile`):**
```dockerfile
FROM node:20-alpine AS builder
# Build stage...

FROM nginx:alpine
# Serve with nginx
```

### Image Registry

Images are published to GitHub Container Registry (ghcr.io):

```bash
# Pull latest images
docker pull ghcr.io/subculture-collective/clipper/backend:latest
docker pull ghcr.io/subculture-collective/clipper/frontend:latest

# Pull specific version
docker pull ghcr.io/subculture-collective/clipper/backend:v1.2.3
```

### Production Compose

Use `docker-compose.prod.yml` for production:

```bash
docker compose -f docker-compose.prod.yml up -d
```

See [[../operations/deployment|Deployment Guide]] for complete procedures.

## Security

### Image Scanning

All images are scanned with Trivy for vulnerabilities:

```bash
trivy image ghcr.io/subculture-collective/clipper/backend:latest
```

### Best Practices

- Non-root users in containers
- Minimal base images (Alpine Linux)
- No secrets in images (use environment variables)
- Regular security updates

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker compose logs <service-name>
```

### Database Connection Issues

Ensure PostgreSQL is ready:
```bash
docker compose exec postgres pg_isready
```

### Port Conflicts

If ports are in use, stop conflicting services or change ports in `docker-compose.yml`.

---

**See also:**
[[../operations/infra|Infrastructure]] ·
[[../setup/troubleshooting|Troubleshooting]] ·
[[index|Deployment Hub]]
