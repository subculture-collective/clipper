# CI/CD Pipeline Documentation

This document provides an overview of the CI/CD pipeline implemented for the Clipper project.

## Overview

The Clipper project uses GitHub Actions for continuous integration and deployment. The pipeline includes:

- Automated testing and linting
- Docker image building and publishing
- Security scanning
- Automated deployments to staging and production
- Performance monitoring

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**

#### Backend Jobs

- **backend-lint**: Runs `gofmt` check and `golangci-lint`
- **backend-test**: Runs tests with coverage on Go 1.21 and 1.22
  - Uses matrix testing for multiple Go versions
  - Generates coverage reports
  - Uploads coverage to Codecov
- **backend-build**: Cross-compiles for Linux, macOS, and Windows

#### Frontend Jobs

- **frontend-lint**: Runs ESLint and TypeScript type checking
- **frontend-test**: Runs tests on Node 18 and 20
  - Uses matrix testing for multiple Node versions
- **frontend-build**: Creates production bundle and uploads artifacts

### 2. Docker Workflow (`.github/workflows/docker.yml`)

**Triggers:**

- Push to `main` or `develop` branches
- Push of version tags (`v*`)
- Pull requests to `main` or `develop` branches

**Jobs:**

- **build-backend**: Builds backend Docker image
  - Multi-stage build for optimization
  - Pushes to GitHub Container Registry (ghcr.io)
  - Tags with version, branch, and commit SHA
- **build-frontend**: Builds frontend Docker image
  - Multi-stage build with nginx
  - Pushes to GitHub Container Registry
- **scan-backend**: Scans backend image with Trivy
- **scan-frontend**: Scans frontend image with Trivy
  - Both upload results to GitHub Security

### 3. CodeQL Workflow (`.github/workflows/codeql.yml`)

**Triggers:**

- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Weekly schedule (Monday at 00:00 UTC)

**Jobs:**

- **analyze**: Runs CodeQL analysis for Go and TypeScript
  - Identifies security vulnerabilities
  - Results available in Security tab

### 4. Staging Deployment (`.github/workflows/deploy-staging.yml`)

**Triggers:**

- Push to `develop` branch
- Manual workflow dispatch

**Jobs:**

- **deploy**: Deploys to staging environment
  - Builds and pushes Docker images with `staging` tag
  - Connects to staging server via SSH
  - Pulls images and restarts containers
  - Runs smoke tests

**Required Secrets:**

- `STAGING_HOST`: Staging server hostname
- `DEPLOY_SSH_KEY`: SSH private key for deployment

### 5. Production Deployment (`.github/workflows/deploy-production.yml`)

**Triggers:**

- Push to `main` branch
- Push of version tags (`v*`)
- Manual workflow dispatch

**Jobs:**

- **deploy**: Deploys to production environment
  - Requires manual approval via GitHub Environments
  - Builds and pushes Docker images
  - Runs E2E tests before deployment
  - Connects to production server via SSH
  - Creates backup of current deployment
  - Deploys new version with health checks
  - Automatic rollback on failure
  - Creates deployment tag

**Required Secrets:**

- `PRODUCTION_HOST`: Production server hostname
- `DEPLOY_SSH_KEY`: SSH private key for deployment

### 6. Lighthouse CI (`.github/workflows/lighthouse.yml`)

**Triggers:**

- Push to `main` or `develop` branches (only if frontend files changed)
- Pull requests to `main` or `develop` branches (only if frontend files changed)

**Jobs:**

- **lighthouse**: Runs Lighthouse performance audit
  - Builds production bundle
  - Runs preview server
  - Executes Lighthouse tests
  - Generates performance reports
  - Checks bundle size

## Security

### Dependabot (`.github/dependabot.yml`)

Automated dependency updates:

- **Go modules**: Weekly updates on Mondays
- **npm packages**: Weekly updates on Mondays
- **GitHub Actions**: Weekly updates on Mondays
- Groups minor and patch updates by dependency type

### Security Scanning

1. **CodeQL Analysis**: Static analysis for Go and TypeScript
2. **Trivy Container Scanning**: Vulnerability scanning for Docker images
3. **Workflow Permissions**: All workflows use explicit minimal permissions

## Docker Images

### Backend Image (`backend/Dockerfile`)

- **Base**: golang:1.24-alpine (builder), alpine:latest (runtime)
- **Size**: ~20MB (optimized)
- **Features**:
  - Static binary compilation
  - Health check endpoint
  - Multi-stage build

### Frontend Image (`frontend/Dockerfile`)

- **Base**: node:20-alpine (builder), nginx:alpine (runtime)
- **Size**: ~30MB (optimized)
- **Features**:
  - Production nginx configuration
  - SPA routing support
  - Gzip compression
  - Security headers
  - Health check endpoint

### Image Locations

- Backend: `ghcr.io/subculture-collective/clipper/backend`
- Frontend: `ghcr.io/subculture-collective/clipper/frontend`

### Image Tags

- `latest`: Latest build from main branch
- `develop`: Latest build from develop branch
- `staging`: Staging deployment
- `production`: Production deployment
- `v*`: Version tags (e.g., v1.0.0)
- `main-<sha>`: Commit-specific tags

## Environment Setup

### GitHub Environments

Create two environments in repository settings:

1. **staging**
   - No required reviewers
   - Optional deployment protection rules

2. **production**
   - Required reviewers: At least 1
   - Wait timer: Optional (e.g., 5 minutes)
   - Deployment branch restrictions: main only

