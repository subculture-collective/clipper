-- Rollback moderation_audit_logs table updates
-- Removes new columns added in the up migration
-- NOTE: Since the up migration kept old columns for backward compatibility,
-- this rollback is simpler and doesn't need to restore them.

-- Drop new foreign key constraints
ALTER TABLE moderation_audit_logs
DROP CONSTRAINT IF EXISTS moderation_audit_logs_actor_id_fkey;

ALTER TABLE moderation_audit_logs
DROP CONSTRAINT IF EXISTS moderation_audit_logs_target_user_id_fkey;

-- Drop new indexes
DROP INDEX IF EXISTS idx_audit_logs_actor;
DROP INDEX IF EXISTS idx_audit_logs_target;
DROP INDEX IF EXISTS idx_audit_logs_channel;

-- Drop new columns
-- Note: Old columns (entity_type, entity_id, moderator_id) were never dropped in the up migration,
-- so they don't need to be restored here. The old indexes and constraints also remain intact.
ALTER TABLE moderation_audit_logs
DROP COLUMN actor_id,
DROP COLUMN target_user_id,
DROP COLUMN channel_id,
DROP COLUMN ip_address,
DROP COLUMN user_agent;
