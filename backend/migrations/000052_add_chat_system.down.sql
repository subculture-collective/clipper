-- Drop triggers
DROP TRIGGER IF EXISTS update_chat_messages_updated_at ON chat_messages;
DROP TRIGGER IF EXISTS update_chat_channels_updated_at ON chat_channels;

-- Drop function
DROP FUNCTION IF EXISTS update_chat_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_chat_moderation_log_target;
DROP INDEX IF EXISTS idx_chat_moderation_log_moderator;
DROP INDEX IF EXISTS idx_chat_moderation_log_channel;

DROP INDEX IF EXISTS idx_chat_bans_expires;
DROP INDEX IF EXISTS idx_chat_bans_active;
DROP INDEX IF EXISTS idx_chat_bans_channel_user;

DROP INDEX IF EXISTS idx_chat_messages_not_deleted;
DROP INDEX IF EXISTS idx_chat_messages_user;
DROP INDEX IF EXISTS idx_chat_messages_channel;

DROP INDEX IF EXISTS idx_chat_channels_active;
DROP INDEX IF EXISTS idx_chat_channels_creator;

-- Drop tables
DROP TABLE IF EXISTS chat_moderation_log;
DROP TABLE IF EXISTS chat_bans;
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_channels;
