-- Migration: Add advanced query performance indexes
-- Description: Creates indexes to optimize advanced query operations
-- including full-text search, range queries, and composite filtering
--
-- PERFORMANCE NOTE: The functional GIN indexes below (to_tsvector) are 
-- generally less efficient than pre-computed search_vector columns with triggers.
-- The clips table already has a search_vector column which is the preferred approach.
-- The functional indexes here are kept as fallback options and for tables that
-- may not have pre-computed search vectors.

-- ============================================================================
-- FULL-TEXT SEARCH INDEXES
-- ============================================================================

-- Clips: Composite full-text search index on title and creator name
-- NOTE: These functional indexes are more expensive to maintain. Consider using
-- pre-computed search_vector columns with triggers for frequently updated tables.
-- Supports: ILIKE, full-text search queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_title_search
ON clips USING gin (to_tsvector('english', COALESCE(title, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_creator_name_search
ON clips USING gin (to_tsvector('english', COALESCE(creator_name, '')));

-- Combined search vector index (if search_vector column exists)
-- This is the primary index used by the search repository
-- PREFERRED: Using pre-computed column is more efficient than functional indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_search_vector
ON clips USING gin (search_vector);

-- ============================================================================
-- RANGE QUERY INDEXES
-- ============================================================================

-- Clips: Index for score-based range queries
-- Supports: vote_score > X, vote_score BETWEEN X AND Y
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_vote_score
ON clips (vote_score DESC);

-- Clips: Index for date range queries
-- Supports: created_at BETWEEN X AND Y, created_at > X
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_created_at
ON clips (created_at DESC);

-- Clips: Index for view count queries
-- Supports: view_count > X, popular clips
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_view_count
ON clips (view_count DESC);

-- ============================================================================
-- COMPOSITE FILTERING INDEXES
-- ============================================================================

-- Clips: Composite index for common filter combinations
-- Supports: is_removed = false AND game_id = X queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_active_by_game
ON clips (game_id, created_at DESC)
WHERE is_removed = false;

-- Clips: Composite index for creator filtering with recency
-- Supports: creator_id = X AND created_at > Y
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_active_by_creator
ON clips (creator_id, created_at DESC)
WHERE is_removed = false;

-- Clips: Composite index for language filtering
-- Supports: language = X AND is_removed = false
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_active_by_language
ON clips (language, created_at DESC)
WHERE is_removed = false;

-- ============================================================================
-- EQUALITY AND IN QUERY INDEXES
-- ============================================================================

-- Clips: Index for status-based equality queries
-- Supports: is_featured = true, is_nsfw = false
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_is_featured
ON clips (is_featured)
WHERE is_featured = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_is_nsfw
ON clips (is_nsfw)
WHERE is_nsfw = true;

-- Tags: Index for tag lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_slug
ON tags (slug);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_usage_count
ON tags (usage_count DESC);

-- Clip-Tags: Composite index for tag-based clip filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clip_tags_clip_id
ON clip_tags (clip_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clip_tags_tag_id
ON clip_tags (tag_id);

-- ============================================================================
-- USER SEARCH INDEXES
-- ============================================================================

-- Users: Full-text search on username and display name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_search_vector
ON users USING gin (search_vector);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_trgm
ON users USING gin (username gin_trgm_ops);

-- Users: Karma-based sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_karma
ON users (karma_points DESC)
WHERE is_banned = false;

-- ============================================================================
-- PAGINATION SUPPORT INDEXES
-- ============================================================================

-- Clips: Covering index for paginated listing queries
-- Includes commonly selected columns to enable index-only scans
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_pagination
ON clips (created_at DESC, id)
INCLUDE (title, creator_name, vote_score, thumbnail_url)
WHERE is_removed = false;

-- ============================================================================
-- NOTES ON INDEX USAGE
-- ============================================================================
-- 
-- These indexes are designed to support the advanced query translator module.
-- Key query patterns supported:
--
-- 1. Full-text search: title @@ 'query', search_vector @@ to_tsquery(...)
-- 2. Range queries: vote_score BETWEEN X AND Y, created_at > timestamp
-- 3. Composite filters: is_removed = false AND game_id = X
-- 4. IN queries: game_id IN ('val', 'csgo')
-- 5. Pagination: ORDER BY created_at DESC LIMIT X OFFSET Y
--
-- Index naming convention:
-- - idx_{table}_{column(s)} for single-column indexes
-- - idx_{table}_{use_case} for composite/partial indexes
--
-- Performance considerations:
-- - All indexes created with CONCURRENTLY to avoid locks
-- - Partial indexes used where applicable (WHERE is_removed = false)
-- - Covering indexes for pagination to enable index-only scans
-- - GIN indexes for full-text search and array operations
