-- Add index for discussed sorting (by comment_count)
CREATE INDEX IF NOT EXISTS idx_clips_comment_count ON clips(comment_count DESC, created_at DESC) WHERE is_removed = false;

-- Create table for top streamers tracking
-- This table will store the top 10k streamers by view count or follower count
-- It can be updated periodically via a sync job
CREATE TABLE IF NOT EXISTS top_streamers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcaster_id VARCHAR(50) UNIQUE NOT NULL,
    broadcaster_name VARCHAR(100) NOT NULL,
    rank INT NOT NULL,
    follower_count BIGINT DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_top_streamers_rank ON top_streamers(rank ASC);
CREATE INDEX IF NOT EXISTS idx_top_streamers_broadcaster_id ON top_streamers(broadcaster_id);

-- Add composite index for filtering by top streamers
CREATE INDEX IF NOT EXISTS idx_clips_broadcaster_discussed ON clips(broadcaster_id, comment_count DESC) WHERE is_removed = false;
