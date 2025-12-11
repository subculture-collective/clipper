---
title: "Backend Documentation"
summary: "Go backend architecture, API, database, and services documentation."
tags: ["backend", "hub", "index"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["backend hub", "api docs"]
---

# Backend Documentation

This section covers the Clipper backend implemented in Go with PostgreSQL, Redis, and OpenSearch.

## Quick Links

- [[architecture|Architecture]] - System design and components
- [[api|API Reference]] - REST API endpoints and usage
- [[clip-submission-api-hub|Clip Submission API Hub]] - Complete submission API documentation
- [[database|Database]] - Schema, migrations, and queries
- [[search|Search Platform]] - OpenSearch setup and querying
- [[semantic-search|Semantic Search]] - Vector search architecture
- [[testing|Testing Guide]] - Testing strategy and tools

## Documentation Index

```dataview
TABLE title, summary, status, last_reviewed
FROM "docs/backend"
WHERE file.name != "index"
SORT title ASC
```

## Core Components

### Architecture & Design

- [[architecture|Backend Architecture]] - High-level system design
- [[api|API Reference]] - Complete REST API documentation

### APIs

- [[clip-submission-api-hub|Clip Submission API Hub]] - Submission API navigation
- [[clip-submission-api-guide|Clip Submission API Guide]] - Complete guide with examples
- [[clip-submission-api-quickref|Clip Submission Quick Reference]] - Quick reference card
- [[clip-api|Clip API]] - Clip CRUD operations
- [[comment-api|Comment API]] - Comment system with markdown
- [[webhooks|Webhooks]] - Outbound webhook integration

### Data & Storage

- [[database|Database]] - PostgreSQL schema and operations
- [[search|Search Platform]] - OpenSearch integration
- [[semantic-search|Semantic Search]] - Vector similarity search
- [[caching-strategy|Caching Strategy]] - Redis caching patterns
- [[redis-operations|Redis Operations]] - Redis management

### Security

- [[authentication|Authentication]] - OAuth and JWT flow
- [[rbac|RBAC]] - Role-based access control
- [[security|Security]] - Security best practices
- [[trust-score-implementation|Trust Score]] - Trust scoring system
- [[submission-rate-limiting|Rate Limiting]] - API rate limiting

### Integrations

- [[twitch-integration|Twitch Integration]] - Twitch API integration
- [[email-service|Email Service]] - Email notifications
- [[broadcaster-live-sync-implementation|Broadcaster Live Sync]] - Live status tracking

### Quality & Performance

- [[testing|Testing Guide]] - Unit, integration, and load testing
- [[test-roadmap|Test Roadmap]] - Testing coverage roadmap
- [[testing-performance|Performance Testing]] - Load testing strategies
- [[profiling|Profiling]] - Performance profiling guide
- [[optimization-analysis|Optimization Analysis]] - Performance optimization

---

**See also:**
[[../setup/development|Development Setup]] ·
[[../operations/deployment|Deployment]] ·
[[../index|Documentation Home]]