### Required Secrets

Configure in Settings > Secrets and variables > Actions:

| Secret | Description | Example |
|--------|-------------|---------|
| `CODECOV_TOKEN` | Codecov project token | `abc123...` |
| `STAGING_HOST` | Staging server hostname | `staging.clpr.tv` |
| `PRODUCTION_HOST` | Production server hostname | `clpr.tv` |
| `DEPLOY_SSH_KEY` | SSH private key | `-----BEGIN RSA PRIVATE KEY-----...` |

### Server Configuration

On both staging and production servers:

```bash
# Create deployment user
sudo useradd -m -s /bin/bash deploy
sudo usermod -aG docker deploy

# Set up SSH key
sudo mkdir -p /home/deploy/.ssh
sudo vim /home/deploy/.ssh/authorized_keys
# Paste public key corresponding to DEPLOY_SSH_KEY
sudo chown -R deploy:deploy /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh
sudo chmod 600 /home/deploy/.ssh/authorized_keys

# Create deployment directory
sudo mkdir -p /opt/clipper
sudo chown deploy:deploy /opt/clipper
```

Copy `docker-compose.prod.yml` and `.env.production.example` to the server:

```bash
# On server as deploy user
cd /opt/clipper
# Copy docker-compose.prod.yml as docker-compose.yml
# Copy .env.production.example as .env and fill in values
```

## Usage

### Running CI Checks Locally

#### Backend

```bash
cd backend

# Lint
golangci-lint run --timeout=5m

# Format check
gofmt -l .

# Tests with coverage
go test -v -race -coverprofile=coverage.out -covermode=atomic ./...

# Build
go build -o bin/api ./cmd/api
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm ci

# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build
npm run build
```

### Building Docker Images Locally

```bash
# Backend
cd backend
docker build -t clipper-backend .

# Frontend
cd frontend
docker build -t clipper-frontend .

# Test containers
docker run -d -p 8080:8080 clipper-backend
docker run -d -p 80:80 clipper-frontend
```

### Manual Deployments

#### Via GitHub UI

1. Go to Actions tab
2. Select workflow (Deploy to Staging/Production)
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow"

#### Via GitHub CLI

```bash
# Staging
gh workflow run deploy-staging.yml

# Production
gh workflow run deploy-production.yml

# Check status
gh run list --workflow=deploy-production.yml
gh run watch
```

## Monitoring

### CI/CD Status

Check workflow status:

- Actions tab in GitHub repository
- Build status badges in README
- Email notifications for failures

### Deployment Status

**Staging:**

- Health check: <http://staging.clpr.tv/health>

**Production:**

- Health check: <https://clpr.tv/health>
- Automatic rollback on failure

### Logs

View logs:

```bash
# SSH to server
ssh deploy@<server>

# View container logs
cd /opt/clipper
docker compose logs -f

# View specific service
docker compose logs -f backend
docker compose logs -f frontend
```

## Troubleshooting

### Build Failures

1. Check workflow logs in GitHub Actions
2. Reproduce locally using commands above
3. Fix issues and push changes

### Deployment Failures

1. Check workflow logs for error messages
2. SSH to server and check container logs
3. Verify environment variables and secrets
4. Check server disk space and resources

### Container Issues

```bash
# Check container status
docker compose ps

# Check container logs
docker compose logs backend
docker compose logs frontend

# Restart containers
docker compose restart backend
docker compose restart frontend

# Rebuild and restart
docker compose down
docker compose pull
docker compose up -d
```

## Best Practices

1. **Always create PRs for changes**
   - CI runs on all PRs
   - Required checks must pass before merge

2. **Test locally before pushing**
   - Run linters and tests
   - Build Docker images
   - Test with docker compose

3. **Use semantic versioning**
   - Tag releases: v1.0.0, v1.1.0, etc.
   - Major.Minor.Patch format

4. **Monitor deployments**
   - Watch deployment progress
   - Check health endpoints
   - Review logs for errors

5. **Keep secrets secure**
   - Never commit secrets
   - Rotate secrets regularly
   - Use environment-specific secrets

6. **Review security alerts**
   - Check Security tab regularly
   - Address Dependabot PRs promptly
   - Review CodeQL and Trivy results

## Performance

### Build Times

Typical build times with caching:

- **Backend build**: 1-2 minutes
- **Frontend build**: 2-3 minutes
- **Docker builds**: 3-5 minutes
- **Full CI pipeline**: 5-10 minutes

### Optimization

The pipeline uses several optimizations:

- Go module caching
- npm package caching
- Docker layer caching
- Parallel job execution
- Matrix testing for efficiency

## Future Improvements

Potential enhancements:

- [ ] Add E2E tests with Playwright
- [ ] Implement automatic rollback based on error rates
- [ ] Add performance regression testing
- [ ] Set up monitoring and alerting
- [ ] Add database migration automation
- [ ] Implement blue-green deployment
- [ ] Add canary deployment option
- [ ] Set up CDN for frontend assets
- [ ] Add API documentation generation
- [ ] Implement changelog automation

## Support

For help with CI/CD:

1. Check this documentation
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md)
3. Open an issue in the repository
4. Contact the DevOps team

## References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com/)
- [golangci-lint Documentation](https://golangci-lint.run/)
- [Codecov Documentation](https://docs.codecov.com/)
- [Trivy Documentation](https://aquasecurity.github.io/trivy/)
