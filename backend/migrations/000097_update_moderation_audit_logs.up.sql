-- Update moderation_audit_logs table to support comprehensive audit logging
-- Adds actor_id, target_user_id, channel_id, ip_address, user_agent
-- Replaces entity_type/entity_id pattern with more specific columns

-- Add new columns
ALTER TABLE moderation_audit_logs
ADD COLUMN actor_id UUID,
ADD COLUMN target_user_id UUID,
ADD COLUMN channel_id UUID,
ADD COLUMN ip_address INET,
ADD COLUMN user_agent TEXT;

-- Migrate existing data: copy moderator_id to actor_id
UPDATE moderation_audit_logs
SET actor_id = moderator_id;

-- For existing records where entity_type is 'user', copy entity_id to target_user_id
UPDATE moderation_audit_logs
SET target_user_id = entity_id
WHERE entity_type = 'user';

-- Make actor_id NOT NULL after data migration
ALTER TABLE moderation_audit_logs
ALTER COLUMN actor_id SET NOT NULL;

-- Drop old foreign key constraint on moderator_id
ALTER TABLE moderation_audit_logs
DROP CONSTRAINT IF EXISTS moderation_audit_logs_moderator_id_fkey;

-- Add new foreign key constraints
ALTER TABLE moderation_audit_logs
ADD CONSTRAINT moderation_audit_logs_actor_id_fkey
FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE moderation_audit_logs
ADD CONSTRAINT moderation_audit_logs_target_user_id_fkey
FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Drop old indexes
DROP INDEX IF EXISTS idx_audit_logs_moderator;
DROP INDEX IF EXISTS idx_audit_logs_entity;

-- Create new indexes as specified in the issue
CREATE INDEX idx_audit_logs_actor ON moderation_audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target ON moderation_audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_channel ON moderation_audit_logs(channel_id);
-- Note: idx_audit_logs_action and idx_audit_logs_created already exist from migration 000011

-- Drop old columns (entity_type, entity_id, moderator_id)
ALTER TABLE moderation_audit_logs
DROP COLUMN entity_type,
DROP COLUMN entity_id,
DROP COLUMN moderator_id;
