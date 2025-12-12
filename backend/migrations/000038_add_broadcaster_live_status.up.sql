-- Add broadcaster live status tracking table
CREATE TABLE IF NOT EXISTS broadcaster_live_status (
    broadcaster_id VARCHAR(100) PRIMARY KEY,
    user_login VARCHAR(100),
    user_name VARCHAR(100),
    is_live BOOLEAN DEFAULT false,
    stream_title VARCHAR(255),
    game_name VARCHAR(255),
    viewer_count INT DEFAULT 0,
    started_at TIMESTAMP,
    last_checked TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for querying live broadcasters
CREATE INDEX IF NOT EXISTS idx_broadcaster_live_status_is_live ON broadcaster_live_status(is_live);

-- Add index for last_checked for efficient polling
CREATE INDEX IF NOT EXISTS idx_broadcaster_live_status_last_checked ON broadcaster_live_status(last_checked);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_broadcaster_live_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_broadcaster_live_status_updated_at_trigger
    BEFORE UPDATE ON broadcaster_live_status
    FOR EACH ROW
    EXECUTE FUNCTION update_broadcaster_live_status_updated_at();
