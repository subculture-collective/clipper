# Deployment Guide

This guide covers the deployment process for the Clipper application using GitHub Actions and Docker.

## Table of Contents

- [Overview](#overview)
- [CI/CD Workflows](#cicd-workflows)
- [Docker Images](#docker-images)
- [Environment Setup](#environment-setup)
- [Deployment Process](#deployment-process)
- [Rollback Procedure](#rollback-procedure)
- [Troubleshooting](#troubleshooting)

## Overview

The Clipper application uses GitHub Actions for automated CI/CD with the following workflows:

1. **CI Workflow** - Runs on all pushes and PRs
2. **Docker Workflow** - Builds and pushes container images
3. **CodeQL Workflow** - Security scanning
4. **Staging Deployment** - Auto-deploys to staging environment
5. **Production Deployment** - Deploys to production with manual approval
6. **Lighthouse CI** - Frontend performance monitoring

## CI/CD Workflows

### CI Workflow (`.github/workflows/ci.yml`)

Runs on every push and pull request to `main` and `develop` branches.

**Backend Jobs:**

- **Lint & Format**: Checks Go code formatting and runs golangci-lint
- **Test**: Runs tests with coverage on Go 1.21 and 1.22
  - Generates coverage reports
  - Uploads to Codecov
- **Build**: Cross-compiles for Linux, macOS, and Windows

**Frontend Jobs:**

- **Lint & Format**: Runs ESLint and TypeScript type checking
- **Test**: Runs tests on Node 18 and 20
- **Build**: Creates production bundle and checks size

### Docker Workflow (`.github/workflows/docker.yml`)

Builds Docker images and pushes to GitHub Container Registry.

**Features:**

- Multi-stage builds for optimized images
- Build caching for faster builds
- Tags with version, branch, and commit SHA
- Vulnerability scanning with Trivy
- Automatic SARIF upload to GitHub Security

**Image Locations:**

- Backend: `ghcr.io/subculture-collective/clipper/backend`
- Frontend: `ghcr.io/subculture-collective/clipper/frontend`

### Security Scanning

**CodeQL Analysis:**

- Runs on push and PR
- Weekly scheduled scans
- Analyzes Go and TypeScript code
- Results available in Security tab

**Dependabot:**

- Weekly dependency updates
- Auto-groups minor and patch updates
- Separate groups for production and development dependencies

## Docker Images

### Backend Image

Built from `backend/Dockerfile` using multi-stage build:

```dockerfile
# Build stage: Compiles Go binary
FROM golang:1.24-alpine AS builder
# ... compilation steps

# Final stage: Minimal Alpine Linux
FROM alpine:latest
# Only contains compiled binary + ca-certificates
```

**Features:**

- Minimal image size (~20MB)
- Static binary compilation
- Health check endpoint
- Non-root user

**Build locally:**

```bash
cd backend
docker build -t clipper-backend .
docker run -p 8080:8080 clipper-backend
```

### Frontend Image

Built from `frontend/Dockerfile` using multi-stage build:

```dockerfile
# Build stage: npm build
FROM node:20-alpine AS builder
# ... build steps

# Final stage: Nginx serving static files
FROM nginx:alpine
```

**Features:**

- Production-optimized nginx configuration
- Gzip compression enabled
- SPA routing support
- Security headers
- Health check endpoint

**Build locally:**

```bash
cd frontend
docker build -t clipper-frontend .
docker run -p 80:80 clipper-frontend
```

## Environment Setup

### Prerequisites

1. **GitHub Environments**: Create `staging` and `production` environments

    - Go to Settings > Environments > New environment
    - For production: Enable required reviewers

2. **Deployment Servers**: Prepare staging and production servers

    - Install Docker and Docker Compose
    - Create deployment directory: `/opt/clipper`
    - Set up SSH access for deploy user

3. **GitHub Secrets**: Configure repository secrets

### Required Secrets

| Secret            | Description                    | Example                              |
| ----------------- | ------------------------------ | ------------------------------------ |
| `CODECOV_TOKEN`   | Codecov project token          | `abc123...`                          |
| `STAGING_HOST`    | Staging server hostname        | `staging.clpr.tv`        |
| `PRODUCTION_HOST` | Production server hostname     | `clpr.tv`                |
| `DEPLOY_SSH_KEY`  | SSH private key for deployment | `-----BEGIN RSA PRIVATE KEY-----...` |

**Setting secrets:**

1. Go to Settings > Secrets and variables > Actions
2. Click "New repository secret"
3. Add each secret with its value

### Server Setup

On both staging and production servers:

```bash
# Create deployment directory
sudo mkdir -p /opt/clipper
sudo chown deploy:deploy /opt/clipper

# Create docker-compose.yml
cat > /opt/clipper/docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    image: ghcr.io/subculture-collective/clipper/backend:latest
    container_name: clipper-backend
    restart: unless-stopped
    ports:
      - "8080:8080"
      environment:
         - DB_HOST=postgres
         - DB_PORT=5432
         - DB_USER=${POSTGRES_USER:-clipper}
         - DB_PASSWORD=${POSTGRES_PASSWORD}
         - DB_NAME=${POSTGRES_DB:-clipper_db}
         - REDIS_HOST=redis
         - REDIS_PORT=6379
         - REDIS_PASSWORD=
         - REDIS_DB=0
    healthcheck:
      test: ["CMD", "wget", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    image: ghcr.io/subculture-collective/clipper/frontend:latest
    container_name: clipper-frontend
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend

  postgres:
    image: postgres:17-alpine
    container_name: clipper-postgres
    restart: unless-stopped
    environment:
         - POSTGRES_DB=clipper_db
      - POSTGRES_USER=clipper
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      ports:
         - "5436:5432"

   redis:
      image: redis:7-alpine
    container_name: clipper-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
EOF

# Create .env file
cat > /opt/clipper/.env << 'EOF'
# Postgres container
POSTGRES_DB=clipper_db
POSTGRES_USER=clipper
POSTGRES_PASSWORD=changeme_in_production

# Backend DB connection
DB_HOST=postgres
DB_PORT=5432
DB_USER=clipper
DB_PASSWORD=changeme_in_production
DB_NAME=clipper_db

# Backend Redis connection
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
EOF

# Set proper permissions
chmod 600 /opt/clipper/.env
```

## Deployment Process

### Automatic Deployments

#### Staging

1. Push or merge to `develop` branch
2. CI workflow runs and must pass
3. Docker images are built and pushed
4. Staging deployment workflow triggers automatically
5. Images are pulled and containers are restarted
6. Smoke tests run to verify deployment

#### Production

1. Push or merge to `main` branch (or create version tag)
2. All CI checks must pass
3. Docker images are built and pushed
4. Production deployment workflow requires manual approval
5. Reviewer approves deployment
6. E2E tests run before deployment
7. Images are deployed with health checks
8. Automatic rollback if health checks fail

### Manual Deployments

#### Via GitHub UI

1. Go to Actions tab
2. Select workflow (Deploy to Staging/Production)
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow" button

#### Via GitHub CLI

```bash
# Install GitHub CLI if needed
# https://cli.github.com/

# Deploy to staging
gh workflow run deploy-staging.yml

# Deploy to production
gh workflow run deploy-production.yml

# Check workflow status
gh run list --workflow=deploy-production.yml
```

### Version Tags

Create version tags to trigger production deployments:

```bash
# Tag a release
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# This will trigger production deployment with version tagging
```

## Rollback Procedure

### Automatic Rollback

Production deployments include automatic rollback on failure:

1. New images are pulled
2. Backup tags are created from current running images
3. New containers are started
4. Health check runs after 10 seconds
5. If health check fails:
    - Old images are restored from backup tags
    - Containers are restarted with old version
    - Deployment fails with error

### Manual Rollback

If you need to rollback manually:

```bash
# SSH to production server
ssh deploy@production-server

# Check running containers
cd /opt/clipper
docker compose ps

# View deployment history
docker images | grep clipper

# Rollback to previous version
docker compose down
docker tag clipper-backend:backup clipper-backend:latest
docker tag clipper-frontend:backup clipper-frontend:latest
docker compose up -d

# Or rollback to specific version
docker tag ghcr.io/subculture-collective/clipper/backend:v1.0.0 clipper-backend:latest
docker tag ghcr.io/subculture-collective/clipper/frontend:v1.0.0 clipper-frontend:latest
docker compose up -d
```

### Verify Rollback

```bash
# Check health
curl http://localhost:8080/health

# Check logs
docker compose logs -f

# Verify version (if version endpoint exists)
curl http://localhost:8080/api/v1/version
```

## Troubleshooting

### CI/CD Issues

#### Build Failures

**Backend build fails:**

```bash
# Check Go version compatibility
# Ensure go.mod uses correct version
# Run locally: cd backend && go build ./cmd/api

# Check linting errors
cd backend
golangci-lint run
```

**Frontend build fails:**

```bash
# Check Node version
# Run locally: cd frontend && npm run build

# Check TypeScript errors
cd frontend
npx tsc --noEmit
```

#### Test Failures

```bash
# Run tests locally
cd backend && go test -v ./...
cd frontend && npm test

# Check coverage
cd backend && go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Deployment Issues

#### SSH Connection Fails

1. Verify SSH key is correctly added to secrets
2. Check server is accessible:

    ```bash
    ssh -i <key> deploy@<host>
    ```

3. Verify deploy user has Docker permissions:

    ```bash
    sudo usermod -aG docker deploy
    ```

#### Docker Pull Fails

1. Check image exists in registry:

    ```bash
    docker pull ghcr.io/subculture-collective/clipper/backend:latest
    ```

2. Verify GitHub token has packages:read permission
3. Check rate limits on GitHub Container Registry

#### Health Check Fails

1. SSH to server and check logs:

    ```bash
    docker compose logs backend
    docker compose logs frontend
    ```

2. Check if services are running:

    ```bash
    docker compose ps
    ```

3. Test health endpoints manually:

    ```bash
    curl http://localhost:8080/health
    wget http://localhost:80/health.html
    ```

#### Database Connection Issues

1. Check environment variables:

    ```bash
    cat /opt/clipper/.env
    ```

2. Verify PostgreSQL is running:

    ```bash
    docker compose ps postgres
    docker compose logs postgres
    ```

3. Test database connection:

    ```bash
    docker compose exec postgres psql -U clipper -d clipper
    ```

### Performance Issues

#### Slow Build Times

1. Check cache usage in workflow logs
2. Ensure build cache is being restored
3. Consider using self-hosted runners for faster builds

#### Large Image Sizes

1. Check image sizes:

    ```bash
    docker images | grep clipper
    ```

2. Review Dockerfile for optimization opportunities
3. Use `.dockerignore` to exclude unnecessary files

### Security Issues

#### CodeQL Alerts

1. View alerts in Security tab
2. Review alert details and recommendations
3. Fix code and re-run analysis
4. Mark false positives if necessary

#### Trivy Vulnerabilities

1. Check workflow logs for Trivy results
2. Update base images to latest versions
3. Update dependencies with vulnerabilities
4. Review SARIF results in Security tab

## Monitoring and Logs

### View Logs

**GitHub Actions:**

- Go to Actions tab
- Select workflow run
- View job logs

**Server Logs:**

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend

# Last 100 lines
docker compose logs --tail=100 backend
```

### Metrics and Monitoring

**Frontend Performance:**

- Lighthouse CI reports available in workflow artifacts
- Bundle size tracking in CI logs

**Backend Health:**

- Health endpoint: `/health`
- Monitor response times and error rates

### Alerts

Set up alerts for:

- Failed deployments
- Failed health checks
- Security vulnerabilities
- High error rates

## Best Practices

1. **Always test locally before pushing**

    - Run linters and tests
    - Build Docker images
    - Test with docker compose

2. **Use feature branches**

    - Create PRs for all changes
    - Wait for CI to pass
    - Get code review before merging

3. **Version your releases**

    - Use semantic versioning (v1.2.3)
    - Tag releases in git
    - Keep changelog updated

4. **Monitor deployments**

    - Watch deployment progress
    - Check health endpoints after deployment
    - Review logs for errors

5. **Keep secrets secure**

    - Never commit secrets
    - Rotate secrets regularly
    - Use environment-specific secrets

6. **Document changes**
    - Update README and documentation
    - Add comments to complex workflow changes
    - Keep deployment guide current
