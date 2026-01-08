-- Rollback: remove context fields from moderation_audit_logs

-- Drop indexes
DROP INDEX IF EXISTS idx_audit_logs_ip_address;
DROP INDEX IF EXISTS idx_audit_logs_channel;

-- Drop columns
ALTER TABLE moderation_audit_logs
DROP COLUMN IF EXISTS channel_id,
DROP COLUMN IF EXISTS user_agent,
DROP COLUMN IF EXISTS ip_address;
