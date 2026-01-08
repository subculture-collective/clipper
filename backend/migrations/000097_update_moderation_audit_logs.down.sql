-- Rollback moderation_audit_logs table updates
-- Restores entity_type/entity_id pattern and removes new columns

-- Re-add old columns
ALTER TABLE moderation_audit_logs
ADD COLUMN entity_type VARCHAR(50),
ADD COLUMN entity_id UUID,
ADD COLUMN moderator_id UUID;

-- Migrate data back: copy actor_id to moderator_id
UPDATE moderation_audit_logs
SET moderator_id = actor_id;

-- For records with target_user_id, set entity_type to 'user' and copy to entity_id
UPDATE moderation_audit_logs
SET entity_type = 'user', entity_id = target_user_id
WHERE target_user_id IS NOT NULL;

-- For records without target_user_id, set a default entity_type
UPDATE moderation_audit_logs
SET entity_type = 'unknown'
WHERE entity_type IS NULL;

-- Make old columns NOT NULL after data migration
ALTER TABLE moderation_audit_logs
ALTER COLUMN entity_type SET NOT NULL,
ALTER COLUMN moderator_id SET NOT NULL;

-- Drop new foreign key constraints
ALTER TABLE moderation_audit_logs
DROP CONSTRAINT IF EXISTS moderation_audit_logs_actor_id_fkey;

ALTER TABLE moderation_audit_logs
DROP CONSTRAINT IF EXISTS moderation_audit_logs_target_user_id_fkey;

-- Restore old foreign key constraint
ALTER TABLE moderation_audit_logs
ADD CONSTRAINT moderation_audit_logs_moderator_id_fkey
FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE;

-- Drop new indexes
DROP INDEX IF EXISTS idx_audit_logs_actor;
DROP INDEX IF EXISTS idx_audit_logs_target;
DROP INDEX IF EXISTS idx_audit_logs_channel;

-- Recreate old indexes
CREATE INDEX idx_audit_logs_moderator ON moderation_audit_logs(moderator_id);
CREATE INDEX idx_audit_logs_entity ON moderation_audit_logs(entity_type, entity_id);

-- Drop new columns
ALTER TABLE moderation_audit_logs
DROP COLUMN actor_id,
DROP COLUMN target_user_id,
DROP COLUMN channel_id,
DROP COLUMN ip_address,
DROP COLUMN user_agent;
