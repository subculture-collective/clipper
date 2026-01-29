---
title: "Development Setup"
summary: "Complete guide to running Clipper locally for web, backend, and mobile development."
tags: ["setup", "development", "quickstart"]
area: "setup"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["dev setup", "local setup", "getting started"]
---

# Development Setup

This guide helps you run Clipper locally for web, backend, and mobile.

## Prerequisites

- Docker 24+
- Docker Compose v2
- Node.js 20+ and pnpm 9 (for frontend)
- Go 1.24+ (for backend)
- PostgreSQL client tools (`psql`), optional

## Quick Start (All Services)

```bash
# 1) Copy environment file
cp .env.example .env

# 2) Start core services (db, cache, search)
docker compose up -d postgres redis opensearch

# 3) Run backend API
docker compose up -d backend

# 4) Run web frontend
docker compose up -d frontend

# 5) (Optional) Mobile development
docker compose up -d mobile
```

Services come up with seeded dev data where available.

## Backend (Go)

```bash
# Install dependencies
cd backend && go mod download

# Run migrations
make migrate-up

# Start API locally
go run cmd/api/main.go

# Run tests
go test ./...
```

Endpoints: see [[../backend/api|API Reference]].

## Frontend (Web)

```bash
cd frontend
pnpm install
pnpm dev
```

Default dev server: <http://localhost:5173>

## Mobile (React Native)

```bash
cd mobile
pnpm install
pnpm start
```

Open Expo DevTools in the browser and run iOS/Android simulators.

## Data & Utilities

- Search backfill: `go run cmd/backfill-search/main.go`
- Embedding backfill: `go run cmd/backfill-embeddings/main.go`
- Load test seed: `make migrate-seed-load-test`

## Common Dev Tasks

- Lint docs: `pnpm docs:lint`
- Check links: `pnpm docs:links`
- Spell check: `pnpm docs:spell`

---

Related: [[environment|Environment]] · [[troubleshooting|Troubleshooting]] · [[../index|Index]]
