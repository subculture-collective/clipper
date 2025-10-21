-- Database health check queries
-- These queries can be used to verify database connectivity and schema integrity

-- Check if all expected tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'clips', 'votes', 'comments', 'comment_votes', 
                            'favorites', 'tags', 'clip_tags', 'reports') 
        THEN 'OK'
        ELSE 'UNEXPECTED'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name != 'schema_migrations'
ORDER BY table_name;

-- Check if all expected views exist
SELECT 
    table_name as view_name,
    CASE 
        WHEN table_name IN ('hot_clips', 'top_clips', 'new_clips', 'trending_clips')
        THEN 'OK'
        ELSE 'UNEXPECTED'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_type = 'VIEW'
ORDER BY table_name;

-- Check if all expected custom functions exist
SELECT 
    routine_name as function_name,
    CASE 
        WHEN routine_name IN ('calculate_hot_score', 'update_updated_at_column',
                              'update_clip_vote_score', 'update_comment_vote_score',
                              'update_clip_comment_count', 'update_clip_favorite_count',
                              'update_tag_usage_count')
        THEN 'OK'
        ELSE 'UNEXPECTED'
    END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
  AND routine_name NOT LIKE 'pg_%'
  AND routine_name NOT LIKE '%armor%'
  AND routine_name NOT LIKE '%crypt%'
  AND routine_name NOT LIKE '%decrypt%'
  AND routine_name NOT LIKE '%encrypt%'
  AND routine_name NOT LIKE '%digest%'
  AND routine_name NOT LIKE '%hmac%'
  AND routine_name NOT LIKE '%salt%'
  AND routine_name NOT LIKE '%gen_random%'
ORDER BY routine_name;

-- Check table row counts (useful for monitoring)
SELECT 
    'users' as table_name, COUNT(*) as row_count FROM users
UNION ALL
SELECT 'clips', COUNT(*) FROM clips
UNION ALL
SELECT 'votes', COUNT(*) FROM votes
UNION ALL
SELECT 'comments', COUNT(*) FROM comments
UNION ALL
SELECT 'comment_votes', COUNT(*) FROM comment_votes
UNION ALL
SELECT 'favorites', COUNT(*) FROM favorites
UNION ALL
SELECT 'tags', COUNT(*) FROM tags
UNION ALL
SELECT 'clip_tags', COUNT(*) FROM clip_tags
UNION ALL
SELECT 'reports', COUNT(*) FROM reports;

-- Check database size
SELECT 
    pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Check for any long-running queries (useful for debugging)
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
  AND state != 'idle';
