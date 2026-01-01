---
title: "Operations"
summary: "Production operations procedures, monitoring, and security."
tags: ["operations", "hub", "index"]
area: "operations"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-24
aliases: ["ops hub"]
---

# Operations

Production operations, monitoring, security, and maintenance procedures.

## Quick Links

### Kubernetes Operations
- [[kubernetes-runbook|Kubernetes Runbook]] - Complete K8s operations guide
- [[kubernetes-scaling|Kubernetes Scaling]] - HPA, cluster autoscaling, resource management
- [[kubernetes-troubleshooting|Kubernetes Troubleshooting]] - Common issues and debugging
- [[kubernetes-disaster-recovery|Kubernetes Disaster Recovery]] - Backup, restore, failover
- [[kubernetes-cost-optimization|Kubernetes Cost Optimization]] - Cost reduction strategies
- [[resource-quotas|Resource Quotas & Limits]] - Quota enforcement and OOM prevention

### Platform Operations
- [[monitoring|Monitoring]] - Metrics, logs, and alerting
- [[preflight|Preflight Checklist]] - Pre-deployment validation
- [[migration|Database Migrations]] - Migration procedures
- [[secrets-management|Secrets Management]] - Secure credential handling
- [[security-scanning|Security Scanning]] - Automated security checks
- [[observability|Observability]] - Distributed tracing

## Deployment

For deployment procedures, see the **[[../deployment/index|Deployment Hub]]**:

- [[../deployment/docker|Docker Deployment]] - Container-based deployment
- [[../deployment/ci_cd|CI/CD Pipeline]] - GitHub Actions workflows
- [[../deployment/infra|Infrastructure]] - Cloud infrastructure and scaling
- [[../deployment/runbook|Operations Runbook]] - Day-to-day operational procedures

## Security & Compliance

- [Security Audit Report](./SECURITY_AUDIT_REPORT.md) - Comprehensive pre-launch security audit
- [Security Audit Executive Summary](./SECURITY_AUDIT_EXECUTIVE_SUMMARY.md) - Executive overview and key findings
- [Security Audit Checklist](./SECURITY_AUDIT_CHECKLIST.md) - Detailed security audit checklist (250 items)
- [[break-glass-procedures|Break Glass Procedures]] - Emergency access procedures
- [[credential-rotation-runbook|Credential Rotation]] - Regular credential rotation
- [[vault-access-control|Vault Access Control]] - HashiCorp Vault access management

## On-Call Playbooks

- [[playbooks/search-incidents|Search Incidents]] - Semantic search troubleshooting
- [[playbooks/slo-breach-response|SLO Breach Response]] - Responding to SLO violations

## Advanced Topics

- [[feature-flags|Feature Flags]] - Gradual rollouts
- [[feature-flags-guide|Feature Flags Guide]] - Implementation guide
- [[performance|Performance]] - Performance optimization
- [[slos|Service Level Objectives]] - SLO definitions and tracking
- [[staging-environment|Staging Environment]] - Staging deployment and testing
- [[centralized-logging|Centralized Logging]] - Log aggregation and analysis
- [[ci-cd-secrets|CI/CD Secrets]] - Managing deployment secrets
- [[ci-cd-vault-integration|CI/CD Vault Integration]] - Vault integration for CI/CD
- [[webhook-monitoring|Webhook Monitoring]] - Monitoring outbound webhooks

## Documentation Index

```dataview
TABLE title, summary, status, last_reviewed
FROM "docs/operations"
WHERE file.name != "index"
SORT title ASC
```

---

**See also:**
[[../deployment/index|Deployment Hub]] ·
[[../backend/architecture|Backend Architecture]] ·
[[../setup/development|Development Setup]] ·
[[../index|Documentation Home]]
