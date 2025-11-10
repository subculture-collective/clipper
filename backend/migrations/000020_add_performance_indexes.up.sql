-- Add performance indexes for query optimization
-- These indexes target the most common and slowest query patterns

-- ============================================================================
-- HIGH PRIORITY: Feed and Listing Queries
-- ============================================================================

-- Composite index for feed queries (most common query pattern)
-- Optimizes: WHERE is_removed = false ORDER BY vote_score DESC, created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_not_removed_hot 
ON clips(is_removed, vote_score DESC, created_at DESC) 
WHERE is_removed = false;

-- Partial index for new/recent clips
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_not_removed_created 
ON clips(is_removed, created_at DESC) 
WHERE is_removed = false;

-- Partial index for top-voted clips
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_not_removed_vote_score 
ON clips(is_removed, vote_score DESC) 
WHERE is_removed = false;

-- ============================================================================
-- HIGH PRIORITY: Comment Queries
-- ============================================================================

-- Composite index for comments by clip with filtering and sorting
-- Optimizes: WHERE clip_id = ? AND is_removed = false ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_clip_not_removed_created 
ON comments(clip_id, is_removed, created_at DESC) 
WHERE is_removed = false;

-- Index for top comments (sorted by vote score)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_clip_not_removed_score 
ON comments(clip_id, is_removed, vote_score DESC) 
WHERE is_removed = false;

-- ============================================================================
-- HIGH PRIORITY: User Interaction Lookups
-- ============================================================================

-- Index for checking if user voted on a clip (prevents N+1 queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_clip 
ON votes(user_id, clip_id);

-- Index for clip votes with user filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_clip_user 
ON votes(clip_id, user_id);

-- Index for checking if user favorited a clip (prevents N+1 queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user_clip 
ON favorites(user_id, clip_id);

-- Index for clip favorites with user filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_clip_user 
ON favorites(clip_id, user_id);

-- ============================================================================
-- MEDIUM PRIORITY: Filtered Queries
-- ============================================================================

-- Index for game filtering with sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_game_not_removed_created 
ON clips(game_id, is_removed, created_at DESC) 
WHERE is_removed = false AND game_id IS NOT NULL;

-- Index for broadcaster filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_broadcaster_not_removed 
ON clips(broadcaster_id, is_removed, created_at DESC) 
WHERE is_removed = false AND broadcaster_id IS NOT NULL;

-- ============================================================================
-- MEDIUM PRIORITY: User Activity Pages
-- ============================================================================

-- Index for user's comment history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_created 
ON comments(user_id, is_removed, created_at DESC);

-- Index for user's vote history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_created 
ON votes(user_id, created_at DESC);

-- Index for user's favorites with timestamp
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user_created 
ON favorites(user_id, created_at DESC);

-- ============================================================================
-- MEDIUM PRIORITY: Tag and Relationship Queries
-- ============================================================================

-- Index for clip-tag relationship lookup (both directions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clip_tags_clip 
ON clip_tags(clip_id, tag_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clip_tags_tag 
ON clip_tags(tag_id, clip_id);

-- Index for popular tags
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_clip_count 
ON tags(clip_count DESC, name);

-- ============================================================================
-- MEDIUM PRIORITY: Notifications
-- ============================================================================

-- Index for user's unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC) 
WHERE is_read = false;
