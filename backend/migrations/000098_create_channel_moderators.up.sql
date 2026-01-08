-- Migration: Create channel moderators table
-- Description: Creates junction table linking chat channels to their moderators

CREATE TABLE IF NOT EXISTS channel_moderators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique constraint: prevent duplicate active moderator assignments
CREATE UNIQUE INDEX idx_channel_moderators_unique ON channel_moderators(channel_id, moderator_id) WHERE is_active = true;

-- Index for efficient "who moderates this channel" queries
CREATE INDEX idx_channel_moderators_channel ON channel_moderators(channel_id) WHERE is_active = true;

-- Index for efficient "what channels does this user moderate" queries
CREATE INDEX idx_channel_moderators_moderator ON channel_moderators(moderator_id) WHERE is_active = true;

-- Add comments for documentation
COMMENT ON TABLE channel_moderators IS 'Junction table linking chat channels to their moderators';
COMMENT ON COLUMN channel_moderators.channel_id IS 'Reference to the chat channel';
COMMENT ON COLUMN channel_moderators.moderator_id IS 'Reference to the user who is a moderator';
COMMENT ON COLUMN channel_moderators.is_active IS 'Whether the moderator assignment is currently active';
COMMENT ON COLUMN channel_moderators.created_at IS 'Timestamp when the moderator was assigned';
