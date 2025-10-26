-- Clear all data from the database while preserving schema
-- This script truncates tables in the correct order to handle foreign key constraints

-- Disable triggers temporarily for faster truncation
SET session_replication_role = replica;

-- Clear analytics and tracking data
TRUNCATE TABLE page_views, clip_views, search_queries CASCADE;

-- Clear notification system
TRUNCATE TABLE notifications CASCADE;

-- Clear reputation system
TRUNCATE TABLE reputation_history CASCADE;

-- Clear clip submissions
TRUNCATE TABLE clip_submissions CASCADE;

-- Clear user interactions
TRUNCATE TABLE reports CASCADE;
TRUNCATE TABLE clip_tags CASCADE;
TRUNCATE TABLE tags CASCADE;
TRUNCATE TABLE favorites CASCADE;
TRUNCATE TABLE comment_votes CASCADE;
TRUNCATE TABLE comments CASCADE;
TRUNCATE TABLE votes CASCADE;

-- Clear clips
TRUNCATE TABLE clips CASCADE;

-- Clear authentication
TRUNCATE TABLE refresh_tokens CASCADE;

-- Clear users (this will cascade to all related data)
TRUNCATE TABLE users CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Refresh materialized views
REFRESH MATERIALIZED VIEW CONCURRENTLY hot_clips;

-- Vacuum to reclaim space
VACUUM ANALYZE;

SELECT 'Database cleared successfully!' as status;
