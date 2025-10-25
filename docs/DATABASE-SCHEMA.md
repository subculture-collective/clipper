# Clipper Database Schema - Entity Relationship Diagram

## Overview

This document describes the database schema for the Clipper application, including all tables, relationships, and key features.

## Tables and Relationships

### Core Entities

#### 1. Users

**Table:** `users`

The central table for user accounts and authentication.

**Columns:**

- `id` (UUID, PK) - Primary key
- `twitch_id` (VARCHAR, UNIQUE) - Twitch user ID for OAuth
- `username` (VARCHAR) - Username
- `display_name` (VARCHAR) - Display name
- `email` (VARCHAR) - Email address
- `avatar_url` (TEXT) - Profile picture URL
- `bio` (TEXT) - User biography
- `karma_points` (INT) - Gamification score
- `role` (VARCHAR) - User role: user, moderator, admin
- `is_banned` (BOOLEAN) - Ban status
- `created_at` (TIMESTAMP) - Account creation time
- `updated_at` (TIMESTAMP) - Last update time (auto-updated)
- `last_login_at` (TIMESTAMP) - Last login time

**Relationships:**

- One-to-many with `clips` (via votes, comments, favorites)
- One-to-many with `votes`
- One-to-many with `comments`
- One-to-many with `comment_votes`
- One-to-many with `favorites`
- One-to-many with `reports` (as reporter)
- One-to-many with `reports` (as reviewer)

#### 2. Clips

**Table:** `clips`

Stores Twitch clip metadata and engagement metrics.

**Columns:**

- `id` (UUID, PK) - Primary key
- `twitch_clip_id` (VARCHAR, UNIQUE) - Twitch clip identifier
- `twitch_clip_url` (TEXT) - Full Twitch URL
- `embed_url` (TEXT) - Embeddable URL
- `title` (VARCHAR) - Clip title
- `creator_name` (VARCHAR) - Clip creator username
- `creator_id` (VARCHAR) - Clip creator Twitch ID
- `broadcaster_name` (VARCHAR) - Channel/broadcaster name
- `broadcaster_id` (VARCHAR) - Broadcaster Twitch ID
- `game_id` (VARCHAR) - Game/category ID
- `game_name` (VARCHAR) - Game/category name
- `language` (VARCHAR) - Content language code
- `thumbnail_url` (TEXT) - Thumbnail image URL
- `duration` (FLOAT) - Clip duration in seconds
- `view_count` (INT) - Twitch view count
- `created_at` (TIMESTAMP) - Clip creation time on Twitch
- `imported_at` (TIMESTAMP) - Import time to our platform
- `vote_score` (INT) - Net votes (auto-updated by trigger)
- `comment_count` (INT) - Number of comments (auto-updated by trigger)
- `favorite_count` (INT) - Number of favorites (auto-updated by trigger)
- `is_featured` (BOOLEAN) - Featured status
- `is_nsfw` (BOOLEAN) - NSFW content flag
- `is_removed` (BOOLEAN) - Moderation removal flag
- `removed_reason` (TEXT) - Reason for removal

**Relationships:**

- One-to-many with `votes`
- One-to-many with `comments`
- One-to-many with `favorites`
- Many-to-many with `tags` (via `clip_tags`)
- One-to-many with `reports` (as reportable)

#### 3. Votes

**Table:** `votes`

Tracks user votes (upvotes/downvotes) on clips.

**Columns:**

- `id` (UUID, PK) - Primary key
- `user_id` (UUID, FK) - References `users.id`
- `clip_id` (UUID, FK) - References `clips.id`
- `vote_type` (SMALLINT) - Vote direction: 1 (upvote), -1 (downvote)
- `created_at` (TIMESTAMP) - Vote timestamp

**Constraints:**

- UNIQUE(user_id, clip_id) - One vote per user per clip

**Triggers:**

- Automatically updates `clips.vote_score` on INSERT/UPDATE/DELETE

#### 4. Comments

**Table:** `comments`

User comments on clips with nested comment support.

**Columns:**

- `id` (UUID, PK) - Primary key
- `clip_id` (UUID, FK) - References `clips.id`
- `user_id` (UUID, FK) - References `users.id`
- `parent_comment_id` (UUID, FK, NULLABLE) - References `comments.id` for nested comments
- `content` (TEXT) - Comment text content
- `vote_score` (INT) - Net votes (auto-updated by trigger)
- `is_edited` (BOOLEAN) - Edit status flag
- `is_removed` (BOOLEAN) - Moderation removal flag
- `removed_reason` (TEXT) - Reason for removal
- `created_at` (TIMESTAMP) - Comment creation time
- `updated_at` (TIMESTAMP) - Last update time (auto-updated)

