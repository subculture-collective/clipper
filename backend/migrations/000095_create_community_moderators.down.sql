-- Rollback: Drop community moderators table and related objects

-- Drop indexes
DROP INDEX IF EXISTS idx_community_moderators_active;
DROP INDEX IF EXISTS idx_community_moderators_channel;
DROP INDEX IF EXISTS idx_community_moderators_user;

-- Drop table
DROP TABLE IF EXISTS community_moderators;
