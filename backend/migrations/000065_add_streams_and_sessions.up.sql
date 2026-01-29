-- Add streams table for stream metadata and tracking
CREATE TABLE IF NOT EXISTS streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    streamer_username VARCHAR(100) NOT NULL UNIQUE,
    streamer_user_id VARCHAR(50),
    display_name VARCHAR(100),
    is_live BOOLEAN DEFAULT FALSE,
    last_went_live TIMESTAMP,
    last_went_offline TIMESTAMP,
    game_name VARCHAR(200),
    title TEXT,
    viewer_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for querying live streams
CREATE INDEX IF NOT EXISTS idx_streams_live ON streams(is_live, streamer_username);

-- Add index for streamer lookup
CREATE INDEX IF NOT EXISTS idx_streams_username ON streams(streamer_username);

-- Add stream sessions table for watch analytics
CREATE TABLE IF NOT EXISTS stream_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    watch_duration_seconds INT DEFAULT 0
);

-- Add indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user ON stream_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_stream ON stream_sessions(stream_id, started_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_streams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_streams_updated_at_trigger
    BEFORE UPDATE ON streams
    FOR EACH ROW
    EXECUTE FUNCTION update_streams_updated_at();
