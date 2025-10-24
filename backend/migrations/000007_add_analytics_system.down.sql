-- Drop triggers first
DROP TRIGGER IF EXISTS trigger_update_clip_analytics ON analytics_events;

-- Drop functions
DROP FUNCTION IF EXISTS update_clip_analytics();
DROP FUNCTION IF EXISTS initialize_creator_analytics();
DROP FUNCTION IF EXISTS update_creator_analytics_from_clips();

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS platform_analytics;
DROP TABLE IF EXISTS user_analytics;
DROP TABLE IF EXISTS creator_analytics;
DROP TABLE IF EXISTS clip_analytics;
DROP TABLE IF EXISTS daily_analytics;
DROP TABLE IF EXISTS analytics_events;