**Relationships:**

- Many-to-one with `clips`
- Many-to-one with `users`
- Self-referencing for nested comments (parent-child)
- One-to-many with `comment_votes`

**Triggers:**

- Automatically updates `updated_at` on UPDATE
- Automatically updates `clips.comment_count` on INSERT/DELETE

#### 5. Comment Votes

**Table:** `comment_votes`

Tracks user votes on comments.

**Columns:**

- `id` (UUID, PK) - Primary key
- `user_id` (UUID, FK) - References `users.id`
- `comment_id` (UUID, FK) - References `comments.id`
- `vote_type` (SMALLINT) - Vote direction: 1 (upvote), -1 (downvote)
- `created_at` (TIMESTAMP) - Vote timestamp

**Constraints:**

- UNIQUE(user_id, comment_id) - One vote per user per comment

**Triggers:**

- Automatically updates `comments.vote_score` on INSERT/UPDATE/DELETE

#### 6. Favorites

**Table:** `favorites`

User-saved favorite clips.

**Columns:**

- `id` (UUID, PK) - Primary key
- `user_id` (UUID, FK) - References `users.id`
- `clip_id` (UUID, FK) - References `clips.id`
- `created_at` (TIMESTAMP) - Favorite timestamp

**Constraints:**

- UNIQUE(user_id, clip_id) - One favorite per user per clip

**Triggers:**

- Automatically updates `clips.favorite_count` on INSERT/DELETE

#### 7. Tags

**Table:** `tags`

Categorization tags for clips.

**Columns:**

- `id` (UUID, PK) - Primary key
- `name` (VARCHAR, UNIQUE) - Tag name
- `slug` (VARCHAR, UNIQUE) - URL-friendly slug
- `description` (TEXT) - Tag description
- `color` (VARCHAR) - Hex color code for UI
- `usage_count` (INT) - Number of clips using tag (auto-updated by trigger)
- `created_at` (TIMESTAMP) - Tag creation time

**Relationships:**

- Many-to-many with `clips` (via `clip_tags`)

#### 8. Clip Tags

**Table:** `clip_tags`

Junction table for clips and tags (many-to-many).

**Columns:**

- `clip_id` (UUID, FK, PK) - References `clips.id`
- `tag_id` (UUID, FK, PK) - References `tags.id`
- `created_at` (TIMESTAMP) - Association timestamp

**Constraints:**

- PRIMARY KEY(clip_id, tag_id)

**Triggers:**

- Automatically updates `tags.usage_count` on INSERT/DELETE

#### 9. Reports

**Table:** `reports`

User-generated reports for moderation.

**Columns:**

- `id` (UUID, PK) - Primary key
- `reporter_id` (UUID, FK) - References `users.id` (who reported)
- `reportable_type` (VARCHAR) - Type: 'clip', 'comment', 'user'
- `reportable_id` (UUID) - ID of reported entity
- `reason` (VARCHAR) - Report reason category
- `description` (TEXT) - Detailed description
- `status` (VARCHAR) - Status: pending, reviewed, actioned, dismissed
- `reviewed_by` (UUID, FK, NULLABLE) - References `users.id` (moderator)
- `reviewed_at` (TIMESTAMP, NULLABLE) - Review timestamp
- `created_at` (TIMESTAMP) - Report creation time

**Relationships:**

- Many-to-one with `users` (reporter)
- Many-to-one with `users` (reviewer)
- Polymorphic relationship with clips, comments, or users (via type + id)

## Database Functions

### calculate_hot_score(score INT, created_at TIMESTAMP) → FLOAT

Implements Reddit-style hot ranking algorithm:

```
hot_score = log(max(|score|, 1)) * sign(score) - (age_in_hours / 12.5)
```

**Parameters:**

- `score`: Vote score (can be positive or negative)
- `created_at`: Content creation timestamp

**Returns:** Hot score (higher = more prominent)

**Used by:** `hot_clips` and `trending_clips` views

## Triggers

### Auto-Update Triggers

1. **update_users_updated_at**
   - Table: `users`
   - When: BEFORE UPDATE
   - Action: Sets `updated_at = NOW()`

2. **update_comments_updated_at**
   - Table: `comments`
   - When: BEFORE UPDATE
   - Action: Sets `updated_at = NOW()`

### Vote Score Triggers

