---
title: "Preflight Checklist"
summary: "Pre-deployment validation checklist for production deployments."
tags: ["operations", "preflight", "checklist"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["deploy checklist", "pre-deploy"]
---

# Preflight Checklist

Pre-deployment validation checklist for production deployments.

## Quick Checklist

Before **every** production deploy:

### Code Quality ✅

- [ ] All CI checks passing (lint, test, build)
- [ ] Code review approved (2+ reviewers)
- [ ] Security scans clean (CodeQL, Trivy)
- [ ] No blocking issues in tracker
- [ ] CHANGELOG updated

### Environment ✅

- [ ] `.env` production values verified
- [ ] JWT_SECRET, DB_PASSWORD secure (>32 chars)
- [ ] CORS_ALLOWED_ORIGINS = production domains
- [ ] GIN_MODE=release, SENTRY_ENABLED=true
- [ ] SSL/TLS certificates valid (>30 days)

### Database ✅

- [ ] Migrations tested on staging
- [ ] Backup created (<24h old)
- [ ] Connection from app server verified
- [ ] Performance acceptable (ANALYZE run)

### Infrastructure ✅

- [ ] Services running (PostgreSQL, Redis, OpenSearch)
- [ ] Disk space >20% free
- [ ] Memory >2GB free
- [ ] Docker images available in ghcr.io

### Staging Rehearsal ✅

- [ ] Full deployment on staging successful
- [ ] Migration executed without errors
- [ ] Smoke tests passed
- [ ] Rollback tested

## Automated Check

Run preflight script:

```bash
./scripts/preflight-check.sh --env production
```

Validates:
- Environment variables
- Database connectivity
- Service health
- Resource availability
- SSL certificates
- Backup recency

## Rollback Criteria

Initiate rollback if within 1 hour of deployment:

- **Critical**: Error rate >5%, service outage >2min, data loss
- **High**: Error rate >1%, response time +50%, DB pool exhausted
- **Medium**: Non-critical feature broken, performance degraded

## Post-Deployment

Verify within 1 hour:

- [ ] Health checks responding
- [ ] No error spikes in Sentry
- [ ] Response times normal
- [ ] User login working
- [ ] Mobile app connecting

## Full Checklist

For complete preflight procedures, see original [PREFLIGHT_CHECKLIST.md](../../docs/PREFLIGHT_CHECKLIST.md) in archive.

---

Related: [[deployment|Deployment]] · [[migration|Migrations]] · [[monitoring|Monitoring]]

[[../index|← Back to Index]]
