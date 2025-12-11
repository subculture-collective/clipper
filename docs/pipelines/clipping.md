<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Pipelines: Clipping Workflow](#pipelines-clipping-workflow)
  - [Lifecycle](#lifecycle)
  - [Metadata Enrichment](#metadata-enrichment)
  - [Search Indexing](#search-indexing)
  - [Embedding Generation](#embedding-generation)
  - [Updates & Deletions](#updates--deletions)
  - [Monitoring](#monitoring)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Clipping Workflow"
summary: "How clips move through the system after ingestion."
tags: ["pipelines", "clipping", "workflow"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["clip processing", "enrichment"]
---

# Pipelines: Clipping Workflow

How clips move through the system after ingestion.

## Lifecycle

```text
1. Ingest → 2. Metadata enrichment → 3. Search indexing → 4. Embedding generation
→ 5. Available for discovery
```

## Metadata Enrichment

After initial save:
- Extract game/broadcaster info from Twitch
- Generate default tags (auto-tagging future feature)
- Calculate initial scores (hot_score = 0, vote_score = 0)

## Search Indexing

Clip is indexed in OpenSearch:
- Full-text fields: title, description
- Filters: game_id, broadcaster_id, created_at
- Autocomplete: title prefix n-grams

See [[../backend/search|Search Platform]].

## Embedding Generation

Asynchronous job generates semantic vector:
- Combines: title + description + game + broadcaster + tags
- Model: text-embedding-ada-002 or self-hosted
- Stored in PostgreSQL clips.embedding column
- HNSW index auto-updates

See [[../backend/semantic-search|Semantic Search]].

## Updates & Deletions

- User edits tags → re-index + regenerate embedding
- Vote/comment → update scores, no re-index needed
- Deletion → remove from PostgreSQL, OpenSearch, cache

## Monitoring

Track:
- Ingestion rate (clips/hour)
- Twitch API latency & errors
- Embedding backlog size
- Search index lag

---

Related: [[ingest|Ingestion]] · [[analysis|Analytics]] · [[../operations/monitoring|Monitoring]]

[[../index|← Back to Index]]
