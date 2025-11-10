-- Database Performance Optimizations
-- Run these queries to add additional indexes and optimize database performance

-- ============================================================================
-- CLIP INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Composite index for filtering by is_removed + sorting by various fields
-- Optimizes the common pattern: WHERE is_removed = false ORDER BY ...
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_not_removed_created 
ON clips(is_removed, created_at DESC) 
WHERE is_removed = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_not_removed_vote_score 
ON clips(is_removed, vote_score DESC) 
WHERE is_removed = false;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_not_removed_hot 
ON clips(is_removed, vote_score DESC, created_at DESC) 
WHERE is_removed = false;

-- Index for game filtering with sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_game_not_removed_created 
ON clips(game_id, is_removed, created_at DESC) 
WHERE is_removed = false;

-- Index for broadcaster filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_broadcaster_not_removed 
ON clips(broadcaster_id, is_removed, created_at DESC) 
WHERE is_removed = false;

-- Index for language filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_language_not_removed 
ON clips(language, is_removed, created_at DESC) 
WHERE is_removed = false AND language IS NOT NULL;

-- Index for featured clips
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clips_featured 
ON clips(is_featured, created_at DESC) 
WHERE is_featured = true AND is_removed = false;

-- ============================================================================
-- COMMENT INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite index for comments by clip with filtering and sorting
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_clip_not_removed_created 
ON comments(clip_id, is_removed, created_at DESC) 
WHERE is_removed = false;

-- Index for top comments (sorted by vote score)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_clip_not_removed_score 
ON comments(clip_id, is_removed, vote_score DESC) 
WHERE is_removed = false;

-- Index for parent comment lookup (threaded comments)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_parent_not_removed 
ON comments(parent_comment_id, is_removed, created_at ASC) 
WHERE parent_comment_id IS NOT NULL AND is_removed = false;

-- ============================================================================
-- USER ACTIVITY INDEXES
-- ============================================================================

-- Index for user's vote history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_created 
ON votes(user_id, created_at DESC);

-- Index for checking if user voted on a clip
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_votes_user_clip 
ON votes(user_id, clip_id);

-- Index for user's comment history
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_comments_user_created 
ON comments(user_id, is_removed, created_at DESC);

-- ============================================================================
-- FAVORITE INDEXES
-- ============================================================================

-- Composite index for user's favorites with clip data
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user_created 
ON favorites(user_id, created_at DESC);

-- Index for checking if clip is favorited
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user_clip 
ON favorites(user_id, clip_id);

-- ============================================================================
-- TAG INDEXES FOR SEARCH AND FILTERING
-- ============================================================================

-- Index for popular tags (by usage count)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tags_clip_count 
ON tags(clip_count DESC, name);

-- Index for clip-tag relationship lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clip_tags_tag 
ON clip_tags(tag_id, clip_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clip_tags_clip 
ON clip_tags(clip_id, tag_id);

-- ============================================================================
-- ANALYTICS INDEXES
-- ============================================================================

-- Index for clip view tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clip_analytics_clip_date 
ON clip_analytics(clip_id, date DESC);

-- Index for trending analysis
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clip_analytics_date_views 
ON clip_analytics(date DESC, view_count DESC);

-- ============================================================================
-- NOTIFICATION INDEXES
-- ============================================================================

-- Index for user's unread notifications
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read, created_at DESC) 
WHERE is_read = false;

-- Index for notification delivery
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- ============================================================================
-- SUBMISSION INDEXES
-- ============================================================================

-- Index for user's submissions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_user_created 
ON submissions(user_id, created_at DESC);

-- Index for pending submissions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submissions_status 
ON submissions(status, created_at DESC);

-- ============================================================================
-- REPUTATION INDEXES
-- ============================================================================

-- Index for reputation events by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reputation_events_user_created 
ON reputation_events(user_id, created_at DESC);

-- Index for recent reputation events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reputation_events_created 
ON reputation_events(created_at DESC);

-- ============================================================================
-- SUBSCRIPTION INDEXES
-- ============================================================================

-- Index for active subscriptions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_user_status 
ON subscriptions(user_id, status) 
WHERE status IN ('active', 'trialing');

-- Index for subscription expiration monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_current_period_end 
ON subscriptions(current_period_end ASC, status) 
WHERE status IN ('active', 'trialing');

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES
-- ============================================================================

-- Check index usage
-- Run this to see which indexes are being used and which might be redundant
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Find missing indexes (queries with sequential scans)
SELECT 
    schemaname,
    tablename,
    seq_scan,
    seq_tup_read,
    idx_scan,
    seq_tup_read / seq_scan as avg_seq_tup_read
FROM pg_stat_user_tables
WHERE schemaname = 'public' 
    AND seq_scan > 0
ORDER BY seq_tup_read DESC;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- VACUUM AND ANALYZE
-- ============================================================================

-- Run ANALYZE to update statistics for query planner
ANALYZE;

-- Run VACUUM to reclaim space (do this during low traffic)
-- VACUUM ANALYZE;

-- ============================================================================
-- QUERY PLAN EXAMPLES
-- ============================================================================

-- Example: Analyze a slow query
-- EXPLAIN (ANALYZE, BUFFERS) 
-- SELECT * FROM clips 
-- WHERE is_removed = false 
-- ORDER BY vote_score DESC, created_at DESC 
-- LIMIT 50;

-- Look for:
-- - Sequential Scans (should use indexes instead)
-- - High execution time
-- - High buffer usage
-- - Nested loops with large datasets (consider hash joins)

-- ============================================================================
-- CONNECTION POOL MONITORING
-- ============================================================================

-- Monitor active connections
SELECT 
    datname,
    usename,
    application_name,
    client_addr,
    state,
    count(*) as connection_count
FROM pg_stat_activity
WHERE datname IS NOT NULL
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY connection_count DESC;

-- Check for long-running queries
SELECT 
    pid,
    now() - query_start as duration,
    state,
    query
FROM pg_stat_activity
WHERE state != 'idle'
    AND now() - query_start > interval '1 second'
ORDER BY duration DESC;
