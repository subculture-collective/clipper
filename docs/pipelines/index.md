<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Pipelines Documentation](#pipelines-documentation)
  - [Quick Links](#quick-links)
  - [Documentation Index](#documentation-index)
  - [Data Flow](#data-flow)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Pipelines Documentation"
summary: "Data ingestion, processing, and analytics pipelines."
tags: ["pipelines", "hub", "index"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["pipelines hub", "data flow"]
---

# Pipelines Documentation

This section covers data pipelines for ingestion, processing, and analytics.

## Quick Links

- [[ingest|Data Ingestion]] - Twitch clip import
- [[clipping|Clip Processing]] - Metadata enrichment
- [[analysis|Analytics Pipeline]] - User behavior tracking

## Documentation Index

```dataview
TABLE title, summary, status, last_reviewed
FROM "docs/pipelines"
WHERE file.name != "index"
SORT title ASC
```

## Data Flow

```text
Twitch API → Ingestion → Enrichment → Search Index → Embeddings → Discovery
```

---

**See also:**
[[../backend/search|Search Platform]] ·
[[../backend/semantic-search|Semantic Search]] ·
[[../index|Documentation Home]]
