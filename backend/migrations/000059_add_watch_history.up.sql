-- Add watch_history_enabled column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS watch_history_enabled BOOLEAN DEFAULT TRUE;

-- Create watch_history table
CREATE TABLE IF NOT EXISTS watch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    progress_seconds INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    session_id VARCHAR(100),
    watched_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, clip_id)
);

-- Create indexes for watch history
CREATE INDEX IF NOT EXISTS idx_watch_history_user ON watch_history(user_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_history_clip ON watch_history(clip_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_completed ON watch_history(user_id, completed, watched_at DESC);

-- Add comments to table and columns
COMMENT ON TABLE watch_history IS 'Tracks user watch history with playback progress and completion status';
COMMENT ON COLUMN watch_history.progress_seconds IS 'Last playback position in seconds';
COMMENT ON COLUMN watch_history.duration_seconds IS 'Total duration of clip in seconds';
COMMENT ON COLUMN watch_history.completed IS 'True if user watched >90% of clip';
COMMENT ON COLUMN watch_history.session_id IS 'Unique session identifier for grouping watch events';
COMMENT ON COLUMN watch_history.watched_at IS 'Last time the clip was watched';

-- Auto-cleanup old history (keep last 90 days or 1000 entries per user)
CREATE OR REPLACE FUNCTION cleanup_watch_history()
RETURNS void AS $$
BEGIN
    -- Delete entries older than 90 days
    DELETE FROM watch_history
    WHERE watched_at < NOW() - INTERVAL '90 days';
    
    -- For each user, keep only the most recent 1000 entries
    DELETE FROM watch_history
    WHERE id IN (
        SELECT id FROM (
            SELECT id, user_id,
                   ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY watched_at DESC) as row_num
            FROM watch_history
        ) ranked
        WHERE row_num > 1000
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_watch_history IS 'Removes watch history older than 90 days or beyond the 1000 most recent entries per user';
