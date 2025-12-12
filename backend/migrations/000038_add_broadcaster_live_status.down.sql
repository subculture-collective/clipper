-- Drop broadcaster live status table and related objects
DROP TRIGGER IF EXISTS update_broadcaster_live_status_updated_at_trigger ON broadcaster_live_status;
DROP FUNCTION IF EXISTS update_broadcaster_live_status_updated_at();
DROP INDEX IF EXISTS idx_broadcaster_live_status_last_checked;
DROP INDEX IF EXISTS idx_broadcaster_live_status_is_live;
DROP TABLE IF EXISTS broadcaster_live_status;
