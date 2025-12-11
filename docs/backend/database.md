<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Database](#database)
  - [Quick Links](#quick-links)
  - [Connection](#connection)
  - [Core Tables](#core-tables)
    - [users](#users)
    - [clips](#clips)
    - [comments](#comments)
    - [votes](#votes)
    - [favorites](#favorites)
    - [tags](#tags)
    - [clip_tags](#clip_tags)
    - [subscriptions](#subscriptions)
  - [Database Functions](#database-functions)
    - [update_hot_score()](#update_hot_score)
    - [update_updated_at()](#update_updated_at)
  - [Migrations](#migrations)
  - [Maintenance](#maintenance)
    - [Vacuum & Analyze](#vacuum--analyze)
    - [Reindex](#reindex)
    - [Monitor Queries](#monitor-queries)
    - [Database Size](#database-size)
    - [Index Usage](#index-usage)
  - [Query Optimization](#query-optimization)
    - [Using EXPLAIN](#using-explain)
    - [Common Optimizations](#common-optimizations)
  - [Backup & Recovery](#backup--recovery)
    - [Automated Backups](#automated-backups)
    - [Recovery Objectives](#recovery-objectives)
  - [Performance Targets](#performance-targets)
  - [Related Documentation](#related-documentation)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

---
title: "Database"
summary: "PostgreSQL 17 database schema, migrations, queries, and maintenance procedures."
tags: ["backend", "database", "postgresql", "schema"]
area: "backend"
status: "stable"
owner: "team-core"
version: "1.0"
last_reviewed: 2025-12-01
aliases: ["db", "postgresql", "schema"]
---

# Database

PostgreSQL 17 database with comprehensive schema, migrations, and maintenance procedures.

## Quick Links

- Schema: See [DATABASE-SCHEMA.md](../../docs/DATABASE-SCHEMA.md) (legacy location)
- Migrations: [[../operations/migration|Migration Guide]]
- Backups: [[../operations/infra|Infrastructure]]

## Connection

**Development**:
```
postgresql://clipper:clipper_password@localhost:5436/clipper_db?sslmode=disable
```

**Production**:
```
postgresql://<user>:<pass>@<host>:5432/<db>?sslmode=require
```

## Core Tables

### users
User accounts and profiles.

**Key Columns**:
- `id` (UUID, PK): User identifier
- `twitch_id` (text, unique): Twitch user ID
- `username` (text, unique): Username
- `email` (text, unique): Email address
- `karma` (int): Reputation score
- `role` (text): User role (user, moderator, admin)
- `created_at`, `updated_at` (timestamptz)

### clips
Twitch clip metadata and engagement.

**Key Columns**:
- `id` (text, PK): Twitch clip ID
- `title` (text): Clip title
- `broadcaster_id` (text): Twitch broadcaster ID
- `broadcaster_name` (text): Display name
- `game_id` (text): Twitch game ID
- `game_name` (text): Game name
- `view_count` (int): Twitch view count
- `duration` (numeric): Duration in seconds
- `vote_score` (int): Net votes (upvotes - downvotes)
- `hot_score` (numeric): Reddit-style hot ranking
- `embedding` (vector(768)): Semantic search vector
- `created_at` (timestamptz): Twitch creation time
- `indexed_at` (timestamptz): When added to Clipper

**Indexes**:
- Primary key on `id`
- B-tree on `broadcaster_id`, `game_id`, `created_at`, `vote_score`
- GIN on `to_tsvector('english', title)` for full-text search
- HNSW on `embedding` for vector similarity

### comments
User comments on clips.

**Key Columns**:
- `id` (UUID, PK)
- `clip_id` (text, FK → clips.id)
- `user_id` (UUID, FK → users.id)
- `parent_id` (UUID, nullable): Reply parent
- `content` (text): Markdown content
- `vote_score` (int)
- `created_at`, `updated_at` (timestamptz)

### votes
Vote records for clips and comments.

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `votable_type` (text): "clip" or "comment"
- `votable_id` (text/UUID): Target ID
- `value` (int): 1 (upvote) or -1 (downvote)
- `created_at` (timestamptz)

**Constraints**:
- Unique index on `(user_id, votable_type, votable_id)` to prevent duplicate votes

### favorites
User-saved clips.

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `clip_id` (text, FK → clips.id)
- `created_at` (timestamptz)

**Constraints**:
- Unique on `(user_id, clip_id)`

### tags
Clip categorization tags.

**Key Columns**:
- `id` (UUID, PK)
- `name` (text, unique): Tag name
- `slug` (text, unique): URL-friendly slug
- `usage_count` (int): Number of clips tagged
- `created_at` (timestamptz)

### clip_tags
Many-to-many junction table.

**Key Columns**:
- `clip_id` (text, FK → clips.id)
- `tag_id` (UUID, FK → tags.id)
- Primary key on `(clip_id, tag_id)`

### subscriptions
Premium subscription records.

**Key Columns**:
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id, unique)
- `stripe_customer_id` (text, unique)
- `stripe_subscription_id` (text, unique)
- `tier` (text): "free" or "pro"
- `status` (text): "active", "canceled", "past_due"
- `current_period_end` (timestamptz)
- `created_at`, `updated_at` (timestamptz)

See [[../premium/entitlements|Premium Entitlements]].

## Database Functions

### update_hot_score()

Trigger function that recalculates hot score on clip vote changes:

```sql
hot_score = log10(max(abs(vote_score), 1)) * sign(vote_score) 
            + (epoch_seconds(created_at) - 1134028003) / 45000
```

Based on Reddit's hot ranking algorithm. Higher scores = more prominent in "hot" feed.

### update_updated_at()

Generic trigger to set `updated_at = NOW()` on row updates.

## Migrations

Managed via golang-migrate. See [[../operations/migration|Migration Guide]].

**Commands**:
```bash
# Apply all pending
make migrate-up

# Rollback last
make migrate-down

# Check status
make migrate-status

# Create new migration
./backend/scripts/create-migration.sh add_feature_name
```

**Migration Files**:
```
backend/migrations/
  20250124120000_initial_schema.up.sql
  20250124120000_initial_schema.down.sql
  20250125140000_add_premium.up.sql
  20250125140000_add_premium.down.sql
```

## Maintenance

### Vacuum & Analyze

```sql
-- Vacuum all tables (weekly)
VACUUM VERBOSE ANALYZE;

-- Vacuum specific table
VACUUM VERBOSE ANALYZE clips;

-- Full vacuum (locks table, use off-hours)
VACUUM FULL clips;

-- Update statistics
ANALYZE;
```

### Reindex

```sql
-- Reindex database (monthly)
REINDEX DATABASE clipper;

-- Reindex specific table
REINDEX TABLE clips;

-- Reindex specific index
REINDEX INDEX idx_clips_created_at;
```

### Monitor Queries

```sql
-- Active connections
SELECT pid, usename, application_name, state, query, query_start
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Long-running queries (>5 min)
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
  AND (now() - query_start) > interval '5 minutes'
ORDER BY duration DESC;

-- Kill query
SELECT pg_terminate_backend(12345);  -- Replace PID
```

### Database Size

```sql
-- Total database size
SELECT pg_size_pretty(pg_database_size('clipper'));

-- Size by table
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Index Usage

```sql
-- Unused indexes
SELECT schemaname, tablename, indexname, idx_scan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- Index hit ratio (should be >99%)
SELECT sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0) * 100 
       AS index_hit_ratio
FROM pg_statio_user_indexes;
```

## Query Optimization

### Using EXPLAIN

```sql
-- Show query plan
EXPLAIN SELECT * FROM clips WHERE broadcaster_id = 'abc123';

-- Show actual execution
EXPLAIN ANALYZE SELECT * FROM clips WHERE broadcaster_id = 'abc123';

-- Detailed analysis
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM clips WHERE broadcaster_id = 'abc123';
```

### Common Optimizations

**Add Missing Indexes**:
```sql
CREATE INDEX idx_clips_broadcaster_id ON clips(broadcaster_id);
CREATE INDEX idx_comments_clip_id ON comments(clip_id);
```

**Full-Text Search**:
```sql
-- Instead of LIKE
CREATE INDEX idx_clips_title_fts ON clips USING gin(to_tsvector('english', title));

SELECT * FROM clips
WHERE to_tsvector('english', title) @@ to_tsquery('english', 'funny');
```

**Pagination**:
```sql
-- Always use LIMIT/OFFSET
SELECT * FROM clips
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

## Backup & Recovery

### Automated Backups

```bash
# Create backup
pg_dump -h localhost -U clipper -d clipper -F c -f backup_$(date +%Y%m%d).dump

# Restore
pg_restore -h localhost -U clipper -d clipper backup_20250124.dump
```

See [[../operations/infra|Infrastructure]] for production backup procedures.

### Recovery Objectives

- **RTO** (Recovery Time): 1 hour
- **RPO** (Recovery Point): 1 hour (hourly backups)

## Performance Targets

| Metric | Target |
|--------|--------|
| Connection pool utilization | <80% |
| Query p95 latency | <50ms |
| Index hit ratio | >99% |
| Cache hit ratio | >95% |

See [[testing|Load Testing]] for performance benchmarks.

---

## Related Documentation

- [[architecture|Backend Architecture]]
- [[testing|Testing Guide]]
- [[../operations/migration|Migrations]]
- [[../operations/infra|Infrastructure]]
- [[../operations/monitoring|Monitoring]]

---

[[../index|← Back to Index]]
