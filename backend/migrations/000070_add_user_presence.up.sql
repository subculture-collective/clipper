-- Create user_presence table for tracking online users and typing indicators
CREATE TABLE IF NOT EXISTS user_presence (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'online', -- online, offline, typing
    last_seen TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, channel_id)
);

-- Create indexes for performance
CREATE INDEX idx_user_presence_channel ON user_presence(channel_id, status);
CREATE INDEX idx_user_presence_user ON user_presence(user_id);
CREATE INDEX idx_user_presence_last_seen ON user_presence(last_seen);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_user_presence_updated_at BEFORE UPDATE ON user_presence
    FOR EACH ROW EXECUTE FUNCTION update_chat_updated_at_column();
