-- Drop function
DROP FUNCTION IF EXISTS refresh_events_hourly_metrics();

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS events_hourly_metrics;

-- Drop indexes
DROP INDEX IF EXISTS idx_events_timestamp;
DROP INDEX IF EXISTS idx_events_type_time;
DROP INDEX IF EXISTS idx_events_session;
DROP INDEX IF EXISTS idx_events_user_type;

-- Drop events table
DROP TABLE IF EXISTS events;
