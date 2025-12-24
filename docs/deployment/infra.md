---
title: "Infrastructure"
summary: "Infrastructure architecture, cloud providers, scaling, and disaster recovery."
tags: ["deployment", "infrastructure", "scaling"]
area: "deployment"
status: "stable"
owner: "team-ops"
version: "1.0"
last_reviewed: 2025-12-24
aliases: ["infra", "cloud infrastructure"]
---

# Infrastructure

Infrastructure architecture and deployment for Clipper.

## Architecture

Production runs on Kubernetes with:
- 3+ API pods (Go backend)
- 2+ Frontend pods (Nginx serving static React build)
- PostgreSQL 17 (managed service or StatefulSet)
- Redis 8 Cluster (3+ nodes)
- OpenSearch 2.11 (3-node cluster)

## Cloud Providers

Supports:
- AWS (EKS, RDS, ElastiCache, OpenSearch Service)
- GCP (GKE, Cloud SQL, Memorystore, Elasticsearch)
- DigitalOcean (Kubernetes, Managed Databases)

## Load Balancing

- Ingress controller (Nginx or Traefik)
- TLS termination at load balancer
- Health checks: `/health` endpoint

## Scaling

Horizontal scaling:
- Backend: scale pods based on CPU/memory
- Frontend: CDN (CloudFlare, Fastly)
- Database: read replicas for queries
- Cache: Redis Cluster
- Search: OpenSearch cluster nodes

## Database Backups

- Automated daily backups (7-day retention)
- Point-in-time recovery (PITR) enabled
- Stored in S3/GCS with encryption
- RTO: 1 hour, RPO: 1 hour

See [[../backend/database|Database]].

## Secrets Management

- Kubernetes Secrets for credentials
- External: Vault, AWS Secrets Manager, GCP Secret Manager
- Rotate JWT_SECRET, API keys quarterly

## Monitoring & Alerting

- Prometheus + Grafana for metrics
- Loki for log aggregation
- PagerDuty/OpsGenie for alerts

See [[../operations/monitoring|Monitoring]].

## Disaster Recovery

Plan:
1. Database restore from latest backup
2. Rebuild search indices from PostgreSQL
3. Regenerate embeddings if needed
4. Verify data integrity before resuming traffic

---

Related: [[docker|Docker Deployment]] · [[ci_cd|CI/CD]] · [[../operations/monitoring|Monitoring]] · [[../operations/migration|Migrations]]

[[index|← Back to Deployment]]
