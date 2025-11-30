# Operations: CI/CD

Continuous integration and deployment pipelines for Clipper.

## Overview

GitHub Actions pipelines for:
- Linting & testing on every PR
- Building Docker images on merge to main
- Deploying to staging/production

## Workflows

### PR Checks (`.github/workflows/pr.yml`)

Runs on pull requests:
- Backend: `go test`, `go vet`, `golangci-lint`
- Frontend: `pnpm lint`, `pnpm test`, `pnpm build`
- Mobile: `pnpm lint`, `pnpm test`
- Docs: `markdownlint`, `cspell`, `lychee`

Must pass before merge.

### Build & Push (`.github/workflows/build.yml`)

On merge to main:
- Build Docker images (backend, frontend)
- Tag with commit SHA + `latest`
- Push to container registry (GHCR, Docker Hub, ECR)

### Deploy Staging (`.github/workflows/deploy-staging.yml`)

Auto-deploy to staging after build:
- Apply Kubernetes manifests
- Run database migrations
- Smoke test health endpoints

### Deploy Production (`.github/workflows/deploy-prod.yml`)

Manual approval required:
- Deploy to production cluster
- Run migrations (if any)
- Monitor metrics for 10 minutes
- Rollback on errors

## Secrets

Required GitHub secrets:
- `KUBE_CONFIG` - Kubernetes config for deployment
- `DOCKER_USERNAME`, `DOCKER_PASSWORD` - Registry credentials
- `POSTGRES_URL_PROD` - Production database
- `STRIPE_SECRET_KEY` - Stripe API key

See [[../setup/environment|Environment]].

## Deployment Strategy

- Rolling updates for backend/frontend pods
- Blue-green deployment option for major releases
- Database migrations run before new code deploys
- Rollback via `kubectl rollout undo`

## Monitoring Deployments

- Check pod status: `kubectl get pods`
- View logs: `kubectl logs -f deployment/backend`
- Rollback: `kubectl rollout undo deployment/backend`

See [[monitoring|Monitoring]].

---

Related: [[deployment|Deployment]] · [[infra|Infrastructure]] · [[../backend/testing|Testing]]

[[../index|← Back to Index]]
