<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Troubleshooting](#troubleshooting)
  - [Docker Services Won't Start](#docker-services-wont-start)
  - [Backend Cannot Connect to Database](#backend-cannot-connect-to-database)
  - [OpenSearch Health Red/Yellow](#opensearch-health-redyellow)
  - [Embeddings Missing](#embeddings-missing)
  - [Frontend Can't Reach API](#frontend-cant-reach-api)
  - [Tests Failing Randomly](#tests-failing-randomly)
  - [Rate Limit Errors](#rate-limit-errors)
  - [Useful Commands](#useful-commands)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Troubleshooting"
summary: "Common issues and quick fixes for Clipper development and operations."
tags: ["setup", "troubleshooting", "debugging"]
area: "setup"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["debug", "common issues", "help"]
---

# Troubleshooting

Common issues and quick fixes when developing or running Clipper.

## Docker Services Won't Start

- Run `docker compose ps` and check logs: `docker compose logs -f <service>`
- Ensure ports are free: 5436 (Postgres), 6380 (Redis), 9200 (OpenSearch)
- Remove stale volumes: `docker compose down -v && docker compose up -d`

## Backend Cannot Connect to Database

- Verify `POSTGRES_URL` matches docker-compose service and port
- Run `psql` locally to confirm connection
- Run migrations: `make migrate-up`

## OpenSearch Health Red/Yellow

- Check cluster health: `curl :9200/_cluster/health?pretty`
- Recreate indices: `go run cmd/backfill-search/main.go`
- Refresh indices: `curl -X POST :9200/_refresh`

## Embeddings Missing

- Count missing: `psql -c "SELECT COUNT(*) FILTER (WHERE embedding IS NULL) FROM clips;"`
- Backfill: `go run cmd/backfill-embeddings/main.go -batch 50`

## Frontend Can't Reach API

- Confirm `VITE_API_BASE` in `.env` or `.env.local`
- Check CORS and proxy settings
- Verify backend is listening on `SERVER_PORT`

## Tests Failing Randomly

- Use `waitFor` in frontend tests
- Avoid sleeps; prefer deterministic synchronization
- Separate unit vs integration test runs

## Rate Limit Errors

- Anonymous limit: 60 rpm; Authenticated: 300 rpm
- Inspect `X-RateLimit-*` headers
- Space requests or upgrade plan if applicable

## Useful Commands

```bash
docker compose ps
docker compose logs -f backend
docker compose down -v && docker compose up -d
make migrate-up
pnpm docs:lint
pnpm docs:links
pnpm docs:spell
```

---

Related: [[development|Development]] · [[environment|Environment]] · [[../backend/search|Search]] · [[../backend/semantic-search|Semantic Search]]
