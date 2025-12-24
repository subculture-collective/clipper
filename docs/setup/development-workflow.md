---
title: "Development Workflow for Live Deployments"
summary: "This guide describes best practices for working on Clipper while it's deployed and serving users."
tags: ['setup']
area: "setup"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Development Workflow for Live Deployments

This guide describes best practices for working on Clipper while it's deployed and serving users.

## Overview

The workflow uses a **three-branch system** to allow simultaneous development and deployment:

- **`main`** - Production-ready code, deployed to production
- **`develop`** - Integration branch for features, deployed to staging
- **`feature/*`** - Feature branches for individual work, merged to develop via PR

## Quick Reference

```bash
# 1. Start new feature
git checkout -b feature/my-feature develop

# 2. Work locally
npm run dev  # frontend or backend
make test    # run tests

# 3. Push and create PR
git push origin feature/my-feature
# Create PR on GitHub: feature/my-feature -> develop

# 4. After PR merge, test on staging
# Staging auto-deploys on develop push

# 5. When ready for production
# Create PR: develop -> main
# After merge and testing, production auto-deploys
```

## Detailed Workflow

### 1. Setting Up Local Development

```bash
# Clone the repository
git clone https://github.com/subculture-collective/clipper.git
cd clipper

# Create and switch to develop branch if it doesn't exist
git checkout develop || git checkout -b develop origin/develop

# Install dependencies
make install

# Start local development
make docker-up      # Terminal 1: Start PostgreSQL, Redis
make backend-dev    # Terminal 2: Start backend
make frontend-dev   # Terminal 3: Start frontend
```

### 2. Creating a Feature Branch

```bash
# Always branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/descriptive-name

# Work on your feature
# Regular commits as you go
git add .
git commit -m "feat: description of change"
```

### 3. Testing Your Changes

```bash
# Run tests before pushing
make test                    # All tests
make test-unit              # Unit tests only
make backend-dev  # Terminal with live backend
make frontend-dev # Terminal with live frontend

# Check for linting issues
make lint

# For frontend: Check bundle size
cd frontend
npm run build  # See dist/ output
npm run analyze  # Visual bundle breakdown
```

### 4. Push and Create PR

```bash
# Push your feature branch
git push origin feature/descriptive-name

# On GitHub:
# 1. Go to https://github.com/subculture-collective/clipper
# 2. Click "Compare & pull request"
# 3. Set base to "develop" (not main!)
# 4. Fill in PR description
# 5. Link related issues if any
# 6. Ensure CI checks pass

# CI automatically runs:
# - Linting
# - Tests
# - Build check
# - Docker image build
```

### 5. Code Review & Merge

```bash
# Wait for PR review
# Address feedback in new commits (don't force push to develop-bound PRs)

# After approval, merge on GitHub:
# - Use "Squash and merge" for cleaner history
# - Delete branch after merge
```

### 6. Testing on Staging

After your PR is merged to `develop`:

```bash
# Staging automatically deploys on develop push
# Staging endpoint: your-staging-domain.com

# Test your changes on staging
# If issues found:
git checkout develop
git pull origin develop
git checkout -b feature/fix-staging-issue
# Make fixes
# Create PR, merge to develop again
```

### 7. Promotion to Production

When feature is ready for production:

```bash
# Create a PR from develop -> main on GitHub
# Title: "Release: v0.x.x - feature description"
# In description, list all features/fixes:
# - Feature 1 (#PR123)
# - Feature 2 (#PR124)
# - Bug fix (#PR125)

# After PR approval and merge:
# Production automatically deploys
```

## Handling the Chunking Issue

The chunking problem has been fixed in [frontend/vite.config.ts](../frontend/vite.config.ts):

**Changes made:**
- Removed `inlineDynamicImports: true` (was bundling everything into one file)
- Enabled `cssCodeSplit: true` (CSS now loads on-demand)
- Configured `manualChunks` to separate:
  - React and ReactDOM (for stability)
  - Vendor dependencies (for better caching)
  - Routes and features (lazy-loaded)

**Why this fixes it:**
- Smaller initial bundle reduces load time
- On-demand loading of routes/features
- Better browser caching (stable vendor chunks don't change)
- Parallel chunk loading instead of one monolithic file

## Zero-Downtime Deployments

For production deployments, use blue-green deployment:

```bash
# This keeps both old and new versions running during deployment
# Users see zero interruption

# Standard deployment flow:
git checkout develop
# ... work on features, merge to develop ...

# When ready for production:
git checkout main
git merge develop
git push origin main

# OR manually trigger blue-green deploy:
bash scripts/deploy-blue-green.sh

# The script:
# 1. Pulls new images
# 2. Starts new version (green) alongside current (blue)
# 3. Health checks new version
# 4. Shows you review URL (localhost:8081)
# 5. Prompts for approval to switch traffic
# 6. Switches traffic to new version
# 7. Stops old version
# 8. Can be rolled back immediately if needed
```

## Avoiding Common Issues

### ❌ Don't do this:

```bash
# Don't commit directly to main
git checkout main
git add .
git commit -m "quick fix"

# Don't force push to develop/main
git push --force origin main

# Don't work directly in main branch
# Always create feature branches

# Don't deploy without testing
npm run build  # Check for errors first
make test      # Ensure tests pass
```

### ✅ Do this instead:

```bash
# Always use feature branches
git checkout -b feature/fix-issue develop

# Test locally before pushing
make test
make lint

# Push and create PR for review
git push origin feature/fix-issue

# Use non-destructive operations
git rebase develop  # To update your branch
# OR
git merge origin/develop  # Safer if others have based work on your branch
```

## Deployment Environments

### Development (Local)
- `make dev` - Runs on your machine
- Full debugging with live reload
- Can test against real backend if needed

### Staging
- Deployed automatically on push to `develop`
- Full feature testing before production
- Share with team for feedback
- **Auto-deploys** - no action needed

### Production
- Deployed automatically on push to `main`
- Blue-green deployment strategy
- Zero downtime
- Can rollback immediately if issues

## Release Process

1. **Feature Development** (feature branches → develop)
   ```bash
   git checkout -b feature/new-feature develop
   # ... work ...
   git push origin feature/new-feature
   # Create PR: feature/new-feature -> develop
   ```

2. **Staging Testing** (develops → staging)
   - Automatic deployment after PR merge
   - Team tests on staging
   - Found bugs? Create hotfix branches from develop

3. **Release** (develop → main)
   - Create PR with release notes
   - Final review and approval
   - Merge to main
   - Production deployment starts
   - Verify with health checks

4. **Rollback** (if needed)
   ```bash
   # Immediate rollback:
   bash scripts/deploy-blue-green.sh
   # Select previous version

   # Or revert commit:
   git revert <commit-hash>
   git push origin main
   ```

## Monitoring & Alerts

After any deployment:

```bash
# Check health endpoints
curl http://your-domain/health          # Backend
curl http://your-domain/health.html     # Frontend

# Watch logs
docker-compose logs -f backend frontend

# Check for chunk loading errors in browser console
# Look for 404s on /assets/chunk-*.js files
```

## Key Files

- [vite.config.ts](../frontend/vite.config.ts) - Frontend build config (fixed chunking)
- [docker-compose.blue-green.yml](../docker-compose.blue-green.yml) - Blue-green setup
- [scripts/deploy-blue-green.sh](../scripts/deploy-blue-green.sh) - Deployment script
- [Makefile](../Makefile) - Development commands
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines

## Questions?

- Check [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines
- See [docs/development.md](../docs/development.md) for development setup
- See [docs/deployment.md](../docs/deployment.md) for infrastructure details
