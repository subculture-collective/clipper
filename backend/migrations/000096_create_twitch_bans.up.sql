-- Migration: Create twitch_bans table
-- Description: Creates table for storing synced ban data from Twitch API. Tracks which users are banned from which channels.

CREATE TABLE IF NOT EXISTS twitch_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL,
    banned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    banned_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    synced_from_twitch BOOLEAN DEFAULT false,
    twitch_ban_id TEXT,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance queries
CREATE INDEX idx_twitch_bans_channel ON twitch_bans(channel_id);
CREATE INDEX idx_twitch_bans_user ON twitch_bans(banned_user_id);
CREATE INDEX idx_twitch_bans_permanent ON twitch_bans(expires_at) WHERE expires_at IS NULL;

-- Partial unique index for permanent bans only
-- Note: We only enforce uniqueness for permanent bans (expires_at IS NULL) in the database.
-- Temporary bans can overlap and are managed at the application level.
CREATE UNIQUE INDEX idx_twitch_bans_permanent_unique ON twitch_bans(channel_id, banned_user_id) WHERE expires_at IS NULL;

-- Add comments for documentation
COMMENT ON TABLE twitch_bans IS 'Stores synced ban data from Twitch API. Tracks which users are banned from which channels.';
COMMENT ON COLUMN twitch_bans.channel_id IS 'Twitch channel ID where the ban applies (stored as UUID for consistency)';
COMMENT ON COLUMN twitch_bans.banned_user_id IS 'User who has been banned';
COMMENT ON COLUMN twitch_bans.reason IS 'Reason for the ban (optional)';
COMMENT ON COLUMN twitch_bans.banned_at IS 'Timestamp when the ban was issued';
COMMENT ON COLUMN twitch_bans.expires_at IS 'Timestamp when the ban expires (NULL for permanent bans)';
COMMENT ON COLUMN twitch_bans.synced_from_twitch IS 'Whether this ban was synced from Twitch API';
COMMENT ON COLUMN twitch_bans.twitch_ban_id IS 'Ban ID from Twitch API (if synced)';
COMMENT ON COLUMN twitch_bans.last_synced_at IS 'Timestamp of last sync from Twitch API';
