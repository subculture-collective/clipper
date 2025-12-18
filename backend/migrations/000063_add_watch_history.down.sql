-- Drop cleanup function
DROP FUNCTION IF EXISTS cleanup_watch_history();

-- Drop indexes
DROP INDEX IF EXISTS idx_watch_history_completed;
DROP INDEX IF EXISTS idx_watch_history_clip;
DROP INDEX IF EXISTS idx_watch_history_user;

-- Drop watch_history table
DROP TABLE IF EXISTS watch_history;

-- Remove watch_history_enabled column from users table
ALTER TABLE users DROP COLUMN IF EXISTS watch_history_enabled;
