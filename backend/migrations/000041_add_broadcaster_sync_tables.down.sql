-- Drop triggers and functions
DROP TRIGGER IF EXISTS update_broadcaster_sync_status_updated_at_trigger ON broadcaster_sync_status;
DROP FUNCTION IF EXISTS update_broadcaster_sync_status_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_broadcaster_sync_log_sync_time;
DROP INDEX IF EXISTS idx_broadcaster_sync_log_broadcaster_id;
DROP INDEX IF EXISTS idx_broadcaster_sync_status_is_live;
DROP INDEX IF EXISTS idx_broadcaster_sync_status_last_synced;

-- Drop tables
DROP TABLE IF EXISTS broadcaster_sync_log;
DROP TABLE IF EXISTS broadcaster_sync_status;
