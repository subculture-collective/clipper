-- Migration: Rollback performance indexes for moderation queries
-- Description: Drops the performance indexes added in the up migration

-- Drop index on moderation_audit_logs(actor_id, created_at)
DROP INDEX IF EXISTS idx_audit_logs_actor_created;

-- Drop index on twitch_bans(channel_id, banned_user_id)
DROP INDEX IF EXISTS idx_twitch_bans_channel_user;
