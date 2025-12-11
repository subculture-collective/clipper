-- Add broadcaster sync status tracking table
CREATE TABLE IF NOT EXISTS broadcaster_sync_status (
    broadcaster_id VARCHAR(100) PRIMARY KEY,
    is_live BOOLEAN DEFAULT false,
    stream_started_at TIMESTAMP,
    last_synced TIMESTAMP NOT NULL DEFAULT NOW(),
    game_name VARCHAR(255),
    viewer_count INT DEFAULT 0,
    stream_title VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for querying by last_synced
CREATE INDEX IF NOT EXISTS idx_broadcaster_sync_status_last_synced ON broadcaster_sync_status(last_synced);

-- Add index for querying live broadcasters
CREATE INDEX IF NOT EXISTS idx_broadcaster_sync_status_is_live ON broadcaster_sync_status(is_live);

-- Add broadcaster sync log table for tracking sync events
CREATE TABLE IF NOT EXISTS broadcaster_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcaster_id VARCHAR(100) NOT NULL,
    sync_time TIMESTAMP NOT NULL DEFAULT NOW(),
    status_change VARCHAR(50),
    error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Add index for querying logs by broadcaster
CREATE INDEX IF NOT EXISTS idx_broadcaster_sync_log_broadcaster_id ON broadcaster_sync_log(broadcaster_id);

-- Add index for querying logs by time
CREATE INDEX IF NOT EXISTS idx_broadcaster_sync_log_sync_time ON broadcaster_sync_log(sync_time DESC);

-- Add trigger to update updated_at timestamp on broadcaster_sync_status
CREATE OR REPLACE FUNCTION update_broadcaster_sync_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_broadcaster_sync_status_updated_at_trigger
    BEFORE UPDATE ON broadcaster_sync_status
    FOR EACH ROW
    EXECUTE FUNCTION update_broadcaster_sync_status_updated_at();
