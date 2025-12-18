-- Remove notification preference
ALTER TABLE notification_preferences DROP COLUMN IF EXISTS notify_stream_live;

-- Drop trigger and function
DROP TRIGGER IF EXISTS update_stream_follows_updated_at_trigger ON stream_follows;
DROP FUNCTION IF EXISTS update_stream_follows_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_stream_follows_created;
DROP INDEX IF EXISTS idx_stream_follows_streamer;
DROP INDEX IF EXISTS idx_stream_follows_user;

-- Drop table
DROP TABLE IF EXISTS stream_follows;
