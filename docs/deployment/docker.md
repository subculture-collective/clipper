---
title: "Docker Deployment"
summary: "Docker-based deployment with multi-stage builds and container orchestration."
tags: ["deployment", "docker", "containers"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-24
aliases: ["docker", "containers", "docker compose"]
---

# Docker Deployment

Production and staging deployment procedures using Docker and Docker Compose.

## Overview

Automated CI/CD via GitHub Actions:

1. **CI Workflow** - Tests on all pushes/PRs
2. **Docker Workflow** - Builds images, scans with Trivy
3. **Staging Deployment** - Auto-deploy to staging on `develop`
4. **Production Deployment** - Deploy to production on `main` (manual approval)
5. **Lighthouse CI** - Performance audits

## Environments

| Environment | Branch | Approval | URL |
|-------------|--------|----------|-----|
| Development | Local dev | N/A | <http://localhost:3000> |
| Staging | `develop` | Automatic | <https://staging.clipper.app> |
| Production | `main` | Manual | <https://clipper.app> |

## Docker Images

Built and pushed to GitHub Container Registry (ghcr.io):

- Backend: `ghcr.io/subculture-collective/clipper/backend`
- Frontend: `ghcr.io/subculture-collective/clipper/frontend`

Tags: `latest`, `production`, `staging`, `v1.2.3`, `sha-abc123`

### Multi-Stage Builds

Backend:
```dockerfile
# Build stage: Compile Go binary
FROM golang:1.24-alpine AS builder
# ... compile static binary

# Final stage: Minimal Alpine (~20MB)
FROM alpine:latest
# Only binary + ca-certificates
```

Frontend:
```dockerfile
# Build stage: npm build
FROM node:20-alpine AS builder
# ... production build

# Final stage: Nginx serving static files
FROM nginx:alpine
```

## Deployment Process

### Staging Deployment

**Trigger**: Push to `develop` branch

1. GitHub Actions runs CI checks
2. Builds Docker images with `staging` tag
3. Pushes to ghcr.io
4. SSH to staging server
5. Pull images: `docker compose pull`
6. Restart: `docker compose up -d`
7. Run smoke tests
8. Notify team (Slack/Discord)

**Manual trigger**:

```bash
gh workflow run deploy-staging.yml
```

### Production Deployment

**Trigger**: Push to `main` branch or version tag `v*`

1. CI checks + E2E tests
2. Manual approval required (GitHub Environments)
3. Build Docker images with `production` tag
4. SSH to production server
5. Create backup: `./scripts/backup.sh`
6. Pull images: `docker compose pull`
7. Run migrations: `docker compose exec backend migrate up`
8. Restart: `docker compose up -d`
9. Health check: `./scripts/health-check.sh`
10. Tag deployment, notify team

**Rollback on failure**: Automatic if health checks fail

**Manual trigger**:

```bash
gh workflow run deploy-production.yml
```

## Server Setup

### Prerequisites

1. Ubuntu 22.04 LTS server
2. Docker Engine 24+ and Docker Compose v2
3. SSH access for `deploy` user
4. GitHub Container Registry authentication

### Initial Setup

```bash
# SSH to server
ssh deploy@your-server.com

# Create deployment directory
sudo mkdir -p /opt/clipper
sudo chown deploy:deploy /opt/clipper
cd /opt/clipper

# Clone repository (for docker-compose.yml)
git clone https://github.com/subculture-collective/clipper.git .

# Authenticate with ghcr.io
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Create .env from .env.example
cp .env.example .env
nano .env  # Configure production values

# Pull images
docker compose pull

# Initialize database
docker compose up -d postgres
docker compose exec backend migrate up

# Start all services
docker compose up -d

# Verify
docker compose ps
curl http://localhost:8080/health
```

### Environment Configuration

See [[../setup/environment|Environment Variables]] for complete list.

Critical production settings:

```env
# Security
GIN_MODE=release
JWT_SECRET=<secure-random-string>
COOKIE_SECURE=true

# Database
DB_SSLMODE=require
DB_POOL_SIZE=20

# Monitoring
SENTRY_ENABLED=true
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production

# CORS
CORS_ALLOWED_ORIGINS=https://clipper.app
```

## Rollback

### Automatic Rollback

GitHub Actions automatically rolls back if:
- Health check fails after deployment
- Error rate >5% in first 5 minutes
- Critical metrics degraded

### Manual Rollback

```bash
# Option 1: Revert to previous image tag
ssh deploy@production
cd /opt/clipper
docker compose pull  # Pull previous tag
docker compose up -d

# Option 2: Use rollback script
./scripts/rollback.sh

# Option 3: Database rollback
docker compose exec backend migrate down 1
```

## Health Checks

Endpoints:

- Backend: `GET /health` - Database + Redis connectivity
- Frontend: `GET /` - Nginx serving index.html

Automated checks:

```bash
./scripts/health-check.sh
```

Checks:
- HTTP 200 from backend health endpoint
- Database query execution
- Redis ping
- OpenSearch cluster health
- Frontend serving assets

## Troubleshooting

### Deployment Fails

**Logs**:

```bash
# GitHub Actions logs
gh run view --log

# Server logs
ssh deploy@server
docker compose logs -f backend
docker compose logs -f frontend
```

**Common issues**:

- Image pull failed → Check ghcr.io authentication
- Container won't start → Check `.env` configuration
- Health check fails → Check database/Redis connectivity
- Migration fails → Review migration scripts, check database state

### Zero Downtime Deployment

For zero downtime:

1. Use rolling updates (Kubernetes) or blue-green deployment
2. Run migrations before deployment if backward-compatible
3. Use database connection pooling
4. Health checks with startup grace period
5. Load balancer with health checks

## Blue/Green Deployment

Clipper supports blue/green deployment for zero-downtime production releases.

### Quick Start

```bash
# Automated blue-green deployment
./scripts/blue-green-deploy.sh

# With specific version
IMAGE_TAG=v1.2.3 ./scripts/blue-green-deploy.sh
```

### What is Blue/Green?

Blue/green deployment maintains two identical production environments:
- **Blue**: Currently serving live traffic
- **Green**: New version being deployed

Traffic is switched from blue to green only after health checks pass, enabling instant rollback if issues occur.

See [[../operations/BLUE_GREEN_DEPLOYMENT|Blue/Green Deployment Guide]] for detailed procedures.

---

Related: [[ci_cd|CI/CD Pipeline]] · [[infra|Infrastructure]] · [[runbook|Operations Runbook]]

[[index|← Back to Deployment]]
