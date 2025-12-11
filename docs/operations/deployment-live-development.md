---
title: "Production Deployment & Live Development Guide"
summary: "This guide covers deploying Clipper to production while maintaining the ability to work on the codeb"
tags: ['operations']
area: "operations"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Production Deployment & Live Development Guide

This guide covers deploying Clipper to production while maintaining the ability to work on the codebase without interrupting service.

## Quick Start: Chunking Fix

The chunking issue has been fixed in [frontend/vite.config.ts](../frontend/vite.config.ts). The problem was:

**Before:** Code bundled into single large file → timeout during load
**After:** Intelligent code splitting → faster, parallel loading

Rebuild and deploy:
```bash
cd frontend
npm run build    # Verify build completes
cd ..
# Then deploy using blue-green (see below)
```

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         Your Load Balancer/Nginx        │
│    (Routes traffic to Blue or Green)    │
└──────┬──────────────────────┬──────────┘
       │                      │
       ▼                      ▼
┌──────────────────┐  ┌──────────────────┐
│  BLUE (Current)  │  │ GREEN (New)      │
│  Port 8080       │  │ Port 8081        │
│  Frontend: 80    │  │ Frontend: 81     │
│  (running)       │  │ (during deploy)  │
└──────────────────┘  └──────────────────┘
       ▲                      ▲
       └──────────────────────┘
      Shared PostgreSQL & Redis
```

## Working on Production Code

### Development Workflow

1. **Work on feature branches** (never directly on `main`)
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/my-feature
   ```

2. **Test locally**
   ```bash
   make docker-up          # Start PostgreSQL + Redis
   make backend-dev        # Terminal 1: Backend
   make frontend-dev       # Terminal 2: Frontend
   # Open http://localhost:5173
   ```

3. **Push and create PR**
   ```bash
   git push origin feature/my-feature
   # Create PR: feature/my-feature -> develop
   ```

4. **Merge to develop** (automatic staging deployment)
   ```
   Staging: your-domain-staging.com
   Test your changes there
   If found issues: create hotfix, merge to develop again
   ```

5. **Promote to production** (when ready)
   ```bash
   # Create PR: develop -> main
   # After merge, production deployment begins
   ```

## Zero-Downtime Deployment

### Option 1: Automated Blue-Green Deployment

```bash
# This is the recommended approach
# It keeps both versions running, switches traffic gracefully

bash scripts/deploy-blue-green.sh
# Script will:
# 1. Pull new images
# 2. Start GREEN environment (new version)
# 3. Health check GREEN
# 4. Wait for your approval
# 5. Switch traffic from BLUE to GREEN
# 6. Stop OLD version
# 7. Allow immediate rollback if needed
```

### Option 2: Manual Blue-Green Deployment

```bash
# Terminal 1: Monitor deployment
docker-compose -f docker-compose.blue-green.yml logs -f

# Terminal 2: Start new version (GREEN)
docker-compose -f docker-compose.blue-green.yml --profile green up -d \
  backend-green frontend-green

# Wait for health checks to pass
sleep 20
curl http://localhost:8081/health
curl http://localhost:81/health.html

# Switch traffic (via nginx)
sudo bash scripts/blue-green-traffic.sh switch green

# Monitor
curl -I http://your-domain.com/health

# If OK, stop old version (BLUE)
docker-compose -f docker-compose.blue-green.yml down backend-blue frontend-blue

# If problems, quickly switch back
sudo bash scripts/blue-green-traffic.sh switch blue
```

## Nginx Configuration

Your nginx/load balancer should be configured to read from [nginx/blue-green.conf](../nginx/blue-green.conf):

```bash
# Symlink or copy the blue-green config
sudo cp nginx/blue-green.conf /etc/nginx/sites-available/clipper
sudo ln -sf /etc/nginx/sites-available/clipper /etc/nginx/sites-enabled/

# Set initial environment (blue is default)
echo "blue" | sudo tee /etc/nginx/active_env

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### Switching Traffic Manually

```bash
# Check current status
sudo bash scripts/blue-green-traffic.sh status

# Blue (8080): healthy ✓
# Green (8081): healthy ✓
# Active: blue

# Switch to green (after deploying new version)
sudo bash scripts/blue-green-traffic.sh switch green

# Verify
sudo bash scripts/blue-green-traffic.sh status
# Active: green
```

## Health Checks

### Quick Health Check

```bash
# Basic health check
bash scripts/health-check.sh

# Verbose output with chunk inspection
VERBOSE=true CHECK_CHUNKS=true bash scripts/health-check.sh

# Custom URLs
BACKEND_URL=https://your-api.com FRONTEND_URL=https://your-domain.com \
  bash scripts/health-check.sh
