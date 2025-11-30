# Semantic Search

Hybrid BM25 + vector similarity search using pgvector for semantic understanding of queries.

## Overview

Semantic search enhances keyword-based BM25 search with vector embeddings to understand query intent and context.

Architecture:
- OpenSearch: BM25 full-text search for initial candidate selection
- pgvector: PostgreSQL extension for vector similarity search
- Embedding Service: Generates 768-dimensional vectors from text
- Hybrid Search Service: Orchestrates BM25 + vector re-ranking

## Architecture Decision
See [[../decisions/adr-001-semantic-search-vector-db|ADR-001: Semantic Search Vector Database]] for rationale.

Selected: pgvector in PostgreSQL with hybrid BM25 + vector re-ranking.

## System Architecture
```text
Client → API (Gin) → Search Handler / Embedding Service / Clip Handler
                  → Hybrid Search Service (BM25 + Vector)
                  → OpenSearch (BM25) + PostgreSQL+pgvector (Embeddings)
```

## Indexing Flow
1. User submits/updates clip
2. Validate input
3. Save metadata to PostgreSQL
4. Index clip in OpenSearch (BM25)
5. Generate embedding (async)
   - Combine: title, description, game, broadcaster, tags
   - Model: `text-embedding-ada-002` or self-hosted alternative
   - Output: 768-dim vector
6. Store vector in `clips.embedding`
7. PostgreSQL updates HNSW index

Backfill missing embeddings:
```bash
cd backend
go run cmd/backfill-embeddings/main.go -batch 50
```

## Search Flow
```text
1. Generate query embedding (768-dim)
2. BM25 in OpenSearch → top 100
3. Vector similarity in pgvector → top 100
4. Merge + dedupe by clip ID
5. Score = (0.6 × BM25) + (0.4 × Vector)
6. Re-rank → apply filters → return top N (20)
```
Weights are configurable.

## Database Schema
Embedding column:
```sql
ALTER TABLE clips ADD COLUMN embedding vector(768);
```
HNSW index:
```sql
CREATE INDEX idx_clips_embedding_hnsw
ON clips USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```
Query example:
```sql
SELECT id, title, 1 - (embedding <=> $1) AS similarity
FROM clips
WHERE embedding IS NOT NULL
ORDER BY embedding <=> $1
LIMIT 100;
```

## Embedding Service
Models:
- OpenAI `text-embedding-ada-002` (1536 dims → truncated to 768)
- Hugging Face: `sentence-transformers/all-MiniLM-L6-v2` (384), `instructor-base` (768)

Config:
```bash
EMBEDDING_PROVIDER=openai   # or huggingface
OPENAI_API_KEY=sk-...
HF_API_TOKEN=hf-...
HF_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

## Performance
Targets (p95):
- Embedding generation <200ms
- Vector search (100 results) <50ms
- Hybrid search <150ms
- Batch embedding (50 clips) <5s

Optimizations:
- HNSW approximate nearest neighbor
- Cache query embeddings (5 min TTL)
- Batch generation APIs
- Parallel BM25 + vector search
- Limit TopK to 100 before re-ranking

## Configuration
Hybrid search config:
```go
// config/search.go
type HybridSearchConfig struct {
  BM25Weight   float64  // 0.6
  VectorWeight float64  // 0.4
  TopK         int      // 100
}
```
pgvector query setting:
```sql
SET hnsw.ef_search = 40;  -- Range: 10-200
```

## Monitoring
Coverage of embeddings:
```sql
SELECT COUNT(*) FILTER (WHERE embedding IS NOT NULL)::float / COUNT(*) * 100 AS coverage_pct
FROM clips;
```
Index stats:
```sql
SELECT pg_size_pretty(pg_relation_size(indexrelid)) AS size, idx_scan
FROM pg_stat_user_indexes WHERE indexname = 'idx_clips_embedding_hnsw';
```

## Troubleshooting
- Missing embeddings → run backfill tool
- Poor results → adjust weights, check model quality, increase `ef_search`
- Slow search → reduce TopK, tune HNSW params, rebuild index if needed

---

Related: [[search|Search Platform]] · [[database|Database]] · [[api|API Reference]] · [[../operations/monitoring|Monitoring]]

[[../index|← Back to Index]]
