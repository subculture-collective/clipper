-- Remove moderator scope columns from users table
DROP INDEX IF EXISTS idx_users_moderation_channels;
DROP INDEX IF EXISTS idx_users_moderator_scope;

ALTER TABLE users DROP CONSTRAINT IF EXISTS check_moderator_scope;

ALTER TABLE users DROP COLUMN IF EXISTS moderation_started_at;
ALTER TABLE users DROP COLUMN IF EXISTS moderation_channels;
ALTER TABLE users DROP COLUMN IF EXISTS moderator_scope;
