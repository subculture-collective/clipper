-- Create channel_members table
CREATE TABLE IF NOT EXISTS channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Create channel_permissions table for granular permissions
CREATE TABLE IF NOT EXISTS channel_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN ('view', 'send_messages', 'invite_members', 'manage_members', 'manage_settings', 'delete_messages')),
    role_required VARCHAR(20) NOT NULL CHECK (role_required IN ('owner', 'admin', 'member')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(channel_id, permission_type)
);

-- Create indexes for performance
CREATE INDEX idx_channel_members_channel ON channel_members(channel_id);
CREATE INDEX idx_channel_members_user ON channel_members(user_id);
CREATE INDEX idx_channel_members_role ON channel_members(channel_id, role);

CREATE INDEX idx_channel_permissions_channel ON channel_permissions(channel_id);
CREATE INDEX idx_channel_permissions_type ON channel_permissions(channel_id, permission_type);

-- Add default permissions for existing channels
-- Public channels: everyone can view and send messages
INSERT INTO channel_permissions (channel_id, permission_type, role_required)
SELECT id, 'view', 'member' FROM chat_channels WHERE channel_type = 'public'
ON CONFLICT (channel_id, permission_type) DO NOTHING;

INSERT INTO channel_permissions (channel_id, permission_type, role_required)
SELECT id, 'send_messages', 'member' FROM chat_channels WHERE channel_type = 'public'
ON CONFLICT (channel_id, permission_type) DO NOTHING;

-- Private channels: only members can view and send messages
INSERT INTO channel_permissions (channel_id, permission_type, role_required)
SELECT id, 'view', 'member' FROM chat_channels WHERE channel_type = 'private'
ON CONFLICT (channel_id, permission_type) DO NOTHING;

INSERT INTO channel_permissions (channel_id, permission_type, role_required)
SELECT id, 'send_messages', 'member' FROM chat_channels WHERE channel_type = 'private'
ON CONFLICT (channel_id, permission_type) DO NOTHING;

-- Add creators of existing channels as owners
INSERT INTO channel_members (channel_id, user_id, role)
SELECT id, creator_id, 'owner' FROM chat_channels
ON CONFLICT (channel_id, user_id) DO NOTHING;
