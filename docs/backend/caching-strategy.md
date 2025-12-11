<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Redis Caching Strategy](#redis-caching-strategy)
  - [Overview](#overview)
  - [Cache Keys](#cache-keys)
    - [Feed Caches](#feed-caches)
    - [Clip Caches](#clip-caches)
    - [Comment Caches](#comment-caches)
    - [Metadata Caches](#metadata-caches)
    - [Search Caches](#search-caches)
    - [Session Data](#session-data)
    - [Rate Limiting](#rate-limiting)
    - [Locks](#locks)
  - [TTL Values](#ttl-values)
  - [Cache Invalidation](#cache-invalidation)
    - [Smart Invalidation Rules](#smart-invalidation-rules)
    - [Pattern-Based Invalidation](#pattern-based-invalidation)
    - [Distributed Invalidation](#distributed-invalidation)
  - [Cache Warming](#cache-warming)
    - [On Deployment](#on-deployment)
    - [Background Refresh](#background-refresh)
  - [Rate Limiting](#rate-limiting-1)
    - [Sliding Window Algorithm](#sliding-window-algorithm)
    - [Per-Endpoint Limits](#per-endpoint-limits)
    - [Rate Limit Headers](#rate-limit-headers)
  - [Distributed Locking](#distributed-locking)
  - [Session Storage](#session-storage)
  - [Monitoring](#monitoring)
    - [Cache Statistics](#cache-statistics)
    - [Health Check](#health-check)
    - [Key Metrics to Monitor](#key-metrics-to-monitor)
    - [Alerts](#alerts)
  - [Manual Cache Management](#manual-cache-management)
    - [Clear Specific Cache](#clear-specific-cache)
    - [Clear All Caches](#clear-all-caches)
    - [Inspect Cache Keys](#inspect-cache-keys)
  - [Best Practices](#best-practices)
  - [Performance Impact](#performance-impact)
  - [Configuration](#configuration)
    - [Redis Configuration](#redis-configuration)
    - [Environment Variables](#environment-variables)
  - [Troubleshooting](#troubleshooting)
    - [High Memory Usage](#high-memory-usage)
    - [Low Hit Rate](#low-hit-rate)
    - [Connection Issues](#connection-issues)
    - [Stale Data](#stale-data)
  - [Future Enhancements](#future-enhancements)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Redis Caching Strategy"
summary: "This document describes the comprehensive caching strategy implemented in the Clipper backend."
tags: ['backend']
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-11
---

# Redis Caching Strategy

This document describes the comprehensive caching strategy implemented in the Clipper backend.

## Overview

The caching layer uses Redis to improve performance by reducing database load and speeding up response times. The implementation includes:

- Feed caching (hot, top, new, game-specific, creator feeds)
- Clip data caching (details, vote counts, comment counts)
- Comment caching (trees and individual comments)
- Metadata caching (games, users, tags)
- Search result caching
- Session storage
- Distributed locking
- Smart cache invalidation

## Cache Keys

All cache keys follow a consistent naming convention:

### Feed Caches

- `feed:hot:page:{page}` - Hot/trending clips feed
- `feed:top:{timeframe}:page:{page}` - Top clips by timeframe (24h, 7d, 30d, all)
- `feed:new:page:{page}` - Recently uploaded clips
- `feed:game:{gameId}:{sort}:page:{page}` - Game-specific feeds
- `feed:creator:{creatorId}:{sort}:page:{page}` - Creator-specific feeds

### Clip Caches

- `clip:{clipId}` - Full clip details
- `clip:{clipId}:votes` - Vote count/score
- `clip:{clipId}:comment_count` - Number of comments

### Comment Caches

- `comments:clip:{clipId}:{sort}` - Comment tree for a clip
- `comment:{commentId}` - Individual comment details

### Metadata Caches

- `game:{gameId}` - Game information
- `user:{userId}` - User profile data
- `tags:all` - List of all tags

### Search Caches

- `search:{query}:{filters}:page:{page}` - Search results
- `search:suggestions:{query}` - Autocomplete suggestions

### Session Data

- `session:{sessionId}` - User session data
- `refresh_token:{tokenId}` - Refresh token data

### Rate Limiting

- `ratelimit:{endpoint}:{identifier}` - Rate limit counters

### Locks

- `lock:{resource}` - Distributed lock for a resource

## TTL Values

Different cache types have different Time-To-Live (TTL) values based on their update frequency:

| Cache Type | TTL | Rationale |
|------------|-----|-----------|
| Hot Feed | 5 minutes | Changes frequently with votes/views |
| Top Feed | 15 minutes | Less volatile, historical data |
| New Feed | 2 minutes | Must reflect recent uploads quickly |
| Game/Creator Feed | 10 minutes | Moderate update frequency |
| Clip Details | 1 hour | Metadata rarely changes |
| Clip Votes | 5 minutes | Updates with voting activity |
| Comment Count | 10 minutes | Updates with new comments |
| Comment Tree | 10 minutes | Updates with new comments |
| Individual Comment | 15 minutes | Rarely edited after creation |
| Game Metadata | 24 hours | Rarely changes |
| User Profile | 1 hour | Moderate update frequency |
| Tags | 1 hour | Infrequent changes |
| Search Results | 5 minutes | Content changes frequently |
| Search Suggestions | 1 hour | Relatively stable |
| Sessions | 7 days | Matches refresh token expiry |

## Cache Invalidation

### Smart Invalidation Rules

The system automatically invalidates related caches when data changes:

#### On New Clip

- Clear hot feed (`feed:hot:*`)
- Clear new feed (`feed:new:*`)
- Clear game feed (`feed:game:{gameId}:*`)
- Clear creator feed (`feed:creator:{creatorId}:*`)

#### On Vote

- Clear hot feed (`feed:hot:*`)
- Clear top feed (`feed:top:*`)
- Clear clip votes (`clip:{clipId}:votes`)
- Clear clip details (`clip:{clipId}`)

#### On New Comment

- Clear comment tree (`comments:clip:{clipId}:*`)
- Clear comment count (`clip:{clipId}:comment_count`)

#### On Clip Update

- Clear clip details (`clip:{clipId}`)

#### On User Update

- Clear user profile (`user:{userId}`)

### Pattern-Based Invalidation

Use pattern-based deletion to clear multiple related keys:

```go
// Clear all hot feed pages
cacheService.InvalidateFeedHot(ctx)

// Clear all feeds for a specific game
cacheService.InvalidateFeedGame(ctx, gameID)

// Clear all comment-related caches for a clip
cacheService.InvalidateCommentTree(ctx, clipID)
```

### Distributed Invalidation

For multi-instance deployments, use Redis pub/sub to broadcast invalidation events:

```go
// Publish invalidation event
cacheService.PublishInvalidation(ctx, "clip_voted", clipID)

// Subscribe to invalidation events
pubsub := redis.Subscribe(ctx, "cache:invalidation")
```

## Cache Warming

### On Deployment

Pre-populate critical caches to avoid cold-start performance issues:

```go
warmingService := services.NewCacheWarmingService(cacheService, clipRepo)
warmingService.WarmCriticalCaches(ctx)
```

This warms:

- Hot feed (first 3 pages)
- New feed (first 2 pages)
- Top feeds for all timeframes (first page)

### Background Refresh

A background job refreshes popular pages before they expire:

```go
// Runs every 30 minutes
go warmingService.StartBackgroundWarming(ctx, 30*time.Minute)
```

## Rate Limiting

### Sliding Window Algorithm

The rate limiting middleware uses a sliding window algorithm for accurate rate limiting:

```go
// Allow 100 requests per minute
middleware.RateLimitMiddleware(redis, 100, time.Minute)
```

### Per-Endpoint Limits

Different endpoints have different rate limits:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/clips` | 100 | 1 minute |
| `/api/clips/:id/vote` | 10 | 1 minute |
| `/api/comments` | 20 | 1 minute |
| `/api/search` | 50 | 1 minute |
| `/api/auth/twitch` | 5 | 1 minute |
| `/api/clips/request` | 5 | 1 hour |

### Rate Limit Headers

Responses include standard rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1672531200
Retry-After: 30
```

## Distributed Locking

Use distributed locks to prevent race conditions:

```go
// Acquire lock
locked, err := cacheService.AcquireLock(ctx, "clip_import_123", workerID)
if !locked {
    // Another worker is processing this
    return
}
defer cacheService.ReleaseLock(ctx, "clip_import_123")

// Perform operation
// ...
```

Common use cases:

- Preventing duplicate clip imports
- Serializing vote counting
- Coordinating cache updates across instances

## Session Storage

Store user sessions in Redis for fast access and automatic expiry:

```go
// Store session
session := map[string]interface{}{
    "user_id": userID,
    "role": "user",
    "login_time": time.Now(),
}
cacheService.SetSession(ctx, sessionID, session)

// Retrieve session
session, err := cacheService.GetSession(ctx, sessionID)

// Delete session on logout
cacheService.DeleteSession(ctx, sessionID)
```

## Monitoring

### Cache Statistics

Get cache performance metrics:

```
GET /health/cache
```

Returns:

```json
{
  "status": "healthy",
  "cache": {
    "hit_rate": 85.6,
    "keyspace_hits": "1234567",
    "keyspace_misses": "234567",
    "used_memory": "104857600",
    "used_memory_human": "100.00M",
    "connected_clients": "10",
    "evicted_keys": "123"
  }
}
```

### Health Check

Quick cache health check:

```
GET /health/cache/check
```

### Key Metrics to Monitor

- **Hit Rate**: Should be > 80% for optimal performance
- **Memory Usage**: Should stay below 80% of max memory
- **Eviction Rate**: High eviction rate indicates cache is too small
- **Connection Count**: Monitor for connection pool exhaustion

### Alerts

Set up alerts for:

- Hit rate < 70%
- Memory usage > 80%
- Connection failures
- High eviction rate (> 100/sec)

## Manual Cache Management

### Clear Specific Cache

```bash
# Using Redis CLI
redis-cli DEL "feed:hot:page:1"

# Clear pattern
redis-cli --scan --pattern "feed:hot:*" | xargs redis-cli DEL
```

### Clear All Caches

```bash
# Clear all application caches (careful!)
redis-cli FLUSHDB
```

### Inspect Cache Keys

```bash
# List all feed keys
redis-cli --scan --pattern "feed:*"

# Get value
redis-cli GET "clip:123e4567-e89b-12d3-a456-426614174000"

# Check TTL
redis-cli TTL "feed:hot:page:1"
```

## Best Practices

1. **Always set TTL**: Never store data without expiration
2. **Use pattern-based keys**: Makes invalidation easier
3. **Fail open on Redis errors**: Don't let cache failures break the app
4. **Monitor hit rate**: Low hit rate indicates caching strategy issues
5. **Test invalidation logic**: Stale cache is worse than no cache
6. **Use distributed locks**: Prevent race conditions in distributed systems
7. **Warm critical caches**: Pre-populate on deployment
8. **Set memory limits**: Configure max memory and eviction policy
9. **Use pub/sub for invalidation**: Keep multi-instance caches in sync
10. **Add cache headers**: Help clients understand caching behavior

## Performance Impact

Expected performance improvements:

- **Database Load**: Reduced by > 70%
- **Response Time**: Improved by 60-80% for cached endpoints
- **Cache Hit Rate**: Target > 80%
- **Throughput**: Increased by 3-5x with caching enabled

## Configuration

### Redis Configuration

In `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Environment Variables

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Troubleshooting

### High Memory Usage

1. Check key distribution: `redis-cli --bigkeys`
2. Reduce TTLs for large objects
3. Increase max memory or add more Redis instances
4. Enable compression for large values

### Low Hit Rate

1. Check TTLs - may be too short
2. Verify cache warming is working
3. Check invalidation logic - may be too aggressive
4. Monitor cache size - may need more memory

### Connection Issues

1. Check connection pool settings
2. Monitor connection count
3. Increase pool size if needed
4. Check for connection leaks

### Stale Data

1. Verify invalidation logic is being called
2. Check TTLs are appropriate
3. Use pub/sub for distributed invalidation
4. Add manual cache clearing to admin tools

## Future Enhancements

- **Leaderboards**: Use Redis sorted sets for real-time leaderboards
- **Bloom Filters**: Efficient existence checking
- **Cache Versioning**: Invalidate all caches on deploy
- **Compression**: Compress large cached objects
- **Cache Tiers**: Hot/warm/cold cache layers
- **Analytics**: Detailed cache analytics dashboard
