---
title: "Operations & Deployment"
summary: "Production operations, deployment procedures, and infrastructure guides."
tags: ["operations", "hub", "index"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["ops hub", "deployment hub"]
---

# Operations & Deployment

This section covers production operations, deployment, and infrastructure for Clipper.

## Quick Links

- [[deployment|Deployment]] - Production deployment procedures
- [[runbook|Runbook]] - Operational procedures
- [[infra|Infrastructure]] - Server setup and scaling
- [[monitoring|Monitoring]] - Metrics and alerting
- [[secrets-management|Secrets Management]] - Secure credential handling
- [[security-scanning|Security Scanning]] - Automated security checks

## On-Call Playbooks

- [[playbooks/search-incidents|Search Incidents]] - Semantic search troubleshooting

## Documentation Index

```dataview
TABLE title, summary, status, last_reviewed
FROM "docs/operations"
WHERE file.name != "index"
SORT title ASC
```

## Deployment Process

1. **Pre-deploy**: Run [[preflight|Preflight Checklist]]
2. **Migrations**: Apply via [[migration|Migration Guide]]
3. **Deploy**: Follow [[deployment|Deployment Procedures]]
4. **Monitor**: Check [[monitoring|Monitoring Dashboard]]
5. **Incidents**: Use [[runbook|Runbook]] for issues

## Infrastructure

- [[infra|Infrastructure]] - Cloud providers, scaling, backups
- [[cicd|CI/CD Pipeline]] - GitHub Actions workflows
- [[ci-cd-secrets|CI/CD Secrets]] - Managing deployment secrets
- [[quick-start-cicd|Quick Start CI/CD]] - Getting started with CI/CD
- [[feature-flags|Feature Flags]] - Gradual rollouts
- [[feature-flags-guide|Feature Flags Guide]] - Implementation guide
- [[observability|Observability]] - Distributed tracing and metrics
- [[performance|Performance]] - Performance optimization
- [[deployment-live-development|Live Development Deployment]] - Development deployment

---

**See also:**
[[../backend/architecture|Backend Architecture]] ·
[[../setup/development|Development Setup]] ·
[[../index|Documentation Home]]
