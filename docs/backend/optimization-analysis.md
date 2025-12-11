<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Performance Optimization Analysis](#performance-optimization-analysis)
  - [Overview](#overview)
  - [1. Database Optimization Opportunities](#1-database-optimization-opportunities)
    - [1.1 Identified N+1 Query Patterns](#11-identified-n1-query-patterns)
    - [1.2 Missing Indexes Analysis](#12-missing-indexes-analysis)
    - [1.3 Query Optimization](#13-query-optimization)
  - [2. Caching Strategy Optimization](#2-caching-strategy-optimization)
    - [2.1 Current Cache Usage Analysis](#21-current-cache-usage-analysis)
    - [2.2 Recommended Caching Strategy](#22-recommended-caching-strategy)
    - [2.3 Cache Invalidation Strategy](#23-cache-invalidation-strategy)
  - [3. Connection Pool Optimization](#3-connection-pool-optimization)
    - [3.1 Database Connection Pool](#31-database-connection-pool)
    - [3.2 Redis Connection Pool](#32-redis-connection-pool)
  - [4. Application-Level Optimizations](#4-application-level-optimizations)
    - [4.1 JSON Serialization Optimization](#41-json-serialization-optimization)
    - [4.2 Batch Operations](#42-batch-operations)
    - [4.3 Goroutine Pool](#43-goroutine-pool)
  - [5. Implementation Roadmap](#5-implementation-roadmap)
    - [Phase 1: Quick Wins (Week 1) - Expected 40-60% improvement](#phase-1-quick-wins-week-1---expected-40-60%25-improvement)
    - [Phase 2: Core Optimizations (Week 1-2) - Expected 60-80% improvement](#phase-2-core-optimizations-week-1-2---expected-60-80%25-improvement)
    - [Phase 3: Advanced Optimizations (Week 2) - Expected 80-90% improvement](#phase-3-advanced-optimizations-week-2---expected-80-90%25-improvement)
    - [Phase 4: Tuning (Week 2-3) - Expected 90-95% improvement](#phase-4-tuning-week-2-3---expected-90-95%25-improvement)
  - [6. Monitoring and Validation](#6-monitoring-and-validation)
    - [Key Metrics to Track](#key-metrics-to-track)
    - [Success Criteria](#success-criteria)
  - [7. Risk Assessment](#7-risk-assessment)
    - [Low Risk](#low-risk)
    - [Medium Risk](#medium-risk)
    - [High Risk](#high-risk)
  - [8. Rollback Plan](#8-rollback-plan)
  - [Conclusion](#conclusion)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Performance Optimization Analysis"
summary: "This document provides a comprehensive analysis of potential bottlenecks in the Clipper backend and "
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Performance Optimization Analysis

This document provides a comprehensive analysis of potential bottlenecks in the Clipper backend and actionable optimization strategies.

## Overview

Based on code review and profiling setup, we've identified several areas for optimization:

1. **Database Query Patterns** - N+1 queries, missing indexes
2. **Caching Strategy** - Opportunities for improved cache utilization
3. **Query Optimization** - Inefficient query patterns
4. **Connection Pooling** - Database and Redis connection management

---

## 1. Database Optimization Opportunities

### 1.1 Identified N+1 Query Patterns

#### Pattern 1: Comments with User Data
**Location**: Comment listing endpoints  
**Issue**: Comments are fetched, then user data is fetched individually for each comment  
**Impact**: For 50 comments, this results in 1 + 50 = 51 queries

**Current Code Pattern**:
```go
// Repository fetches comments
comments := repository.ListComments(clipID, limit, offset)
// Then for each comment, user data is fetched
for comment in comments {
    user := userRepo.GetByID(comment.UserID)
}
```

**Optimization**: Use JOINs or batch loading
```go
// Optimized: Fetch comments with user data in one query
query := `
    SELECT 
        c.*,
        u.id as user_id, u.username, u.display_name, u.avatar_url, u.karma_points
    FROM comments c
    INNER JOIN users u ON c.user_id = u.id
    WHERE c.clip_id = $1 AND c.is_removed = false
    ORDER BY c.created_at DESC
    LIMIT $2 OFFSET $3
`
```

**Expected Impact**: 50x reduction in queries, ~80% latency improvement for comment endpoints

#### Pattern 2: Clips with Vote/Favorite Status
**Location**: Feed endpoints (authenticated users)  
**Issue**: After fetching clips, separate queries check if user voted/favorited each clip  
**Impact**: For 50 clips with vote + favorite checks = 1 + 50 + 50 = 101 queries

**Optimization**: Use LEFT JOINs to fetch user interactions
```go
query := `
    SELECT 
        c.*,
        v.vote_type as user_vote,
        f.id IS NOT NULL as is_favorited
    FROM clips c
    LEFT JOIN votes v ON c.id = v.clip_id AND v.user_id = $1
    LEFT JOIN favorites f ON c.id = f.clip_id AND f.user_id = $1
    WHERE c.is_removed = false
    ORDER BY c.vote_score DESC, c.created_at DESC
    LIMIT $2 OFFSET $3
`
```

**Expected Impact**: 100x reduction in queries, ~70% latency improvement for feed endpoints

#### Pattern 3: Clips with Tag Data
**Location**: Clip detail and feed endpoints  
**Issue**: Tags are fetched separately for each clip  
**Impact**: For 50 clips = 1 + 50 = 51 queries

**Optimization**: Use array aggregation
```go
query := `
    SELECT 
        c.*,
        COALESCE(
            array_agg(
                json_build_object(
                    'id', t.id,
                    'name', t.name,
                    'slug', t.slug,
                    'color', t.color
                )
            ) FILTER (WHERE t.id IS NOT NULL),
            '{}'
        ) as tags
    FROM clips c
    LEFT JOIN clip_tags ct ON c.id = ct.clip_id
    LEFT JOIN tags t ON ct.tag_id = t.id
    WHERE c.is_removed = false
    GROUP BY c.id
    ORDER BY c.vote_score DESC, c.created_at DESC
    LIMIT $1 OFFSET $2
`
```

**Expected Impact**: 50x reduction in queries, ~60% latency improvement

### 1.2 Missing Indexes Analysis

Based on common query patterns, the following indexes should be added:

#### High Priority Indexes
```sql
-- Composite index for feed queries (most common query)
CREATE INDEX CONCURRENTLY idx_clips_not_removed_hot 
ON clips(is_removed, vote_score DESC, created_at DESC) 
WHERE is_removed = false;

-- Index for comments by clip (second most common)
CREATE INDEX CONCURRENTLY idx_comments_clip_not_removed_created 
ON comments(clip_id, is_removed, created_at DESC) 
WHERE is_removed = false;

-- Index for user vote lookups
CREATE INDEX CONCURRENTLY idx_votes_user_clip 
ON votes(user_id, clip_id);

-- Index for user favorite lookups
CREATE INDEX CONCURRENTLY idx_favorites_user_clip 
ON favorites(user_id, clip_id);
```

**Expected Impact**: 
- 40-60% reduction in query execution time
- Eliminates sequential scans on large tables
- Reduces buffer reads

#### Medium Priority Indexes
```sql
-- Game filtering with sorting
CREATE INDEX CONCURRENTLY idx_clips_game_not_removed_created 
ON clips(game_id, is_removed, created_at DESC) 
WHERE is_removed = false AND game_id IS NOT NULL;

-- Broadcaster filtering
CREATE INDEX CONCURRENTLY idx_clips_broadcaster_not_removed 
ON clips(broadcaster_id, is_removed, created_at DESC) 
WHERE is_removed = false AND broadcaster_id IS NOT NULL;

-- User comment history
CREATE INDEX CONCURRENTLY idx_comments_user_created 
ON comments(user_id, is_removed, created_at DESC);
```

**Expected Impact**:
- 30-50% improvement for filtered queries
- Better performance for user activity pages

### 1.3 Query Optimization

#### Slow Query 1: Hot Clips Calculation
**Current**: Calculates hot score on every request
```sql
SELECT *, (vote_score / POWER((EXTRACT(EPOCH FROM NOW() - created_at) / 3600) + 2, 1.5)) as hot_score
FROM clips
ORDER BY hot_score DESC;
```

**Optimization**: Use materialized view (already partially implemented)
- Refresh materialized view every 5-15 minutes
- Query the materialized view instead
- Expected improvement: 90% reduction in CPU time

#### Slow Query 2: User Karma Calculation
**Current**: Recalculates on every profile view
```sql
SELECT SUM(karma_delta) FROM reputation_events WHERE user_id = $1;
```

**Optimization**: Use cached value in users table
- Update karma_points column via triggers or scheduled job
- Expected improvement: 95% reduction in query time

---

## 2. Caching Strategy Optimization

### 2.1 Current Cache Usage Analysis

Based on code review:
- ✅ Twitch API responses (good)
- ✅ User sessions (good)
- ❌ Feed results (missing)
- ❌ Clip metadata (missing)
- ❌ Vote/favorite states (missing)
- ❌ Comment trees (missing)

### 2.2 Recommended Caching Strategy

#### High-Impact Caches

**1. Feed Results Cache**
```go
// Cache key: feed:{sort}:{page}:{filters}
// TTL: 60 seconds for hot/new, 300 seconds for top
type FeedCacheEntry struct {
    Clips []models.Clip
    Total int
    CachedAt time.Time
}
```
**Expected Impact**: 70% reduction in database load for feed endpoints

**2. Clip Metadata Cache**
```go
// Cache key: clip:{id}
// TTL: 300 seconds (5 minutes)
type ClipCacheEntry struct {
    Clip models.Clip
    Tags []models.Tag
    CachedAt time.Time
}
```
**Expected Impact**: 60% reduction in database load for clip detail endpoints

**3. User Vote/Favorite State Cache**
```go
// Cache key: user:{userID}:votes
// Cache key: user:{userID}:favorites
// TTL: Until invalidated (with publish/subscribe for invalidation)
type UserInteractionsCache struct {
    Votes map[string]int8 // clipID -> vote_type
    Favorites map[string]bool // clipID -> is_favorited
}
```
**Expected Impact**: Eliminates N+1 queries for authenticated users

**4. Comment Tree Cache**
```go
// Cache key: clip:{clipID}:comments:{page}
// TTL: 60 seconds
type CommentsCacheEntry struct {
    Comments []CommentWithUser
    Total int
    CachedAt time.Time
}
```
**Expected Impact**: 50% reduction in database load for comment endpoints

#### Medium-Impact Caches

**5. User Profile Cache**
```go
// Cache key: user:{id}
// TTL: 600 seconds (10 minutes)
```

**6. Tag List Cache**
```go
// Cache key: tags:popular
// TTL: 3600 seconds (1 hour)
```

**7. Search Results Cache**
```go
// Cache key: search:{query}:{filters}:{page}
// TTL: 300 seconds (5 minutes)
```

### 2.3 Cache Invalidation Strategy

**Time-Based Invalidation**:
- Short TTL (60s): Hot data (feed, new comments)
- Medium TTL (300s): Semi-static data (clip metadata, search)
- Long TTL (3600s): Static data (tags, categories)

**Event-Based Invalidation**:
- On clip update: Invalidate `clip:{id}` cache
- On vote: Invalidate user's vote cache and feed cache
- On comment: Invalidate clip's comment cache
- On tag change: Invalidate tag caches

**Implementation**:
```go
// Redis pub/sub for cache invalidation
redis.Publish("cache:invalidate", json.Marshal(InvalidateEvent{
    Type: "clip",
    ID: clipID,
}))
```

---

## 3. Connection Pool Optimization

### 3.1 Database Connection Pool

**Current Configuration** (from code review):
```go
// Default pgx pool settings
// MaxConns: 4 per CPU
// MinConns: 0
```

**Recommended Configuration**:
```go
config.MaxConns = 100 // For high load
config.MinConns = 25  // Keep connections ready
config.MaxConnLifetime = time.Hour
config.MaxConnIdleTime = 30 * time.Minute
config.HealthCheckPeriod = time.Minute
```

**Monitoring Metrics**:
- `acquired_conns` should be < 80% of max_conns under normal load
- `acquire_duration` should be < 10ms
- `idle_conns` should be > 0 to avoid cold starts

### 3.2 Redis Connection Pool

**Recommended Configuration**:
```go
redis.Options{
    PoolSize: 100,           // Match expected concurrency
    MinIdleConns: 10,        // Keep connections ready
    MaxRetries: 3,           // Retry failed operations
    PoolTimeout: 4 * time.Second,
    IdleTimeout: 5 * time.Minute,
}
```

---

## 4. Application-Level Optimizations

### 4.1 JSON Serialization Optimization

**Issue**: Default JSON encoding can be slow for large responses

**Optimization**:
```go
// Use jsoniter instead of encoding/json
import jsoniter "github.com/json-iterator/go"

var json = jsoniter.ConfigCompatibleWithStandardLibrary
```

**Expected Impact**: 30% improvement in JSON serialization speed

### 4.2 Batch Operations

**Issue**: Individual operations in loops

**Current**:
```go
for _, clipID := range clipIDs {
    clip := repository.GetByID(clipID)
    // process clip
}
```

**Optimized**:
```go
clips := repository.GetByIDs(clipIDs) // Batch query
for _, clip := range clips {
    // process clip
}
```

### 4.3 Goroutine Pool

**Issue**: Creating goroutines per request can be expensive

**Optimization**: Use worker pools for CPU-intensive tasks
```go
// Use a worker pool for parallel operations
type WorkerPool struct {
    workers int
    tasks   chan func()
}

func (p *WorkerPool) Submit(task func()) {
    p.tasks <- task
}
```

---

## 5. Implementation Roadmap

### Phase 1: Quick Wins (Week 1) - Expected 40-60% improvement
- [ ] Add high-priority database indexes
- [ ] Implement feed results caching
- [ ] Implement clip metadata caching
- [ ] Fix N+1 query for comments with user data

### Phase 2: Core Optimizations (Week 1-2) - Expected 60-80% improvement
- [ ] Fix N+1 query for clips with vote/favorite status
- [ ] Implement user interactions caching
- [ ] Optimize database connection pool
- [ ] Add medium-priority indexes

### Phase 3: Advanced Optimizations (Week 2) - Expected 80-90% improvement
- [ ] Fix N+1 query for clips with tags
- [ ] Implement comment tree caching
- [ ] Optimize search results caching
- [ ] Implement cache invalidation strategy

### Phase 4: Tuning (Week 2-3) - Expected 90-95% improvement
- [ ] Fine-tune cache TTLs
- [ ] Optimize Redis connection pool
- [ ] Implement JSON serialization optimization
- [ ] Add batch operations where applicable

---

## 6. Monitoring and Validation

### Key Metrics to Track

**Before Optimization**:
- [ ] Baseline p95 latency per endpoint
- [ ] Baseline throughput (req/s)
- [ ] Database query count per request
- [ ] Cache hit rate
- [ ] Resource utilization (CPU, memory, connections)

**After Each Phase**:
- [ ] New p95 latency per endpoint
- [ ] Percentage improvement
- [ ] New throughput
- [ ] Cache hit rate improvement
- [ ] Resource utilization changes

### Success Criteria

| Metric | Baseline | Target | Status |
|--------|----------|--------|--------|
| Feed p95 latency | TBD | <100ms | TBD |
| Clip detail p95 | TBD | <50ms | TBD |
| Search p95 | TBD | <100ms | TBD |
| Throughput | TBD req/s | 100+ req/s | TBD |
| Error rate | TBD% | <1% | TBD |
| Cache hit rate | TBD% | >80% | TBD |
| DB queries/request | TBD | <10 | TBD |

---

## 7. Risk Assessment

### Low Risk
- Adding indexes (use CONCURRENTLY)
- Implementing read-through caching
- Connection pool tuning

### Medium Risk
- Cache invalidation strategy (test thoroughly)
- Batch operations (ensure transaction safety)
- Query optimization (verify correctness)

### High Risk
- Materialized view refreshes (may impact write performance)
- Major query refactoring (extensive testing needed)

---

## 8. Rollback Plan

For each optimization:
1. Deploy to staging first
2. Run load tests to validate
3. Monitor metrics for 24-48 hours
4. Deploy to production with feature flags
5. Monitor and be ready to rollback

**Rollback triggers**:
- Error rate > 2%
- p95 latency > baseline
- CPU/memory > 90%
- Database connection pool exhaustion

---

## Conclusion

The identified optimizations have the potential to:
- **Reduce p95 latency by 70-90%** for most endpoints
- **Increase throughput by 3-5x**
- **Reduce database load by 80%**
- **Achieve <1% error rate**

Priority should be given to Phase 1 and Phase 2 optimizations, which will deliver the most significant improvements with the least risk.
