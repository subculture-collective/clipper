-- Migration: Add performance indexes for moderation queries
-- Description: Creates additional indexes for common query patterns on moderation tables

-- Index on twitch_bans(channel_id, banned_user_id) for ban lookups
-- This complements the existing partial unique index (which only covers permanent bans)
-- and enables efficient lookups for all bans (both permanent and temporary)
CREATE INDEX IF NOT EXISTS idx_twitch_bans_channel_user ON twitch_bans(channel_id, banned_user_id);

-- Index on moderation_audit_logs(actor_id, created_at) for user activity queries
-- This enables efficient queries for "all actions by user X, ordered by time"
-- Common use case: moderator activity reports and audit trails
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON moderation_audit_logs(actor_id, created_at DESC);

-- Add comments for documentation
COMMENT ON INDEX idx_twitch_bans_channel_user IS 'Composite index for efficient ban lookups by channel and user (covers both permanent and temporary bans)';
COMMENT ON INDEX idx_audit_logs_actor_created IS 'Composite index for efficient user activity queries ordered by time';
