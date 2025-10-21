# CI/CD Quick Start Guide

A quick reference for developers working with the Clipper CI/CD pipeline.

## 🚀 For Developers

### Before You Push

Run these locally to catch issues early:

```bash
# Backend checks
cd backend
gofmt -l .                    # Check formatting
go test ./...                 # Run tests
go build ./cmd/api           # Build

# Frontend checks
cd frontend
npm run lint                  # Lint
npx tsc --noEmit            # Type check
npm run build               # Build
```

### What Happens on Push/PR

1. **All Pushes/PRs to `main` or `develop`:**
   - ✅ Linting (Go + TypeScript)
   - ✅ Tests (Go + Node)
   - ✅ Build verification
   - ✅ Security scanning (CodeQL)

2. **Merges to `develop`:**
   - 🚀 Auto-deploys to staging
   - 🧪 Smoke tests run

3. **Merges to `main` or version tags:**
   - 🔐 Requires manual approval
   - 🚀 Deploys to production
   - 🔄 Auto-rollback on failure

### Checking CI Status

- **GitHub Actions tab**: See all workflow runs
- **PR page**: CI checks must pass before merge
- **README badges**: Current status of main branch

### Common CI Failures

#### Backend Linting Fails
```bash
# Fix formatting
cd backend
go fmt ./...
git add .
git commit -m "Fix formatting"
```

#### Frontend Linting Fails
```bash
# Fix linting
cd frontend
npm run lint
# or auto-fix
npm run lint -- --fix
git add .
git commit -m "Fix linting"
```

#### Tests Fail
```bash
# Run tests locally to debug
cd backend && go test -v ./...
cd frontend && npm test

# Fix the failing tests, then commit
```

## 🐳 Working with Docker

### Build Images Locally

```bash
# Backend
docker build -t clipper-backend backend/

# Frontend
docker build -t clipper-frontend frontend/

# Test locally
docker run -p 8080:8080 clipper-backend
docker run -p 80:80 clipper-frontend
```

### Pull from Registry

```bash
# Login (requires GitHub token)
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# Pull images
docker pull ghcr.io/subculture-collective/clipper/backend:latest
docker pull ghcr.io/subculture-collective/clipper/frontend:latest
```

## 📦 Releases

### Creating a Release

1. **Update version** in relevant files
2. **Commit changes**: `git commit -m "Bump version to v1.2.3"`
3. **Create tag**: `git tag -a v1.2.3 -m "Release v1.2.3"`
4. **Push tag**: `git push origin v1.2.3`
5. **Approve deployment** in GitHub Actions

### Version Format

Use [Semantic Versioning](https://semver.org/):
- `v1.0.0` - Major release (breaking changes)
- `v1.1.0` - Minor release (new features)
- `v1.1.1` - Patch release (bug fixes)

## 🔧 Troubleshooting

### "Workflow permissions error"
- This is fixed - all workflows have proper permissions
- If you see this, the workflow file needs `permissions:` block

### "Docker image not found"
- Images are only pushed on merge, not on PR
- Check if the workflow completed successfully

### "Codecov upload failed"
- This is non-blocking - CI will still pass
- Ensure `CODECOV_TOKEN` secret is set

### "Deployment failed"
- Check if required secrets are configured:
  - `STAGING_HOST` or `PRODUCTION_HOST`
  - `DEPLOY_SSH_KEY`
- SSH to server and check logs

## 📚 More Information

- [Full CI/CD Documentation](./CI-CD.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Contributing Guidelines](../CONTRIBUTING.md)

## 🆘 Getting Help

1. Check workflow logs in Actions tab
2. Review documentation above
3. Ask in team chat
4. Open an issue with `ci-cd` label
