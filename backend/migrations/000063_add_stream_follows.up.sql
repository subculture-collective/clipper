-- Add stream_follows table for users to follow streamers and receive notifications
CREATE TABLE IF NOT EXISTS stream_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streamer_username VARCHAR(100) NOT NULL,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, streamer_username)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_stream_follows_user ON stream_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_stream_follows_streamer ON stream_follows(streamer_username, notifications_enabled) WHERE notifications_enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_stream_follows_created ON stream_follows(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stream_follows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stream_follows_updated_at_trigger
    BEFORE UPDATE ON stream_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_stream_follows_updated_at();

-- Add notification preference for stream live alerts
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS notify_stream_live BOOLEAN DEFAULT TRUE;

COMMENT ON TABLE stream_follows IS 'Tracks which users follow which streamers for live notifications';
COMMENT ON COLUMN stream_follows.notifications_enabled IS 'Whether user wants to receive notifications when this streamer goes live';
COMMENT ON COLUMN notification_preferences.notify_stream_live IS 'Whether user wants to receive notifications when followed streamers go live';
