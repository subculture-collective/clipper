<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Environment Setup](#environment-setup)
  - [Environment Files](#environment-files)
  - [Required Variables (Common)](#required-variables-common)
  - [Backend](#backend)
  - [Frontend](#frontend)
  - [Mobile](#mobile)
  - [Production Notes](#production-notes)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Environment Variables"
summary: "Complete reference for environment variables across backend, frontend, and mobile services."
tags: ["setup", "environment", "configuration", "envvar"]
area: "setup"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["env vars", "config", "environment setup"]
---

# Environment Setup

Configuration for running Clipper across development and production.

## Environment Files

- Root `.env` is used by Docker Compose and services.
- Copy from template:

```bash
cp .env.example .env
```

## Required Variables (Common)

- `POSTGRES_URL` – PostgreSQL connection string
- `REDIS_URL` – Redis connection string
- `OPENSEARCH_URL` – OpenSearch endpoint
- `JWT_SECRET` – Secret for signing JWTs
- `TWITCH_CLIENT_ID`, `TWITCH_SECRET` – OAuth credentials

## Backend

```env
SERVER_PORT=8080
POSTGRES_URL=postgresql://clipper:clipper_password@localhost:5436/clipper_db?sslmode=disable
REDIS_URL=redis://localhost:6380
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_INSECURE_SKIP_VERIFY=true
JWT_SECRET=change_me_in_prod
TWITCH_CLIENT_ID=
TWITCH_SECRET=
```

## Frontend

```env
VITE_API_BASE=http://localhost:8080/api/v1
VITE_FEATURE_FLAGS=local
```

See [[../operations/feature-flags|Feature Flags]].

## Mobile

```env
EXPO_PUBLIC_API_BASE=http://localhost:8080/api/v1
EXPO_PUBLIC_FEATURE_FLAGS=local
```

## Production Notes

- Use managed secrets (Vault, GitHub Secrets, or Cloud KMS)
- Set `OPENSEARCH_INSECURE_SKIP_VERIFY=false` with valid TLS certs
- Use distinct databases/users per environment
- Rotate `JWT_SECRET` periodically
- Configure rate limits and CORS for production domains

---

Related: [[development|Development]] · [[../operations/deployment|Deployment]] · [[../index|Index]]