3. **update_clip_votes**
   - Table: `votes`
   - When: AFTER INSERT OR UPDATE OR DELETE
   - Action: Updates `clips.vote_score` based on vote_type

4. **update_comment_votes**
   - Table: `comment_votes`
   - When: AFTER INSERT OR UPDATE OR DELETE
   - Action: Updates `comments.vote_score` based on vote_type

### Count Triggers

5. **update_clip_comments**
   - Table: `comments`
   - When: AFTER INSERT OR DELETE
   - Action: Updates `clips.comment_count`

6. **update_clip_favorites**
   - Table: `favorites`
   - When: AFTER INSERT OR DELETE
   - Action: Updates `clips.favorite_count`

7. **update_tag_usage**
   - Table: `clip_tags`
   - When: AFTER INSERT OR DELETE
   - Action: Updates `tags.usage_count`

## Views

### 1. hot_clips

Clips ranked by hot score (Reddit-style algorithm).

```sql
SELECT c.*, calculate_hot_score(c.vote_score, c.created_at) as hot_score
FROM clips c
WHERE c.is_removed = false
ORDER BY hot_score DESC
```

**Use case:** Main feed, trending content

### 2. top_clips

Clips ranked by total vote score (all-time popular).

```sql
SELECT c.*
FROM clips c
WHERE c.is_removed = false
ORDER BY c.vote_score DESC, c.created_at DESC
```

**Use case:** Top/best of all time

### 3. new_clips

Clips sorted by creation time (most recent first).

```sql
SELECT c.*
FROM clips c
WHERE c.is_removed = false
ORDER BY c.created_at DESC
```

**Use case:** New/latest content feed

### 4. trending_clips

Popular clips from the last 7 days.

```sql
SELECT c.*, calculate_hot_score(c.vote_score, c.created_at) as hot_score
FROM clips c
WHERE c.is_removed = false 
  AND c.created_at > NOW() - INTERVAL '7 days'
ORDER BY hot_score DESC
```

**Use case:** Weekly trending, what's hot now

## Indexes

### Performance Optimization

All tables include strategic indexes for common query patterns:

**users:**

- `idx_users_twitch_id` - Twitch OAuth lookups
- `idx_users_username` - Username searches
- `idx_users_karma` - Leaderboard queries

**clips:**

- `idx_clips_twitch_id` - Twitch clip lookups
- `idx_clips_broadcaster` - Filter by broadcaster
- `idx_clips_game` - Filter by game/category
- `idx_clips_created` - Sort by date
- `idx_clips_vote_score` - Sort by popularity
- `idx_clips_hot` - Composite for hot ranking

**votes:**

- `idx_votes_user` - User's vote history
- `idx_votes_clip` - Clip's votes
- `idx_votes_created` - Recent votes

**comments:**

- `idx_comments_clip` - Clip's comments (composite with created_at)
- `idx_comments_user` - User's comments
- `idx_comments_parent` - Nested comment traversal
- `idx_comments_score` - Sort by score

**comment_votes:**

- `idx_comment_votes_user` - User's comment votes
- `idx_comment_votes_comment` - Comment's votes

**favorites:**

- `idx_favorites_user` - User's favorites (composite with created_at)
- `idx_favorites_clip` - Clip's favorite count

**tags:**

- `idx_tags_slug` - Tag lookups by slug
- `idx_tags_usage` - Popular tags

**clip_tags:**

- `idx_clip_tags_clip` - Clip's tags
- `idx_clip_tags_tag` - Tag's clips

**reports:**

- `idx_reports_status` - Pending reports (composite with created_at)
- `idx_reports_type` - Reported items by type

## Visual Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                          USERS                                    │
│  - id (PK)                                                        │
│  - twitch_id (UNIQUE)                                             │
│  - username, display_name, email                                  │
│  - karma_points, role, is_banned                                  │
│  - created_at, updated_at, last_login_at                          │
└────────┬──────────────────────────┬──────────────────────────────┘
         │                          │
         │                          │
         ├──────────────────┐       └──────────────────┐
         │                  │                          │
         ▼                  ▼                          ▼