```

### What to Monitor

- **Chunk loading errors**: Open DevTools Console, look for 404s on `/assets/chunk-*.js`
- **Build size**: Frontend should be chunked into multiple files, not one giant bundle
- **Load time**: Should be <5s for frontend, <500ms for API
- **CSS loading**: Should see separate CSS file requests

## Troubleshooting

### Chunking Still Not Working

```bash
# Verify vite config is correct
grep -A 5 "manualChunks" frontend/vite.config.ts

# Should see something like:
#   manualChunks: (id) => {
#     if (id.includes('node_modules/react')) {
#       return 'vendor-react';
#     }

# Rebuild and verify chunks are created
cd frontend
npm run build
ls -la dist/assets/ | grep -E "chunk|vendor"

# Should see multiple chunk files like:
# app-abc123.js
# vendor-def456.js
# chunk-ghi789.js
# vendor-react-jkl012.js
```

### Chunks Not Loading (404 errors)

1. **Check nginx routing**
   ```bash
   # Verify nginx can serve static files
   curl -I http://localhost/assets/app-*.js
   # Should return 200, not 404
   ```

2. **Check frontend build**
   ```bash
   cd frontend
   npm run build
   # Should complete without errors
   # dist/ should have assets/ subdirectory
   ```

3. **Check Docker volume mounting**
   ```bash
   docker-compose exec frontend-blue ls -la /usr/share/nginx/html/assets/
   # Should show chunk files
   ```

### Deployment Stuck

```bash
# Kill stray processes
docker-compose down

# Start fresh
docker-compose -f docker-compose.blue-green.yml up -d backend-blue frontend-blue

# Wait for health
sleep 30
bash scripts/health-check.sh
```

### Can't Switch Back to Blue

```bash
# Emergency: directly route to blue
echo "blue" | sudo tee /etc/nginx/active_env
sudo systemctl reload nginx

# Then restart blue services
docker-compose -f docker-compose.blue-green.yml up -d backend-blue frontend-blue
```

## Database Migrations

Migrations run automatically on deploy, but can be managed manually:

```bash
# Run pending migrations
make migrate-up

# Rollback last migration
make migrate-down

# Check status
make migrate-status

# Create new migration
make migrate-create NAME=add_new_column
```

**Important:** Ensure backward compatibility:
- Add new columns as nullable with defaults
- Remove old columns in a follow-up deployment (after prior code deployed)
- Never delete active data structures in one deployment

## Monitoring Production

```bash
# View all logs
docker-compose logs -f

# Just backend
docker-compose logs -f backend

# Just frontend
docker-compose logs -f frontend

# Show specific number of lines
docker-compose logs -f --tail 100 backend

# Search logs
docker-compose logs backend | grep -i error
```

## Rollback Procedure

### Immediate Rollback (after traffic switch)

```bash
# Option 1: Switch traffic back immediately
sudo bash scripts/blue-green-traffic.sh switch blue

# Option 2: Full rollback (restart old containers)
docker-compose -f docker-compose.blue-green.yml down backend-green frontend-green
sudo bash scripts/blue-green-traffic.sh switch blue
```

### Git-based Rollback

```bash
# If issue is in code
git log --oneline | head -5
# Find commit to revert to

git revert <commit-hash>
git push origin main

# Then redeploy
bash scripts/deploy-blue-green.sh
```

## Performance Tips

1. **Monitor chunk sizes**
   ```bash
   cd frontend
   npm run build
   # Check the summary output
   # Large chunks indicate need for better splitting
   ```

2. **Cache busting**
   - Chunks include content hash: `chunk-abc123.js`
   - Browsers automatically refetch if content changes
   - No need to manually bust cache

3. **CDN/Edge caching**
   ```nginx
   # Add to nginx config for static assets
   location /assets/ {
       expires 1y;  # Cache for 1 year (hash prevents stale)
       add_header Cache-Control "public, immutable";
   }

   location / {
       expires -1;  # No cache for HTML (always check for updates)
       add_header Cache-Control "no-cache";
   }
   ```

## Recovery Checklist

If something goes wrong:

- [ ] Check health endpoints: `curl http://localhost:8080/health`
- [ ] Check logs: `docker-compose logs -f`
- [ ] Monitor browser console: DevTools → Console tab, look for errors
- [ ] Verify chunks load: DevTools → Network tab, check for 404s
- [ ] Check disk space: `df -h`
- [ ] Check memory: `free -h`
- [ ] Check Docker status: `docker ps`, `docker-compose ps`
- [ ] Rollback traffic if needed: `sudo bash scripts/blue-green-traffic.sh switch <blue|green>`
- [ ] Review vite.config.ts for chunking issues
- [ ] Rebuild frontend if needed: `cd frontend && npm run build`

## Additional Resources

- [Development Workflow Guide](../docs/development-workflow.md)
- [Vite Config](../frontend/vite.config.ts)
- [Docker Compose Setup](../docker-compose.blue-green.yml)
- [Nginx Config](../nginx/blue-green.conf)
- [Deployment Scripts](../scripts/)
