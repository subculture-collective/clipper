-- Create channel_members table for tracking channel membership and roles
CREATE TABLE IF NOT EXISTS channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(channel_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id, role);
CREATE INDEX idx_channel_members_user ON channel_members(user_id);
CREATE INDEX idx_channel_members_joined ON channel_members(joined_at DESC);

-- Add comments for documentation
COMMENT ON TABLE channel_members IS 'Tracks membership and roles in chat channels';
COMMENT ON COLUMN channel_members.role IS 'User role in the channel: owner (creator), admin (elevated), moderator, or member';
COMMENT ON COLUMN channel_members.invited_by IS 'User who invited this member (NULL for owner/self-join)';
