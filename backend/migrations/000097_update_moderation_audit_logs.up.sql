-- Update moderation_audit_logs table to support comprehensive audit logging
-- Adds actor_id, target_user_id, channel_id, ip_address, user_agent
-- NOTE: This migration adds new columns alongside existing ones for backward compatibility.
-- Old columns (entity_type, entity_id, moderator_id) will be dropped in a future migration
-- after application code has been updated to use the new schema.

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
-- This preserves user-related audit logs in the new schema
UPDATE moderation_audit_logs
SET target_user_id = entity_id
WHERE entity_type = 'user';

-- Note: Non-user entity types (clip_submission, clip, comment) are intentionally NOT
-- migrated to target_user_id as the new schema is user-focused. These records will
-- retain their entity_type/entity_id values for backward compatibility until the
-- application is updated to handle non-user entities differently (e.g., via metadata).

-- Make actor_id NOT NULL after data migration
ALTER TABLE moderation_audit_logs
ALTER COLUMN actor_id SET NOT NULL;

-- Add new foreign key constraints
ALTER TABLE moderation_audit_logs
ADD CONSTRAINT moderation_audit_logs_actor_id_fkey
FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE RESTRICT;

ALTER TABLE moderation_audit_logs
ADD CONSTRAINT moderation_audit_logs_target_user_id_fkey
FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create new indexes as specified in the issue
CREATE INDEX idx_audit_logs_actor ON moderation_audit_logs(actor_id);
CREATE INDEX idx_audit_logs_target ON moderation_audit_logs(target_user_id);
CREATE INDEX idx_audit_logs_channel ON moderation_audit_logs(channel_id);
-- Note: idx_audit_logs_action and idx_audit_logs_created already exist from migration 000011

-- DO NOT drop old columns (entity_type, entity_id, moderator_id) yet.
-- Application code (models, repositories, services, tests) still depends on these
-- columns. They must only be dropped in a later migration after all code has
-- been updated to use actor_id, target_user_id, channel_id, ip_address, user_agent.
-- Intentionally left in place to maintain backward compatibility.
