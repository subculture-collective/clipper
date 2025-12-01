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
- [[database|Database]] - Schema, migrations, and queries
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

### Data & Storage

- [[database|Database]] - PostgreSQL schema and operations
- [[search|Search Platform]] - OpenSearch integration
- [[semantic-search|Semantic Search]] - Vector similarity search

### Security

- [[authentication|Authentication]] - OAuth and JWT flow
- [[rbac|RBAC]] - Role-based access control

### Quality

- [[testing|Testing Guide]] - Unit, integration, and load testing

---

**See also:**
[[../setup/development|Development Setup]] ·
[[../operations/deployment|Deployment]] ·
[[../index|Documentation Home]]
