---
title: "Architecture Decisions"
summary: "Architecture Decision Records (ADRs) for major technical decisions."
tags: ["decisions", "hub", "index"]
area: "docs"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["adrs", "decisions hub"]
---

# Architecture Decisions

This section contains Architecture Decision Records (ADRs) documenting major technical decisions.

## Quick Links

- [[adr-1-semantic-search-vector-db|ADR-001: Semantic Search]] - Vector database selection
- [[adr-002-mobile-framework-selection|ADR-002: Mobile Framework]] - React Native + Expo
- [[adr-003-advanced-query-language|ADR-003: Query Language]] - Advanced search syntax

## Documentation Index

```dataview
TABLE title, summary, status, last_reviewed
FROM "docs/decisions"
WHERE file.name != "index"
SORT title ASC
```

## ADR Template

When adding new ADRs, use this structure:

```markdown
# ADR-NNN: Title

**Status**: Proposed | Accepted | Deprecated | Superseded
**Date**: YYYY-MM-DD
**Decision Makers**: Team/Person
**Related Issues**: Links

## Context
What is the issue or challenge?

## Decision
What was decided and why?

## Consequences
What are the implications?

## Alternatives Considered
What other options were evaluated?
```

---

**See also:** [[../backend/architecture|Backend Architecture]] · [[../index|Documentation Home]]
