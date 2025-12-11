---
title: "Deployment Documentation"
summary: "Deployment guides, Docker setup, CI/CD pipelines, and infrastructure documentation."
tags: ["deployment", "hub", "index", "docker", "ci-cd"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-11
aliases: ["deployment hub", "docker", "ci/cd"]
---

# Deployment Documentation

This section covers deployment strategies, Docker configuration, CI/CD pipelines, and infrastructure as code.

## Quick Links

- [[../operations/deployment|Deployment Guide]] - Production deployment procedures
- [[docker|Docker Setup]] - Container configuration and orchestration
- [[../operations/cicd|CI/CD Pipeline]] - Automated workflows
- [[../operations/infra|Infrastructure]] - Cloud resources and scaling

## Documentation Index

```dataview
TABLE title, summary, status, last_reviewed
FROM "docs/deployment"
WHERE file.name != "index"
SORT title ASC
```

## Deployment Strategies

### Local Development
- Docker Compose for local services
- Hot reload for rapid iteration
- See [[../setup/development|Development Setup]]

### Staging Environment
- Automated deployment on `develop` branch
- Smoke tests before promoting
- See [[../operations/cicd|CI/CD Documentation]]

### Production Deployment
- Blue-green deployment strategy
- Automated health checks
- Rollback capability
- See [[../operations/deployment|Deployment Procedures]]

## Container Images

```dataview
TABLE summary, version, last_reviewed
FROM "docs/deployment"
WHERE contains(tags, "docker")
SORT version DESC
```

## CI/CD Workflows

All workflows are defined in `.github/workflows/`:

- `ci.yml` - Continuous integration (lint, test, build)
- `docker.yml` - Container image building and scanning
- `docs.yml` - Documentation validation
- `deploy-staging.yml` - Staging deployment
- `deploy-production.yml` - Production deployment

See [[../operations/cicd|CI/CD Guide]] for detailed workflow documentation.

---

**See also:**
[[../operations/runbook|Runbook]] ·
[[../operations/monitoring|Monitoring]] ·
[[../index|Documentation Home]]
