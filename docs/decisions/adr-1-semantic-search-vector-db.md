<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [ADR-001: Semantic Search Vector Database Selection](#adr-001-semantic-search-vector-database-selection)
  - [Context](#context)
    - [Requirements](#requirements)
    - [Current Architecture](#current-architecture)
  - [Decision](#decision)
    - [Architecture Overview](#architecture-overview)
  - [Alternatives Considered](#alternatives-considered)
    - [1. Managed Vector Database Services](#1-managed-vector-database-services)
    - [2. OpenSearch k-NN Plugin](#2-opensearch-k-nn-plugin)
    - [3. PostgreSQL with pgvector Extension (Selected)](#3-postgresql-with-pgvector-extension-selected)
    - [4. Redis with RediSearch + RedisAI](#4-redis-with-redisearch--redisai)
  - [Consequences](#consequences)
    - [Positive](#positive)
    - [Negative](#negative)
    - [Mitigation Strategies](#mitigation-strategies)
  - [Implementation Plan](#implementation-plan)
    - [Phase 1: Foundation (Week 1-2)](#phase-1-foundation-week-1-2)
    - [Phase 2: Embedding Generation (Week 3-4)](#phase-2-embedding-generation-week-3-4)
    - [Phase 3: Hybrid Search (Week 5-6)](#phase-3-hybrid-search-week-5-6)
    - [Phase 4: Monitoring & Optimization (Week 7-8)](#phase-4-monitoring--optimization-week-7-8)
  - [Infrastructure Requirements](#infrastructure-requirements)
    - [Current Resources](#current-resources)
    - [Additional Requirements](#additional-requirements)
    - [Storage Calculation](#storage-calculation)
    - [Performance Targets](#performance-targets)
  - [Success Criteria](#success-criteria)
  - [Review Schedule](#review-schedule)
  - [References](#references)
  - [Appendix: Cost Comparison](#appendix-cost-comparison)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "ADR-001: Semantic Search Vector Database"
summary: "Architecture decision for hybrid search with pgvector."
tags: ["decisions", "adr", "search", "architecture"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["adr-001", "vector db decision"]
---

# ADR-001: Semantic Search Vector Database Selection

**Status**: Accepted
**Date**: 2025-11-03
**Decision Makers**: Engineering Team
**Related Issues**: Semantic Search Architecture

## Context

Clipper currently implements full-text search using OpenSearch for keyword-based queries. To enhance search capabilities, we need to implement semantic search that understands the meaning and context of user queries, not just keyword matches. This requires storing and querying vector embeddings generated from clip metadata (titles, descriptions, tags, etc.).

### Requirements

1. **Semantic Search**: Find clips based on meaning/context, not just keywords
2. **Hybrid Search**: Combine traditional BM25 keyword search with vector similarity
3. **Performance**: Sub-100ms query latency for combined searches
4. **Scalability**: Handle 100K+ clips with embeddings (768 dimensions)
5. **Cost Effectiveness**: Minimize infrastructure costs
6. **Operational Simplicity**: Leverage existing infrastructure where possible

### Current Architecture

- **Database**: PostgreSQL 17
- **Search Engine**: OpenSearch 2.11.1
- **Cache**: Redis 7
- **Hosting**: VPS/Self-hosted with Docker Compose

## Decision

We will use **pgvector extension in PostgreSQL** as the vector database for semantic search, implementing a hybrid BM25 + vector re-ranking architecture.

### Architecture Overview

```
User Query
    |
    ├─> OpenSearch (BM25) ──> Top 100 candidates
    |                              |
    └─> Generate Query Embedding  |
                |                  |
                └──> PostgreSQL pgvector
                     (Re-rank by similarity)
                            |
                            v
                     Top 20 Results
```

## Alternatives Considered

### 1. Managed Vector Database Services

**Examples**: Pinecone, Weaviate Cloud, Qdrant Cloud, Milvus Cloud

**Pros**:

- Purpose-built for vector search
- Excellent performance and scalability
- Advanced features (HNSW, filtering, namespaces)
- Managed service reduces operational burden
- Automatic scaling and backups

**Cons**:

- **Additional cost**: $70-200+/month for production
- **Vendor lock-in**: Harder to migrate away
- **Network latency**: Extra hop to external service
- **Complexity**: Another service to integrate and monitor
- **Data locality**: Data lives outside primary infrastructure

**Decision**: Not selected due to cost and complexity for MVP stage.

---

### 2. OpenSearch k-NN Plugin

**Description**: Use OpenSearch's built-in k-NN vector search capabilities

**Pros**:

- Already using OpenSearch for full-text search
- No additional infrastructure
- Single query can combine BM25 + k-NN
- Native integration with existing search

**Cons**:

- **Performance concerns**: k-NN plugin is less optimized than specialized vector DBs
- **Resource intensive**: Vector indices can significantly increase memory usage
- **Limited HNSW tuning**: Less control over vector index parameters
- **Operational risk**: Increases load on search cluster
- **Scaling limitations**: May need to scale OpenSearch cluster sooner

**Decision**: Not selected due to performance concerns and operational complexity.

---

### 3. PostgreSQL with pgvector Extension (Selected)

**Description**: Add pgvector extension to existing PostgreSQL database

**Pros**:

- ✅ **Leverages existing infrastructure**: No new services to manage
- ✅ **Zero additional cost**: Just an extension
- ✅ **ACID transactions**: Strong consistency with metadata
- ✅ **Simple operations**: Managed with existing database tooling
- ✅ **Mature ecosystem**: Part of PostgreSQL, reliable and well-tested
- ✅ **Good performance**: HNSW indexing provides sub-100ms queries
- ✅ **Hybrid queries**: Can join vector search with metadata filters efficiently
- ✅ **Easy rollback**: Can remove extension if needed

**Cons**:

- **Scaling limits**: Single PostgreSQL instance has upper bounds (~1-2M vectors)
- **Mixed workload**: Vector queries compete with OLTP operations
- **Index build time**: Large HNSW indices take time to build
- **Memory usage**: Vector indices require significant RAM

**Why This Works for Clipper**:

- Current scale: <100K clips, growing slowly
- Read-heavy workload: Minimal write contention
- Hybrid approach: Candidate selection (OpenSearch) reduces vector comparisons
- Re-ranking pattern: Only comparing 100 vectors, not full corpus
- Infrastructure simplicity: Critical for small team

**Decision**: Selected as the best fit for our current scale and requirements.

---

### 4. Redis with RediSearch + RedisAI

**Description**: Use Redis modules for both full-text and vector search

**Pros**:

- Already using Redis for caching
- Fast in-memory operations
- Can replace OpenSearch entirely

**Cons**:

- **High memory cost**: All data must fit in RAM
- **Limited persistence**: Risk of data loss
- **Maturity concerns**: Less mature than PostgreSQL/OpenSearch
- **Resource constraints**: Would need significant RAM upgrade

**Decision**: Not selected due to memory cost and persistence concerns.

## Consequences

### Positive

1. **Minimal Infrastructure Changes**: Just add pgvector extension to existing PostgreSQL
2. **Cost Effective**: No additional monthly costs
3. **Operational Simplicity**: One less service to monitor and maintain
4. **Strong Consistency**: Vector embeddings always in sync with metadata
5. **Flexible Queries**: Easy to combine vector search with SQL filters
6. **Familiar Tools**: Use existing PostgreSQL expertise and tools

### Negative

1. **Scaling Ceiling**: Will need to revisit if we exceed ~500K-1M clips
2. **Resource Contention**: Vector queries may impact OLTP performance
3. **Migration Complexity**: Moving to specialized vector DB later requires migration

### Mitigation Strategies

1. **Read Replicas**: Use dedicated read replica for vector search queries
2. **Connection Pooling**: Isolate vector search connections from OLTP
3. **Monitoring**: Track query performance and resource usage closely
4. **Incremental Migration**: Can later shard vectors to separate database
5. **Hybrid Re-ranking**: Only compute 100 similarities per query, not full corpus

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

1. **Enable pgvector extension**

   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Add vector column to clips table**

   ```sql
   ALTER TABLE clips ADD COLUMN embedding vector(768);
   ```

3. **Create HNSW index**

   ```sql
   CREATE INDEX clips_embedding_idx ON clips
   USING hnsw (embedding vector_cosine_ops);
   ```

### Phase 2: Embedding Generation (Week 3-4)

1. **Select embedding model**: OpenAI text-embedding-ada-002 or open-source alternative
2. **Create embedding service**: Generate embeddings for clip metadata
3. **Backfill embeddings**: Process existing clips (batch operations)
4. **Real-time updates**: Generate embeddings on clip creation/update

### Phase 3: Hybrid Search (Week 5-6)

1. **Implement hybrid search service**:
   - Step 1: OpenSearch BM25 query → Top 100 candidates
   - Step 2: Generate query embedding
   - Step 3: pgvector similarity re-ranking → Top 20 results

2. **API endpoint**: `GET /api/v1/search/semantic`

3. **Performance tuning**: Optimize candidate count, cache query embeddings

### Phase 4: Monitoring & Optimization (Week 7-8)

1. **Metrics**: Query latency, accuracy, resource usage
2. **A/B testing**: Compare semantic vs traditional search
3. **Query optimization**: Fine-tune HNSW parameters
4. **Documentation**: Update SEARCH.md with semantic search guide

## Infrastructure Requirements

### Current Resources

- PostgreSQL: 4GB RAM, 80GB storage
- OpenSearch: 512MB heap, 10GB storage
- Redis: 256MB, 5GB storage

### Additional Requirements

| Resource | Current | Required | Delta |
|----------|---------|----------|-------|
| PostgreSQL RAM | 4GB | 6-8GB | +2-4GB |
| PostgreSQL Storage | 80GB | 100GB | +20GB |
| CPU | 2 cores | 4 cores | +2 cores |

**Estimated Additional Cost**: $10-15/month (upgrade from 2CPU/4GB to 4CPU/8GB VPS)

### Storage Calculation

- Embeddings: 100K clips × 768 dimensions × 4 bytes = 307MB
- HNSW Index: ~2-3x embedding size = 900MB
- Total vector storage: ~1.2GB
- With 10x growth: ~12GB (well within limits)

### Performance Targets

- **Candidate Selection** (OpenSearch BM25): <20ms
- **Query Embedding Generation**: <50ms (cached: <5ms)
- **Vector Re-ranking** (100 comparisons): <30ms
- **Total Query Time**: <100ms (p95)

## Success Criteria

1. ✅ pgvector extension enabled in PostgreSQL
2. ✅ Embeddings generated for all clips
3. ✅ Hybrid search API endpoint deployed
4. ✅ Query latency <100ms (p95)
5. ✅ Search relevance improved (measured by click-through rate)
6. ✅ No degradation to OLTP performance
7. ✅ Documentation updated with semantic search architecture

## Review Schedule

- **3 months**: Evaluate query performance and resource usage
- **6 months**: Assess if scale requires dedicated vector DB
- **12 months**: Review if migration to specialized service is needed

## References

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [PostgreSQL Vector Extension Documentation](https://github.com/pgvector/pgvector/blob/master/README.md)
- [Hybrid Search Best Practices](https://www.pinecone.io/learn/hybrid-search/)
- [OpenSearch BM25 Documentation](https://opensearch.org/docs/latest/query-dsl/full-text/match/)
- [HNSW Algorithm Paper](https://arxiv.org/abs/1603.09320)

## Appendix: Cost Comparison

| Solution | Setup Cost | Monthly Cost | 1-Year TCO |
|----------|-----------|--------------|------------|
| **pgvector (Selected)** | $0 | $10-15 | $120-180 |
| Pinecone | $0 | $70+ | $840+ |
| Weaviate Cloud | $0 | $95+ | $1,140+ |
| Qdrant Cloud | $0 | $90+ | $1,080+ |
| OpenSearch k-NN | $0 | $20-30 | $240-360 |

**Note**: Costs based on ~100K vectors with 768 dimensions, 1-2M queries/month.
