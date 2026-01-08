-- Migration: Create community moderators table
-- Description: Creates table for tracking community moderators and their channel assignments

CREATE TABLE IF NOT EXISTS community_moderators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL,
    granted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    granted_at TIMESTAMP NOT NULL DEFAULT now(),
    revoked_at TIMESTAMP,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE(user_id, channel_id)
);

-- Indexes for performance queries
CREATE INDEX idx_community_moderators_user ON community_moderators(user_id);
CREATE INDEX idx_community_moderators_channel ON community_moderators(channel_id);
CREATE INDEX idx_community_moderators_active ON community_moderators(revoked_at) WHERE revoked_at IS NULL;

-- Add comments for documentation
COMMENT ON TABLE community_moderators IS 'Tracks community moderator assignments and their channel roles';
COMMENT ON COLUMN community_moderators.user_id IS 'User who has been granted moderator privileges';
COMMENT ON COLUMN community_moderators.channel_id IS 'Channel or community where moderator privileges apply';
COMMENT ON COLUMN community_moderators.granted_by IS 'User who granted the moderator privileges';
COMMENT ON COLUMN community_moderators.granted_at IS 'Timestamp when moderator privileges were granted';
COMMENT ON COLUMN community_moderators.revoked_at IS 'Timestamp when moderator privileges were revoked (NULL if still active)';
COMMENT ON COLUMN community_moderators.reason IS 'Optional reason for granting or revoking moderator privileges';
