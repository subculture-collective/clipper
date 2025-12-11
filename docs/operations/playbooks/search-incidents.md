<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Search Incidents Playbook](#search-incidents-playbook)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
    - [Architecture](#architecture)
    - [Key Metrics](#key-metrics)
  - [Quick Reference](#quick-reference)
    - [Dashboard Links](#dashboard-links)
    - [Log Queries](#log-queries)
    - [Quick Health Checks](#quick-health-checks)
  - [High Latency](#high-latency)
    - [Symptoms](#symptoms)
    - [Investigation Steps](#investigation-steps)
    - [Mitigation](#mitigation)
    - [Resolution Criteria](#resolution-criteria)
  - [Critical Latency](#critical-latency)
    - [Symptoms](#symptoms-1)
    - [Immediate Actions](#immediate-actions)
    - [Investigation](#investigation)
    - [Escalation](#escalation)
  - [Embedding Failures](#embedding-failures)
    - [Symptoms](#symptoms-2)
    - [Investigation Steps](#investigation-steps-1)
    - [Common Causes & Fixes](#common-causes--fixes)
    - [Mitigation](#mitigation-1)
    - [Resolution Criteria](#resolution-criteria-1)
  - [Low Coverage](#low-coverage)
    - [Symptoms](#symptoms-3)
    - [Investigation Steps](#investigation-steps-2)
    - [Mitigation](#mitigation-2)
    - [Resolution Criteria](#resolution-criteria-2)
  - [Cache Issues](#cache-issues)
    - [Symptoms](#symptoms-4)
    - [Investigation Steps](#investigation-steps-3)
    - [Common Causes & Fixes](#common-causes--fixes-1)
    - [Mitigation](#mitigation-3)
    - [Resolution Criteria](#resolution-criteria-3)
  - [Zero Results](#zero-results)
    - [Symptoms](#symptoms-5)
    - [Investigation Steps](#investigation-steps-4)
    - [Common Causes & Fixes](#common-causes--fixes-2)
    - [Mitigation](#mitigation-4)
    - [Resolution Criteria](#resolution-criteria-4)
  - [Fallback Issues](#fallback-issues)
    - [Symptoms](#symptoms-6)
    - [Investigation Steps](#investigation-steps-5)
    - [Resolution](#resolution)
  - [Indexing Failures](#indexing-failures)
    - [Symptoms](#symptoms-7)
    - [Investigation Steps](#investigation-steps-6)
    - [Common Causes & Fixes](#common-causes--fixes-3)
    - [Resolution Criteria](#resolution-criteria-5)
  - [Vector Search Slow](#vector-search-slow)
    - [Symptoms](#symptoms-8)
    - [Investigation Steps](#investigation-steps-7)
    - [Mitigation](#mitigation-5)
  - [BM25 Search Slow](#bm25-search-slow)
    - [Symptoms](#symptoms-9)
    - [Investigation Steps](#investigation-steps-8)
    - [Mitigation](#mitigation-6)
  - [Escalation](#escalation-1)
    - [When to Escalate](#when-to-escalate)
    - [Escalation Contacts](#escalation-contacts)
  - [Post-Incident](#post-incident)
    - [Checklist](#checklist)
    - [Post-Mortem Template](#post-mortem-template)
  - [References](#references)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Search Incidents Playbook"
summary: "On-call playbook for semantic search incidents including embedding, indexing, and latency issues."
tags: ["operations", "on-call", "search", "semantic", "playbook"]
area: "operations"
status: "stable"
owner: "team-search"
version: "1.0"
last_reviewed: 2025-12-06
aliases: ["search-runbook", "semantic-search-playbook"]
---

# Search Incidents Playbook

This playbook provides step-by-step guidance for on-call engineers responding to semantic search incidents.

## Table of Contents

- [Overview](#overview)
- [Quick Reference](#quick-reference)
- [High Latency](#high-latency)
- [Critical Latency](#critical-latency)
- [Embedding Failures](#embedding-failures)
- [Low Coverage](#low-coverage)
- [Cache Issues](#cache-issues)
- [Zero Results](#zero-results)
- [Fallback Issues](#fallback-issues)
- [Indexing Failures](#indexing-failures)
- [Vector Search Slow](#vector-search-slow)
- [BM25 Search Slow](#bm25-search-slow)
- [Escalation](#escalation)
- [Post-Incident](#post-incident)

## Overview

Clipper's semantic search uses a hybrid approach combining:

1. **BM25 Search** (OpenSearch): Candidate selection based on keyword relevance
2. **Vector Similarity** (pgvector): Re-ranking using semantic embeddings
3. **Embedding Service**: Generates vector embeddings via OpenAI API

### Architecture

```
User Query → Search Handler → BM25 (OpenSearch) → Candidate IDs
                  ↓
           Query Embedding → Cache Check → OpenAI API (if miss)
                  ↓
           Vector Re-ranking (pgvector) → Final Results
```

### Key Metrics

| Metric | SLO Target | Alert Threshold |
|--------|------------|-----------------|
| Search P95 Latency | < 200ms | > 200ms (warn), > 500ms (critical) |
| Embedding Coverage | > 95% | < 90% |
| Cache Hit Rate | > 80% | < 50% |
| Zero Result Rate | < 5% | > 10% |
| Error Rate | < 0.1% | > 1% |

## Quick Reference

### Dashboard Links

- [Semantic Search Observability](http://grafana:3000/d/semantic-search)
- [Search Quality Metrics](http://grafana:3000/d/search-quality)
- [Application Overview](http://grafana:3000/d/app-overview)

### Log Queries

```bash
# Search errors (last 15 minutes)
docker-compose logs backend --since 15m | grep -i "search\|embedding" | grep -i error

# Embedding service logs
docker-compose logs backend --since 15m | grep "embedding"

# OpenSearch connection issues
docker-compose logs backend --since 15m | grep "opensearch"
```

### Quick Health Checks

```bash
# API health
curl -s http://localhost:8080/health/ready | jq

# Test search endpoint
curl -s "http://localhost:8080/api/v1/search?q=test" | jq '.meta'

# Check OpenSearch
curl -s "http://opensearch:9200/_cluster/health" | jq
```

---

## High Latency

**Alert**: `SemanticSearchHighLatency`
**Severity**: Warning
**Condition**: P95 latency > 200ms for 5 minutes

### Symptoms

- Users experience slow search results
- Search P95 latency exceeds 200ms
- May see timeout errors in logs

### Investigation Steps

1. **Check component breakdown**:
   ```bash
   # View component latencies in Grafana
   # Dashboard: Semantic Search Observability → Search Component Latency
   ```

2. **Identify bottleneck**:
   - **BM25 slow** (> 50ms): See [BM25 Search Slow](#bm25-search-slow)
   - **Vector search slow** (> 100ms): See [Vector Search Slow](#vector-search-slow)
   - **Embedding slow** (> 100ms): See [Embedding Failures](#embedding-failures)

3. **Check resource usage**:
   ```bash
   docker stats
   # Look for high CPU/memory on backend, postgres, opensearch
   ```

4. **Check connection pools**:
   ```bash
   curl -s http://localhost:8080/health/stats | jq '.database'
   ```

### Mitigation

1. **Short-term**: Increase candidate limit to reduce vector comparisons:
   ```bash
   # Edit config (reduces precision but improves latency)
   # SEARCH_CANDIDATE_LIMIT=100 → 50
   ```

2. **If database issue**: Restart connection pool:
   ```bash
   docker-compose restart backend
   ```

3. **If OpenSearch issue**:
   ```bash
   # Check cluster health
   curl http://opensearch:9200/_cluster/health?pretty
   
   # If yellow/red, check nodes
   curl http://opensearch:9200/_cat/nodes?v
   ```

### Resolution Criteria

- P95 latency < 200ms for 15 minutes
- No error spikes in logs

---

## Critical Latency

**Alert**: `SemanticSearchCriticalLatency`
**Severity**: Critical
**Condition**: P95 latency > 500ms for 3 minutes

### Symptoms

- Search extremely slow or timing out
- Users cannot use search effectively
- May see cascade failures

### Immediate Actions

1. **Consider disabling semantic search** (fallback to BM25 only):
   ```bash
   # Set environment variable and restart
   EMBEDDING_ENABLED=false
   docker-compose restart backend
   ```

2. **Page secondary on-call** if not resolved in 5 minutes

3. **Check for cascading failures**:
   ```bash
   # Check error rates on other endpoints
   curl -s http://localhost:8080/debug/metrics | grep http_requests_total
   ```

### Investigation

Same as [High Latency](#high-latency), but prioritize:

1. **OpenSearch cluster status**
2. **Database connection exhaustion**
3. **OpenAI API rate limiting**

### Escalation

If not resolved in 15 minutes:
- Page database admin (if DB-related)
- Page infrastructure team (if resource-related)
- Contact OpenAI support (if API-related)

---

## Embedding Failures

**Alert**: `EmbeddingGenerationFailing`
**Severity**: Critical
**Condition**: Error rate > 0.1/sec for 5 minutes

### Symptoms

- Search falls back to BM25-only
- New clips don't get embeddings
- `embedding_generation_errors_total` increasing

### Investigation Steps

1. **Check error logs**:
   ```bash
   docker-compose logs backend --since 15m | grep "embedding" | grep -i "error\|failed"
   ```

2. **Check OpenAI API status**:
   - Visit [status.openai.com](https://status.openai.com)
   - Check rate limit errors in logs

3. **Verify API key**:
   ```bash
   # Check if key is set (don't print the actual key)
   docker-compose exec backend env | grep OPENAI_API_KEY | wc -l
   ```

4. **Test embedding generation**:
   ```bash
   # This will generate a query embedding
   curl -s "http://localhost:8080/api/v1/search/scores?q=test" | jq '.scores'
   ```

### Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| OpenAI rate limit | Wait and retry; reduce `EMBEDDING_REQUESTS_PER_MINUTE` |
| Invalid API key | Regenerate key in OpenAI dashboard, update secret |
| Network issue | Check firewall rules, DNS resolution |
| OpenAI outage | Wait for resolution; fallback is automatic |

### Mitigation

1. **Increase retry delay**:
   ```bash
   # Temporary: reduce requests per minute
   EMBEDDING_REQUESTS_PER_MINUTE=100
   docker-compose restart backend
   ```

2. **System falls back automatically** to BM25-only search

### Resolution Criteria

- Error rate < 0.01/sec for 10 minutes
- Embedding cache hit rate recovering

---

## Low Coverage

**Alert**: `LowEmbeddingCoverage`
**Severity**: Warning
**Condition**: > 10% clips missing embeddings for 30 minutes

### Symptoms

- Some clips not appearing in semantic search
- `clips_without_embeddings` gauge high
- Indexing jobs may be failing

### Investigation Steps

1. **Check indexing job status**:
   ```bash
   docker-compose logs backend --since 1h | grep "embedding generation"
   ```

2. **Check for backlog**:
   ```sql
   -- Run in database
   SELECT COUNT(*) as without_embeddings 
   FROM clips 
   WHERE embedding IS NULL 
     AND is_removed = false 
     AND created_at > NOW() - INTERVAL '7 days';
   ```

3. **Check scheduler status**:
   ```bash
   docker-compose logs backend | grep "embedding scheduler"
   ```

### Mitigation

1. **Trigger manual backfill**:
   ```bash
   # Run backfill command
   docker-compose exec backend ./bin/backfill-embeddings --batch-size=50 --limit=1000
   ```

2. **Increase scheduler frequency** (temporarily):
   ```bash
   EMBEDDING_SCHEDULER_INTERVAL_MINUTES=5
   docker-compose restart backend
   ```

### Resolution Criteria

- Coverage > 95%
- Indexing jobs completing successfully

---

## Cache Issues

**Alert**: `EmbeddingCacheLowHitRate`
**Severity**: Warning
**Condition**: Cache hit rate < 50% for 15 minutes

### Symptoms

- Higher than normal API costs
- Increased embedding latency
- `embedding_cache_misses_total` high

### Investigation Steps

1. **Check Redis health**:
   ```bash
   curl -s http://localhost:8080/health/cache | jq
   ```

2. **Check Redis memory**:
   ```bash
   docker-compose exec redis redis-cli INFO memory | grep used_memory_human
   ```

3. **Check eviction rate**:
   ```bash
   docker-compose exec redis redis-cli INFO stats | grep evicted_keys
   ```

### Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Redis memory full | Increase `maxmemory` or scale Redis |
| High eviction rate | Extend TTL or increase memory |
| New query patterns | Normal; cache will warm up |
| Redis restart | Cache will warm up automatically |

### Mitigation

1. **Increase Redis memory** (if evictions high):
   ```bash
   # In redis.conf or docker-compose
   maxmemory 512mb
   ```

2. **Check and adjust TTL** if needed:
   - Embedding cache TTL: 30 days (default)
   - Query cache TTL: 1 hour (default)

### Resolution Criteria

- Cache hit rate > 60% for 30 minutes
- No Redis errors in logs

---

## Zero Results

**Alert**: `HighZeroResultRate`
**Severity**: Warning
**Condition**: > 10% searches return no results for 10 minutes

### Symptoms

- Users seeing "No results found" frequently
- `search_zero_results_total` increasing

### Investigation Steps

1. **Check OpenSearch index**:
   ```bash
   curl -s "http://opensearch:9200/clips/_count" | jq
   ```

2. **Test basic search**:
   ```bash
   curl -s "http://localhost:8080/api/v1/search?q=game" | jq '.counts'
   ```

3. **Check recent queries** (if logging enabled):
   ```bash
   docker-compose logs backend --since 15m | grep "search query"
   ```

### Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| Index empty/corrupted | Reindex from database |
| Index not refreshed | Check indexer scheduler |
| Query parsing issue | Check for special characters |
| Filter too restrictive | Review filter parameters |

### Mitigation

1. **Trigger index refresh**:
   ```bash
   curl -X POST "http://opensearch:9200/clips/_refresh"
   ```

2. **Check index alias**:
   ```bash
   curl -s "http://opensearch:9200/_cat/aliases?v" | grep clips
   ```

### Resolution Criteria

- Zero result rate < 5% for 15 minutes
- Index count matches expected clips count

---

## Fallback Issues

**Alert**: `SearchFallbackActivated`
**Severity**: Warning
**Condition**: Fallback rate > 0.5/sec for 5 minutes

### Symptoms

- Search quality degraded (no semantic ranking)
- `search_fallback_total` increasing
- Fallback reason in logs

### Investigation Steps

1. **Identify fallback reason** (check labels):
   - `embedding_error`: See [Embedding Failures](#embedding-failures)
   - `vector_search_error`: See [Vector Search Slow](#vector-search-slow)
   - `opensearch_error`: Check OpenSearch health

2. **Check Grafana dashboard**: Fallback Analysis panel

### Resolution

Address the root cause based on fallback reason.

---

## Indexing Failures

**Alert**: `IndexingJobFailing`
**Severity**: Critical
**Condition**: > 3 indexing jobs failed in 1 hour

### Symptoms

- New clips not searchable
- `indexing_jobs_total{status="failed"}` increasing

### Investigation Steps

1. **Check indexing logs**:
   ```bash
   docker-compose logs backend --since 1h | grep -A5 "indexing job"
   ```

2. **Check OpenSearch**:
   ```bash
   curl -s "http://opensearch:9200/_cluster/health" | jq
   ```

3. **Check embedding service** (indexing includes embedding):
   See [Embedding Failures](#embedding-failures)

### Common Causes & Fixes

| Cause | Fix |
|-------|-----|
| OpenSearch unavailable | Restart OpenSearch, check resources |
| Embedding API errors | Check OpenAI status and key |
| Database errors | Check PostgreSQL health |
| Out of memory | Reduce batch size |

### Resolution Criteria

- Indexing jobs completing successfully
- New clips appearing in search within 15 minutes

---

## Vector Search Slow

**Alert**: `VectorSearchSlow`
**Severity**: Warning
**Condition**: P95 > 100ms for 5 minutes

### Symptoms

- Vector re-ranking taking too long
- High `vector_search_duration_ms`

### Investigation Steps

1. **Check PostgreSQL load**:
   ```bash
   curl -s http://localhost:8080/health/stats | jq '.database'
   ```

2. **Check HNSW index**:
   ```sql
   -- Check index exists and is used
   EXPLAIN ANALYZE
   SELECT id FROM clips 
   WHERE embedding IS NOT NULL 
   ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector(768)
   LIMIT 20;
   ```

3. **Check candidate count**:
   - More candidates = slower re-ranking
   - Default: 100 candidates

### Mitigation

1. **Reduce candidate count** (trades precision for speed):
   ```bash
   SEARCH_CANDIDATE_LIMIT=50
   ```

2. **Optimize HNSW parameters**:
   ```sql
   -- Lower ef_search for faster queries (default: 40)
   SET hnsw.ef_search = 20;
   ```

---

## BM25 Search Slow

**Alert**: `BM25SearchSlow`
**Severity**: Warning
**Condition**: P95 > 50ms for 5 minutes

### Symptoms

- Candidate selection slow
- High `bm25_search_duration_ms`

### Investigation Steps

1. **Check OpenSearch cluster**:
   ```bash
   curl -s "http://opensearch:9200/_cluster/health" | jq
   curl -s "http://opensearch:9200/_cat/nodes?v"
   ```

2. **Check index size**:
   ```bash
   curl -s "http://opensearch:9200/_cat/indices?v" | grep clips
   ```

3. **Check slow queries**:
   ```bash
   curl -s "http://opensearch:9200/clips/_search?q=*:*&size=0" | jq '.took'
   ```

### Mitigation

1. **Force index refresh**:
   ```bash
   curl -X POST "http://opensearch:9200/clips/_refresh"
   ```

2. **Check and optimize mappings** if index bloated

---

## Escalation

### When to Escalate

| Scenario | Escalate To | Timeline |
|----------|------------|----------|
| P95 > 500ms for 15+ min | Team Lead | Immediate |
| Total search outage | Team Lead + Infra | Immediate |
| OpenAI API issues | Team Lead | 30 minutes |
| Database issues | DBA on-call | 15 minutes |
| Data corruption | Team Lead + DBA | Immediate |

### Escalation Contacts

| Role | Primary | Backup |
|------|---------|--------|
| Search Team Lead | TBD | TBD |
| DBA On-call | TBD | TBD |
| Infrastructure | TBD | TBD |

---

## Post-Incident

### Checklist

- [ ] Alert resolved and acknowledged
- [ ] Root cause identified
- [ ] Temporary mitigations documented
- [ ] Metrics returned to normal
- [ ] Incident ticket created
- [ ] Post-mortem scheduled (if P0/P1)

### Post-Mortem Template

For significant incidents (P0/P1), create a post-mortem including:

1. **Summary**: What happened?
2. **Timeline**: When did it start/end?
3. **Impact**: Users affected, duration
4. **Root Cause**: Why did it happen?
5. **Resolution**: How was it fixed?
6. **Prevention**: How do we prevent recurrence?
7. **Action Items**: Specific tasks with owners

---

## References

- [Semantic Search Architecture](../SEMANTIC_SEARCH_ARCHITECTURE.md)
- [Observability Configuration](../OBSERVABILITY.md)
- [Deployment Runbook](../RUNBOOK.md)
- [Index Versioning](../INDEX_VERSIONING.md)

---

[[../index|← Back to Operations Index]]
