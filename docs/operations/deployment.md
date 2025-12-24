---
title: "Deployment"
summary: "Production and staging deployment procedures using Docker and GitHub Actions."
tags: ["operations", "deployment", "docker"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["deploy", "production deployment"]
---

# Deployment

Production and staging deployment procedures using Docker and GitHub Actions.

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
| Development | Local dev | N/A | http://localhost:3000 |
| Staging | `develop` | Automatic | https://staging.clipper.app |
| Production | `main` | Manual | https://clipper.app |

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

**NEW**: Clipper now supports blue/green deployment for zero-downtime production releases.

### Quick Start

```bash
# Automated blue-green deployment
./scripts/blue-green-deploy.sh

# With specific version
IMAGE_TAG=v1.2.3 ./scripts/blue-green-deploy.sh
```

### What is Blue/Green?

Blue/green deployment maintains two identical production environments:
- **Blue**: Currently active production
- **Green**: New version being deployed

Traffic is instantly switched between environments, enabling zero-downtime deployments and instant rollback.

### Benefits

✓ **Zero Downtime**: Instant traffic switching  
✓ **Instant Rollback**: Revert in seconds if issues occur  
✓ **Safe Testing**: Verify new version before switching traffic  
✓ **Reduced Risk**: Old version remains running during deployment

### Architecture

```
Caddy Proxy (Port 80/443)
    │
    ├─→ Blue Environment (Active)
    │   ├─ Backend (Port 8080)
    │   └─ Frontend (Port 80)
    │
    └─→ Green Environment (Standby)
        ├─ Backend (Port 8080)
        └─ Frontend (Port 80)
        
Shared: PostgreSQL, Redis
```

### Deployment Process

1. **Detect Active Environment**: Script identifies blue or green
2. **Pull New Images**: Latest images for target environment
3. **Start Target Environment**: New version starts alongside current
4. **Health Checks**: Verify new version is healthy (30 checks)
5. **Switch Traffic**: Caddy redirects traffic to new environment
6. **Monitor**: Watch metrics for 30 seconds
7. **Stop Old Environment**: Previous version is stopped
8. **Auto-Rollback**: On failure, automatically reverts

### Manual Deployment

For step-by-step control:

```bash
# 1. Start target environment (if blue is active, start green)
docker compose -f docker-compose.blue-green.yml --profile green up -d

# 2. Wait and verify health
sleep 30
./scripts/health-check.sh

# 3. Switch traffic
export ACTIVE_ENV=green
docker compose -f docker-compose.blue-green.yml up -d caddy

# 4. Monitor
watch -n 5 'curl -s http://localhost/health'

# 5. Stop old environment
docker compose -f docker-compose.blue-green.yml stop backend-blue frontend-blue
```

### Rollback

Quick rollback if issues occur:

```bash
# Automated rollback
./scripts/rollback-blue-green.sh

# Or manual rollback
export ACTIVE_ENV=blue
docker compose -f docker-compose.blue-green.yml up -d caddy
```

### Database Migrations

**CRITICAL**: Migrations must be backward-compatible for blue/green deployment.

✓ **Safe operations**:
- Add new tables
- Add nullable columns
- Add columns with DEFAULT values
- Create indexes (use CONCURRENTLY)

✗ **Unsafe operations** (require two-phase migration):
- DROP TABLE/COLUMN
- RENAME TABLE/COLUMN  
- Change column types
- Make columns NOT NULL without defaults

Check migration compatibility:

```bash
./scripts/check-migration-compatibility.sh
```

### Testing

Test blue/green deployment in staging:

```bash
# Full test suite
./scripts/test-blue-green-deployment.sh

# Manual testing
cd /opt/clipper-staging
./scripts/blue-green-deploy.sh
./scripts/health-check.sh
```

### Monitoring

Monitor during deployment:

```bash
# Watch all health metrics
watch -n 5 'curl -s http://localhost/health/stats'

# Monitor container stats
docker stats

# Check logs for errors
docker compose logs -f | grep -i error
```

### Complete Documentation

For comprehensive blue/green deployment documentation:
- **[Blue/Green Deployment Guide](./BLUE_GREEN_DEPLOYMENT.md)** - Complete setup and usage
- **[Rollback Procedures](./BLUE_GREEN_ROLLBACK.md)** - Emergency rollback steps

---

Related: [[preflight|Preflight Checklist]] · [[infra|Infrastructure]] · [[cicd|CI/CD]] · [[monitoring|Monitoring]] · [[BLUE_GREEN_DEPLOYMENT|Blue/Green Guide]] · [[BLUE_GREEN_ROLLBACK|Rollback]]

[[../index|← Back to Index]]
