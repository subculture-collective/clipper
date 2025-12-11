<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Quick Reference Card](#quick-reference-card)
  - [Chunking Fix](#chunking-fix)
  - [Local Development](#local-development)
  - [Feature Development](#feature-development)
  - [Promote to Production](#promote-to-production)
  - [Zero-Downtime Deployment](#zero-downtime-deployment)
  - [Health Checks](#health-checks)
  - [Emergency Rollback](#emergency-rollback)
  - [Troubleshooting](#troubleshooting)
  - [Files to Know](#files-to-know)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Quick Reference Card"
summary: "```bash"
tags: ['product']
area: "product"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Quick Reference Card

## Chunking Fix
```bash
# Verify the fix worked
cd frontend && npm run build
ls dist/assets/ | wc -l  # Should see 10+ files, not just 1-2
```

## Local Development
```bash
# Start everything
make dev

# Or start individually
make docker-up         # PostgreSQL + Redis
make backend-dev       # Terminal 2
make frontend-dev      # Terminal 3
```

## Feature Development
```bash
git checkout -b feature/my-feature develop
# ... work and test ...
git push origin feature/my-feature
# Create PR on GitHub (auto-deploys to staging)
```

## Promote to Production
```bash
git checkout develop
git pull origin develop
# Create PR: develop -> main
# Merge PR → auto-deploys to production
```

## Zero-Downtime Deployment
```bash
# Automated (recommended)
bash scripts/deploy-blue-green.sh

# Or manual
docker-compose -f docker-compose.blue-green.yml --profile green up -d
sleep 30
bash scripts/health-check.sh
sudo bash scripts/blue-green-traffic.sh switch green
```

## Health Checks
```bash
# Basic
bash scripts/health-check.sh

# Detailed
VERBOSE=true CHECK_CHUNKS=true bash scripts/health-check.sh

# Status
sudo bash scripts/blue-green-traffic.sh status
```

## Emergency Rollback
```bash
# Immediately switch traffic back
sudo bash scripts/blue-green-traffic.sh switch blue

# Stop problematic version
docker-compose -f docker-compose.blue-green.yml down backend-green frontend-green
```

## Troubleshooting

| Issue | Command |
|-------|---------|
| Chunking not working | `grep manualChunks frontend/vite.config.ts` |
| Check build | `cd frontend && npm run build` |
| View logs | `docker-compose logs -f` |
| Health status | `bash scripts/health-check.sh` |
| Traffic status | `sudo bash scripts/blue-green-traffic.sh status` |
| Rebuild frontend | `cd frontend && npm run build` |

## Files to Know
- `frontend/vite.config.ts` - Chunking configuration
- `docker-compose.blue-green.yml` - Blue-green setup
- `scripts/deploy-blue-green.sh` - Deployment automation
- `docs/development-workflow.md` - Development guide
- `docs/deployment-live-development.md` - Deployment guide
- `nginx/blue-green.conf` - Nginx routing
