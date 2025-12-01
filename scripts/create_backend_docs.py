#!/usr/bin/env python3
"""
Generate consolidated backend documentation files for Clipper
"""

from pathlib import Path

# Paths
OLD_DOCS = Path("docs")
NEW_DOCS = Path("docs_new")
BACKEND = NEW_DOCS / "backend"

def create_api_doc():
    """Consolidate API.md + CLIP_API.md + COMMENT_API.md"""
    content = """# API Reference

Complete API documentation for the Clipper backend.

## Base URL

```
Development: http://localhost:8080/api/v1
Production: https://api.clipper.app/api/v1
```

## Authentication

Most endpoints require authentication via JWT token:

```
Authorization: Bearer <jwt_token>
```

Get a token via [[authentication|Twitch OAuth flow]].

## Common Patterns

### Success Response

```json
{
  "data": {
    // Response payload
  },
  "meta": {
    // Pagination, counts, etc.
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

### HTTP Status Codes

- `200 OK`: Success
- `201 Created`: Resource created
- `204 No Content`: Success, no body
- `400 Bad Request`: Invalid input
- `401 Unauthorized`: Auth required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate resource
- `422 Unprocessable Entity`: Validation error
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Pagination

List endpoints support pagination:

```
GET /api/v1/clips?page=2&limit=20
```

Response includes metadata:

```json
{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

## Endpoints

### Health Check

#### GET /health

System health status.

**Auth**: None

**Response**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "database": "up",
    "redis": "up",
    "opensearch": "up"
  }
}
```

---

### Authentication

See [[authentication|Authentication Guide]] for flow details.

#### POST /auth/twitch

Initiate Twitch OAuth.

**Auth**: None

**Response**:
```json
{
  "url": "https://id.twitch.tv/oauth2/authorize?..."
}
```

#### GET /auth/twitch/callback

OAuth callback endpoint.

**Auth**: None

**Query**:
- `code` (string): Authorization code
- `state` (string): CSRF token

**Response**:
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "123",
    "username": "johndoe",
    "email": "john@example.com"
  }
}
```

#### POST /auth/logout

Log out current user.

**Auth**: Required

**Response**:
```json
{
  "message": "Logged out successfully"
}
```

---

### Clips

#### GET /clips

List clips with filters.

**Auth**: Optional

**Query**:
- `page` (int, default 1): Page number
- `limit` (int, default 20, max 100): Items per page
- `streamer` (string): Filter by streamer username
- `game` (string): Filter by game
- `tag` (string): Filter by tag
- `sort` (string, default "created_at"): Sort field
- `order` (string, default "desc"): Sort order (asc/desc)

**Response**:
```json
{
  "data": [
    {
      "id": "AwkwardHelplessSalamander",
      "url": "https://clips.twitch.tv/...",
      "title": "Amazing play!",
      "streamer": "johndoe",
      "game": "Valorant",
      "views": 1234,
      "duration": 30,
      "created_at": "2025-10-20T12:00:00Z",
      "thumbnail_url": "https://...",
      "vote_score": 42,
      "comment_count": 5
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

#### GET /clips/:id

Get clip details.

**Auth**: Optional

**Response**:
```json
{
  "data": {
    "id": "AwkwardHelplessSalamander",
    "url": "https://clips.twitch.tv/...",
    "title": "Amazing play!",
    "description": "Insane clutch",
    "streamer": "johndoe",
    "game": "Valorant",
    "views": 1234,
    "duration": 30,
    "created_at": "2025-10-20T12:00:00Z",
    "thumbnail_url": "https://...",
    "tags": ["clutch", "ace"],
    "vote_score": 42,
    "comment_count": 5,
    "user_vote": 1
  }
}
```

#### POST /clips

Submit a clip.

**Auth**: Required

**Body**:
```json
{
  "twitch_clip_id": "AwkwardHelplessSalamander",
  "tags": ["clutch", "ace"]
}
```

**Response**: Returns created clip (201 Created)

#### DELETE /clips/:id

Delete a clip (owner or admin only).

**Auth**: Required

**Response**: 204 No Content

#### POST /clips/:id/vote

Vote on a clip.

**Auth**: Required

**Body**:
```json
{
  "value": 1  // 1 = upvote, -1 = downvote, 0 = remove vote
}
```

**Response**:
```json
{
  "data": {
    "vote_score": 43,
    "user_vote": 1
  }
}
```

---

### Comments

#### GET /clips/:clip_id/comments

List comments for a clip.

**Auth**: Optional

**Query**:
- `page`, `limit`: Pagination
- `sort` (string): "best" | "new" | "controversial"

**Response**:
```json
{
  "data": [
    {
      "id": "550e8400-...",
      "user": {
        "id": "123",
        "username": "jane",
        "avatar_url": "https://..."
      },
      "content": "Great clip!",
      "created_at": "2025-10-20T12:30:00Z",
      "vote_score": 5,
      "user_vote": 0
    }
  ],
  "meta": {...}
}
```

#### POST /clips/:clip_id/comments

Add a comment.

**Auth**: Required

**Body**:
```json
{
  "content": "Great clip!",
  "parent_id": null  // Optional: reply to comment
}
```

**Response**: Returns created comment (201 Created)

#### PUT /comments/:id

Edit a comment (owner only).

**Auth**: Required

**Body**:
```json
{
  "content": "Updated comment"
}
```

#### DELETE /comments/:id

Delete a comment (owner or admin only).

**Auth**: Required

**Response**: 204 No Content

#### POST /comments/:id/vote

Vote on a comment.

**Auth**: Required

**Body**:
```json
{
  "value": 1  // 1 = upvote, -1 = downvote, 0 = remove
}
```

---

### Search

See [[search|Search Platform]] for complete documentation.

#### GET /search

Search clips, users, games, tags.

**Auth**: Optional

**Query**:
- `q` (string, required): Query using [[../decisions/adr-003-advanced-query-language|query language]]
- `type` (string): "clips" | "users" | "games" | "tags" | "all"
- Legacy params (deprecated): `game_id`, `creator_id`, `tags`, etc.

**Examples**:
```
?q=valorant
?q=game:valorant tag:clutch votes:>50
?q="epic comeback" after:last-week
```

**Response**:
```json
{
  "data": {
    "clips": [...],
    "users": [...],
    "games": [...],
    "tags": [...]
  },
  "meta": {
    "query": "valorant",
    "total_results": 156,
    "execution_time_ms": 42
  }
}
```

#### GET /search/suggestions

Autocomplete suggestions.

**Auth**: Optional

**Query**:
- `q` (string): Partial query
- `type` (string): Filter suggestion type

**Response**:
```json
{
  "data": [
    {
      "text": "valorant",
      "type": "game",
      "count": 1234
    },
    {
      "text": "valorant clutch",
      "type": "query",
      "count": 156
    }
  ]
}
```

---

### Users

#### GET /users/:id

Get user profile.

**Auth**: Optional

**Response**:
```json
{
  "data": {
    "id": "123",
    "username": "johndoe",
    "display_name": "John Doe",
    "avatar_url": "https://...",
    "bio": "Clip curator",
    "joined_at": "2025-01-01T00:00:00Z",
    "karma": 42,
    "clips_count": 15,
    "favorites_count": 50
  }
}
```

#### PUT /users/:id

Update own profile.

**Auth**: Required (own profile)

**Body**:
```json
{
  "display_name": "John Doe",
  "bio": "Updated bio"
}
```

#### GET /users/:id/clips

Get user's submitted clips.

**Auth**: Optional

**Query**: Standard pagination

#### GET /users/:id/favorites

Get user's favorited clips.

**Auth**: Required (own favorites) or public profiles

#### POST /clips/:id/favorite

Add clip to favorites.

**Auth**: Required

#### DELETE /clips/:id/favorite

Remove from favorites.

**Auth**: Required

---

### Premium

See [[../premium/overview|Premium Overview]] for feature details.

#### GET /premium/tiers

Get available subscription tiers.

**Auth**: Optional

**Response**:
```json
{
  "data": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "features": [...]
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 4.99,
      "interval": "month",
      "features": [...]
    }
  ]
}
```

#### POST /premium/checkout

Create Stripe checkout session.

**Auth**: Required

**Body**:
```json
{
  "tier_id": "pro",
  "interval": "month"
}
```

**Response**:
```json
{
  "checkout_url": "https://checkout.stripe.com/..."
}
```

#### POST /premium/cancel

Cancel subscription.

**Auth**: Required

---

## Rate Limiting

Rate limits per user (authenticated) or IP (anonymous):

- Anonymous: 60 requests/minute
- Authenticated: 300 requests/minute

Headers:
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1634567890
```

## Versioning

API versioned in URL: `/api/v1/`

Breaking changes will increment version: `/api/v2/`

## WebSockets (Future)

Real-time features will use WebSocket connections (planned).

---

## Related Documentation

- [[architecture|Backend Architecture]]
- [[authentication|Authentication]]
- [[rbac|RBAC]]
- [[search|Search Platform]]
- [[../premium/overview|Premium Overview]]

---

[[../index|← Back to Index]]
"""
    
    (BACKEND / "api.md").write_text(content)
    print("✓ backend/api.md")

def create_database_doc():
    """Consolidated database documentation"""
    # Copy from existing database.md with consolidation
    content = """# Database

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
"""
    
    (BACKEND / "database.md").write_text(content)
    print("✓ backend/database.md")

def create_testing_doc():
    """Create consolidated testing documentation"""
    # Use existing TESTING.md as base
    src = OLD_DOCS / "TESTING.md"
    content = src.read_text()
    
    # Replace internal links with wikilinks
    content = content.replace("](../backend/", "]([[")
    content = content.replace(".md)", "|")
    content = content.replace("[Load Testing README](../backend/tests/load/README.md)", 
                             "[[testing|Load Testing]]")
    
    # Add wiki footer
    content += "\n\n---\n\n[[../index|← Back to Index]]\n"
    
    (BACKEND / "testing.md").write_text(content)
    print("✓ backend/testing.md")

def main():
    print("Creating consolidated backend documentation...")
    create_api_doc()
    create_database_doc()
    create_testing_doc()
    print("\n✅ Backend core docs created")

if __name__ == "__main__":
    main()