┌─────────────────┐  ┌─────────────────┐      ┌─────────────────┐
│     VOTES       │  │   COMMENTS      │      │   FAVORITES     │
│  - id (PK)      │  │  - id (PK)      │      │  - id (PK)      │
│  - user_id (FK) │  │  - user_id (FK) │      │  - user_id (FK) │
│  - clip_id (FK) │  │  - clip_id (FK) │      │  - clip_id (FK) │
│  - vote_type    │  │  - parent_id    │      │  - created_at   │
│  - created_at   │  │  - content      │      └────────┬────────┘
└────────┬────────┘  │  - vote_score   │               │
         │           │  - created_at   │               │
         │           └────────┬────────┘               │
         │                    │                        │
         │                    │                        │
         │                    ▼                        │
         │           ┌─────────────────┐               │
         │           │ COMMENT_VOTES   │               │
         │           │  - id (PK)      │               │
         │           │  - user_id (FK) │               │
         │           │  - comment_id   │               │
         │           │  - vote_type    │               │
         │           │  - created_at   │               │
         │           └─────────────────┘               │
         │                                             │
         └─────────────────┐           ┌───────────────┘
                           ▼           ▼
                   ┌─────────────────────────────┐
                   │         CLIPS               │
                   │  - id (PK)                  │
                   │  - twitch_clip_id (UNIQUE)  │
                   │  - title, embed_url         │
                   │  - broadcaster, game        │
                   │  - vote_score (computed)    │
                   │  - comment_count (computed) │
                   │  - favorite_count (computed)│
                   │  - created_at, imported_at  │
                   └────────┬────────────────────┘
                            │
                            │
                            ▼
                   ┌─────────────────┐
                   │   CLIP_TAGS     │
                   │  - clip_id (PK) │
                   │  - tag_id (PK)  │
                   │  - created_at   │
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │      TAGS       │
                   │  - id (PK)      │
                   │  - name (UNIQUE)│
                   │  - slug (UNIQUE)│
                   │  - usage_count  │
                   │  - color        │
                   └─────────────────┘

         ┌──────────────────────────┐
         │       REPORTS            │
         │  - id (PK)               │
         │  - reporter_id (FK)      │
         │  - reportable_type       │
         │  - reportable_id         │
         │  - status, reason        │
         │  - reviewed_by (FK)      │
         │  - reviewed_at           │
         └──────────────────────────┘
```

## Cascade Delete Behavior

All foreign key relationships use `ON DELETE CASCADE` to maintain referential integrity:

- Deleting a user removes their votes, comments, comment votes, favorites, and reports
- Deleting a clip removes its votes, comments, favorites, tags associations
- Deleting a comment removes its votes and child comments (nested)
- Deleting a tag removes its clip associations

## Migration Files

- **Up:** `000001_initial_schema.up.sql`
- **Down:** `000001_initial_schema.down.sql`
- **Seed:** `seed.sql`

## Querying Best Practices

### Common Queries

1. **Get user's voted clips:**

```sql
SELECT c.* 
FROM clips c
JOIN votes v ON c.id = v.clip_id
WHERE v.user_id = $1
ORDER BY v.created_at DESC;
```

2. **Get clip with comment count:**

```sql
SELECT c.*, c.comment_count
FROM clips c
WHERE c.id = $1;
```

3. **Get nested comments:**

```sql
WITH RECURSIVE comment_tree AS (
    SELECT *, 0 as depth
    FROM comments
    WHERE clip_id = $1 AND parent_comment_id IS NULL
    UNION ALL
    SELECT c.*, ct.depth + 1
    FROM comments c
    JOIN comment_tree ct ON c.parent_comment_id = ct.id
)
SELECT * FROM comment_tree
ORDER BY depth, created_at;
```

4. **Get trending clips:**

```sql
SELECT * FROM trending_clips LIMIT 20;
```

5. **Get user's feed (hot clips):**

```sql
SELECT * FROM hot_clips LIMIT 50;
```

## Security Considerations

1. **UUIDs** are used for all primary keys to prevent enumeration attacks
2. **Unique constraints** prevent duplicate votes, favorites
3. **Foreign keys** with CASCADE ensure data integrity
4. **Indexes** on frequently queried fields optimize performance
5. **Views** exclude removed/moderated content by default
6. **Roles** support user, moderator, admin levels

## Performance Notes

- Triggers maintain denormalized counts (vote_score, comment_count, etc.) for fast reads
- Views use efficient queries with appropriate WHERE clauses
- Composite indexes support common filter/sort combinations
- Connection pooling should be configured for concurrent access
- Consider read replicas for high-traffic feeds

## Future Enhancements

Potential schema improvements for future iterations:

1. Add full-text search indexes for clip titles/descriptions
2. Add materialized views for expensive aggregate queries
3. Add partitioning for time-series data (old clips)
4. Add audit log table for moderation actions
5. Add user relationships (follow/block)
6. Add playlist/collection tables
7. Add notification/activity feed tables
