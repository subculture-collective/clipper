---
title: "Search Platform"
summary: "OpenSearch-based search with hybrid BM25 + semantic vector ranking."
tags: ["backend", "search", "opensearch"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["search", "opensearch", "full-text search"]
---

# Search Platform

OpenSearch-based search with hybrid BM25 + semantic vector ranking, query language, and typo tolerance.

## Overview

Clipper uses OpenSearch (v2.11) for full-text search with graceful PostgreSQL fallback. The system supports:
- Full-text search (BM25)
- Advanced query language with filters and boolean logic
- Typo tolerance via fuzzy matching
- Autocomplete suggestions
- Multi-index search (clips, users, games, tags)
- Hybrid semantic search (BM25 + vector re-ranking)

See [[semantic-search|Semantic Search]] for vector search details.

## Architecture

### Components
1. OpenSearch Client (`pkg/opensearch/client.go`)
2. Search Indexer Service (`internal/services/search_indexer_service.go`)
3. OpenSearch Search Service (`internal/services/opensearch_search_service.go`)
4. Search Handler (`internal/handlers/search_handler.go`)

### Indices
- clips: Twitch clips with metadata
- users: User profiles (creators/broadcasters)
- games: Game information aggregated from clips
- tags: User-defined tags

## Setup

### 1. Start OpenSearch
```bash
docker compose up -d opensearch
curl http://localhost:9200/_cluster/health
```

### 2. Environment
```bash
OPENSEARCH_URL=http://localhost:9200
OPENSEARCH_USERNAME=
OPENSEARCH_PASSWORD=
OPENSEARCH_INSECURE_SKIP_VERIFY=true  # Dev only!
```

### 3. Initialize Indices
```bash
go run cmd/backfill-search/main.go
```

### 4. Backfill Existing Data
```bash
cd backend
go run cmd/backfill-search/main.go -batch 100
```

## API Usage

### Search Endpoint
```
GET /api/v1/search
```
See [[api|API Reference]].

### Advanced Query Language
Use the `q` parameter:
```bash
?q=valorant
?q=game:valorant tag:clutch votes:>50
?q=(game:valorant OR game:csgo) -is:nsfw sort:popular
?q="epic comeback" game:valorant after:last-week votes:>=10
```
Docs:
- [[../decisions/adr-003-advanced-query-language|ADR 003]]
- [Query Grammar](../../docs/QUERY_GRAMMAR.md)
- [Query Examples](../../docs/QUERY_LANGUAGE_EXAMPLES.md)

Features:
- Free text: `valorant`, `"epic moment"`
- Filters: `game:`, `creator:`, `tag:`, `votes:`, `after:`
- OR: `game:a OR game:b`
- Negation: `-tag:nsfw`
- Ranges: `votes:>50`, `duration:10..30`
- Dates: `after:2025-01-01`, `after:last-week`
- Grouping: `(game:a OR game:b) tag:x`
- Sort: `sort:popular`, `sort:recent`

### Legacy Parameters (Deprecated)
Supported for compatibility; will be removed in v2.0.

## Features

### Typo Tolerance
OpenSearch fuzzy matching (edit distance 2).

### Autocomplete
```
GET /search/suggestions?q=val
```
Returns prefix matches using edge n-grams.

### Multi-Field Search
Boosting:
- `title^3`, `description^2`, `tags^2`, `broadcaster_name`, `game_name`

### Filters and Sorting
Filters: game, creator, tag, votes, duration, after/before, is
Sort: relevance, recent, popular, hot, top

## Index Mappings

### Clips
```json
{
  "mappings": {
    "properties": {
      "id": {"type": "keyword"},
      "title": {"type": "text", "analyzer": "english",
        "fields": {
          "keyword": {"type": "keyword"},
          "autocomplete": {"type": "text", "analyzer": "autocomplete"}
        }
      },
      "description": {"type": "text", "analyzer": "english"},
      "broadcaster_id": {"type": "keyword"},
      "broadcaster_name": {"type": "text"},
      "game_id": {"type": "keyword"},
      "game_name": {"type": "text"},
      "tags": {"type": "keyword"},
      "view_count": {"type": "integer"},
      "duration": {"type": "float"},
      "vote_score": {"type": "integer"},
      "created_at": {"type": "date"},
      "indexed_at": {"type": "date"}
    }
  }
}
```

### Custom Analyzer
```json
{
  "analyzer": {
    "autocomplete": {"tokenizer": "standard", "filter": ["lowercase", "autocomplete_filter"]}
  },
  "filter": {
    "autocomplete_filter": {"type": "edge_ngram", "min_gram": 2, "max_gram": 20}
  }
}
```

## PostgreSQL Fallback
```sql
SELECT * FROM clips
WHERE to_tsvector('english', title || ' ' || description)
      @@ to_tsquery('english', 'valorant')
ORDER BY ts_rank(...) DESC;
```

## Performance
Targets (p95): Search <100ms, Autocomplete <50ms, Index <10ms, Bulk(100) <200ms.

Optimizations: Redis caching, pagination, connection pooling, bulk indexing, refresh interval.

## Monitoring
- Cluster health: `/_cluster/health`
- Index stats: `/clips/_stats`
- Slow log thresholds per index
See [[../operations/monitoring|Monitoring]].

## Troubleshooting
- Reinitialize indices: `go run cmd/backfill-search/main.go`
- Force refresh: `POST /_refresh`
- Check analyzers & boosts for relevance
- Profile slow queries; shard allocation

---

Related: [[semantic-search|Semantic Search]] · [[api|API]] · [[architecture|Architecture]] · [[database|Database]] · [[../decisions/adr-003-advanced-query-language|ADR 003]]

[[../index|← Back to Index]]
