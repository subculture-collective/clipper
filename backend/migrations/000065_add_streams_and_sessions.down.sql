-- Drop trigger and function
DROP TRIGGER IF EXISTS update_streams_updated_at_trigger ON streams;
DROP FUNCTION IF EXISTS update_streams_updated_at();

-- Drop tables
DROP TABLE IF EXISTS stream_sessions;
DROP TABLE IF EXISTS streams;
