<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Development Environment - Ready to Launch! 🚀](#development-environment---ready-to-launch-)
  - [Summary](#summary)
  - [What's Been Done](#whats-been-done)
    - [1. ✅ Fixed Chunking Issue (Previous Session)](#1--fixed-chunking-issue-previous-session)
    - [2. ✅ Fixed Backend Configuration (This Session)](#2--fixed-backend-configuration-this-session)
    - [3. ✅ Established Development Workflows](#3--established-development-workflows)
    - [4. ✅ Created Documentation](#4--created-documentation)
  - [Quick Start (Right Now)](#quick-start-right-now)
    - [Terminal 1: Start Database & Services](#terminal-1-start-database--services)
    - [Terminal 2: Start Backend](#terminal-2-start-backend)
    - [Terminal 3: Start Frontend](#terminal-3-start-frontend)
    - [Browser](#browser)
  - [Development Commands](#development-commands)
  - [Feature Development Process](#feature-development-process)
    - [1. Create Feature Branch](#1-create-feature-branch)
    - [2. Start Development](#2-start-development)
    - [3. Make Changes](#3-make-changes)
    - [4. Commit & Push](#4-commit--push)
    - [5. Create PR on GitHub](#5-create-pr-on-github)
    - [6. After Review & Merge](#6-after-review--merge)
  - [Environment Configuration](#environment-configuration)
    - [Backend (.env files)](#backend-env-files)
    - [Frontend (.env files)](#frontend-env-files)
    - [Services Running](#services-running)
  - [Git Workflow](#git-workflow)
  - [Common Issues & Solutions](#common-issues--solutions)
  - [Documentation References](#documentation-references)
  - [Current Git State](#current-git-state)
  - [Next Actions](#next-actions)
    - [Immediate (Now)](#immediate-now)
    - [Today](#today)
    - [This Week](#this-week)
  - [Need Help?](#need-help)
  - [Summary](#summary-1)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Development Environment - Ready to Launch! 🚀

## Summary

Your development environment is **fully configured and ready to use**. All infrastructure is in place, and best practices have been established.

---

## What's Been Done

### 1. ✅ Fixed Chunking Issue (Previous Session)
- **Problem**: Frontend bundled into single massive file → timeout on load
- **Solution**: Configured intelligent code splitting in vite.config.ts
- **Result**: Faster parallel chunk loading, no more timeouts

### 2. ✅ Fixed Backend Configuration (This Session)
- **Problem**: Backend tried connecting to `localhost` instead of Docker service names
- **Solution**: Updated .env files for both container and local development:
  - Docker: Uses `clipper-postgres:5432` and `clipper-redis:6379`
  - Local: Uses `localhost:5436` and `localhost:6379`
- **Result**: Backend can now connect to database in both environments

### 3. ✅ Established Development Workflows
- Created comprehensive development plans
- Documented git branching strategy
- Outlined feature development process
- Created deployment procedures

### 4. ✅ Created Documentation
- **DEVELOPMENT_PLAN.md** - Complete dev guide (30+ min read, reference material)
- **DEV_STATUS_AND_PLAN.md** - Quick status and action items
- **DEPLOYMENT_IMPROVEMENTS.md** - Deployment overview
- **QUICK_REFERENCE.md** - Command cheat sheet
- All guides linked and cross-referenced

---

## Quick Start (Right Now)

### Terminal 1: Start Database & Services
```bash
cd /home/onnwee/projects/clipper
docker compose up -d postgres redis vault-agent
```

### Terminal 2: Start Backend
```bash
cd /home/onnwee/projects/clipper/backend
go run cmd/api/main.go
# Output: [GIN-debug] Loaded, ListenAndServe on :8080
```

### Terminal 3: Start Frontend
```bash
cd /home/onnwee/projects/clipper/frontend
npm run dev
# Output: ➜ Local: http://localhost:5173/
```

### Browser
Open: **http://localhost:5173**

That's it! Development environment is running.

---

## Development Commands

```bash
# Database migrations
make migrate-up              # Run pending migrations
make migrate-down            # Rollback last migration
make migrate-create NAME=foo # Create new migration

# Testing
make test                 # All tests
make test-unit            # Unit tests
make test-coverage        # With coverage report

# Building
make build              # Build everything
make backend-build      # Backend binary
make frontend-build     # Optimized frontend build

# Development shortcuts
make dev               # Start backend + frontend together
make backend-dev       # Backend with hot reload
make frontend-dev      # Frontend with hot reload
make docker-up         # Start database services only
make docker-down       # Stop database services
make lint              # Run linters

# Health checks
bash scripts/health-check.sh        # Full system health
bash scripts/dev-setup.sh           # Environment setup guide
```

---

## Feature Development Process

### 1. Create Feature Branch
```bash
git checkout -b feature/my-awesome-feature develop
```

### 2. Start Development
```bash
# Three terminals:
docker compose up -d postgres redis  # Terminal 1
cd backend && go run cmd/api/main.go  # Terminal 2
cd frontend && npm run dev            # Terminal 3
```

### 3. Make Changes
- Edit code → hot reload in browser
- Changes auto-reload on save
- Test in browser immediately

### 4. Commit & Push
```bash
git add .
git commit -m "feat: description of what you did"
git push origin feature/my-awesome-feature
```

### 5. Create PR on GitHub
- Go to https://github.com/subculture-collective/clipper
- Click "Compare & pull request"
- Ensure base is `develop` (not main!)
- Add description, link issues
- Request review

### 6. After Review & Merge
- Automatic deployment to staging
- Team tests on staging environment
- If good, merge to main when ready
- Automatic production deployment

---

## Environment Configuration

### Backend (.env files)
- **backend/.env** - Main config (localhost for local dev)
- **backend/.env.local** - Alternative (for reference)
- Changes: `DB_HOST` and `REDIS_HOST` for proper connections

### Frontend (.env files)
- **frontend/.env** - Development config
- **frontend/.env.production** - Production config
- API endpoint: http://localhost:8080 (local dev)

### Services Running
- PostgreSQL: localhost:5436 (mapped from 5432 inside Docker)
- Redis: localhost:6379 (host port, 6379 inside Docker)
- Vault: localhost:8200 (secrets management)

---

## Git Workflow

```
main (production)
  ↑
  ├── (PR) ← develop (staging)
  │            ↑
  │            ├── (PR) ← feature/your-feature
  │            │              ↑ Your work here
  │            └── (PR) ← hotfix/urgent-fix
  │
  └── (auto-deploy to production)
```

**Rules:**
- Never push directly to `main` or `develop`
- Always create feature branches
- Use descriptive names: `feature/add-voting`, `fix/database-error`
- Create PR for review before merging
- Delete branch after merge

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `connect: connection refused` | Docker services not running: `docker compose up -d postgres redis` |
| `database not found` | Run migrations: `make migrate-up` |
| `hot reload not working` | Restart dev server (Ctrl+C, then `npm run dev` again) |
| `port 8080 in use` | Check: `lsof -i :8080` then `kill <PID>` |
| `Cannot find module` | Run: `npm install` (in frontend/) or `go mod download` (in backend/) |
| `backend can't connect` | Check DB_HOST and REDIS_HOST in backend/.env |

---

## Documentation References

📖 **Read these in order:**

1. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** (2 min)
   - Command cheat sheet
   - Quick troubleshooting

2. **[DEV_STATUS_AND_PLAN.md](DEV_STATUS_AND_PLAN.md)** (5 min)
   - Current status
   - Next steps
   - Quick start

3. **[DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)** (20 min)
   - Complete development guide
   - All workflows
   - Detailed troubleshooting

4. **[DEPLOYMENT_IMPROVEMENTS.md](DEPLOYMENT_IMPROVEMENTS.md)** (10 min)
   - Deployment overview
   - Blue-green strategy
   - Zero-downtime deployments

5. **[docs/development-workflow.md](docs/development-workflow.md)** (15 min)
   - Detailed workflow guide
   - Three-branch strategy
   - Release process

6. **[docs/deployment-live-development.md](docs/deployment-live-development.md)** (20 min)
   - Full deployment procedures
   - Monitoring & health checks
   - Recovery procedures

---

## Current Git State

```
Branch: main (current)
Remote: origin (GitHub)
Latest commits:
  - Add outbound webhooks for clip submissions
  - Audit creator dashboard for performance
  - Add rate limiting and abuse detection
  - Add creator notification preferences
  - Add export API for creator dashboard
```

Local branches available:
- `main` (production)
- `develop` (staging) - on GitHub, can fetch
- `onnwee/local-dev` (your local work)
- Various `copilot/*` branches from previous work

---

## Next Actions

### Immediate (Now)
1. ✅ Start database services: `docker compose up -d postgres redis`
2. ✅ Start backend: `cd backend && go run cmd/api/main.go`
3. ✅ Start frontend: `cd frontend && npm run dev`
4. ✅ Open http://localhost:5173 in browser

### Today
1. Choose a feature or fix to work on
2. Create feature branch: `git checkout -b feature/your-task develop`
3. Make changes and test
4. Commit and push
5. Create PR on GitHub

### This Week
1. Get feedback on PR
2. Address review comments
3. Merge to develop (auto-deploys to staging)
4. Team tests on staging
5. When ready, merge to main (auto-deploys to production)

---

## Need Help?

- **Command reference**: [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Setup issues**: [DEV_STATUS_AND_PLAN.md](DEV_STATUS_AND_PLAN.md) Troubleshooting
- **Detailed guide**: [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md)
- **Team**: Slack/Discord for real-time help

---

## Summary

✅ **Infrastructure**: PostgreSQL, Redis, Vault running
✅ **Backend**: Configured for localhost development
✅ **Frontend**: Ready for hot reload development
✅ **Database**: Migrations up to date
✅ **Git**: Feature branch workflow established
✅ **Documentation**: Complete guides in place
✅ **Best Practices**: Code review, staging, production pipelines set up

**Status: READY FOR DEVELOPMENT** 🎉

---

**Ready to code?**

```bash
# Terminal 1
docker compose up -d postgres redis

# Terminal 2
cd backend && go run cmd/api/main.go

# Terminal 3
cd frontend && npm run dev

# Browser
http://localhost:5173
```

Enjoy! 🚀
