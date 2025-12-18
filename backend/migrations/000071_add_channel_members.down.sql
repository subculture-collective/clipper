-- Drop indexes
DROP INDEX IF EXISTS idx_channel_permissions_type;
DROP INDEX IF EXISTS idx_channel_permissions_channel;
DROP INDEX IF EXISTS idx_channel_members_role;
DROP INDEX IF EXISTS idx_channel_members_user;
DROP INDEX IF EXISTS idx_channel_members_channel;

-- Drop tables
DROP TABLE IF EXISTS channel_permissions;
DROP TABLE IF EXISTS channel_members;
