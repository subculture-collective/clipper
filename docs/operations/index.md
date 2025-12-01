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
- [[feature-flags|Feature Flags]] - Gradual rollouts

---

**See also:** [[../backend/architecture|Backend Architecture]] · [[../setup/development|Development Setup]] · [[../index|Documentation Home]]
