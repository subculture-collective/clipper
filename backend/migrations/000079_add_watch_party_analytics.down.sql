-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS watch_party_analytics;

-- Drop indexes
DROP INDEX IF EXISTS idx_party_events_party_time;
DROP INDEX IF EXISTS idx_party_events_type;
DROP INDEX IF EXISTS idx_party_events_user;

-- Drop table
DROP TABLE IF EXISTS watch_party_events;
