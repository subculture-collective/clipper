-- Rollback: Drop channel moderators table

-- Drop indexes first
DROP INDEX IF EXISTS idx_channel_moderators_moderator;
DROP INDEX IF EXISTS idx_channel_moderators_channel;
DROP INDEX IF EXISTS idx_channel_moderators_unique;

-- Drop table
DROP TABLE IF EXISTS channel_moderators;
