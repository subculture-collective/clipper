-- Create chat_channels table
CREATE TABLE IF NOT EXISTS chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL DEFAULT 'public', -- public, private, direct
    is_active BOOLEAN DEFAULT true,
    max_participants INT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create chat_bans table
CREATE TABLE IF NOT EXISTS chat_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(channel_id, user_id)
);

-- Create chat_moderation_log table
CREATE TABLE IF NOT EXISTS chat_moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_chat_channels_creator ON chat_channels(creator_id);
CREATE INDEX idx_chat_channels_active ON chat_channels(is_active) WHERE is_active = true;

CREATE INDEX idx_chat_messages_channel ON chat_messages(channel_id, created_at DESC);
CREATE INDEX idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_not_deleted ON chat_messages(channel_id) WHERE is_deleted = false;

CREATE INDEX idx_chat_bans_channel_user ON chat_bans(channel_id, user_id);
-- Active bans (null expiry or future) without non-immutable predicates
CREATE INDEX idx_chat_bans_active ON chat_bans(channel_id, user_id, expires_at);
CREATE INDEX idx_chat_bans_expires ON chat_bans(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_chat_moderation_log_channel ON chat_moderation_log(channel_id, created_at DESC);
CREATE INDEX idx_chat_moderation_log_moderator ON chat_moderation_log(moderator_id);
CREATE INDEX idx_chat_moderation_log_target ON chat_moderation_log(target_user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_channels_updated_at BEFORE UPDATE ON chat_channels
    FOR EACH ROW EXECUTE FUNCTION update_chat_updated_at_column();

CREATE TRIGGER update_chat_messages_updated_at BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION update_chat_updated_at_column();
