-- Create queue_items table for clip queue management
CREATE TABLE IF NOT EXISTS queue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    position INT NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    played_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, position)
);

-- Create indexes for queue operations
CREATE INDEX idx_queue_user_position ON queue_items(user_id, position);
CREATE INDEX idx_queue_clip ON queue_items(clip_id);
CREATE INDEX idx_queue_added_at ON queue_items(added_at);

-- Add comment to table
COMMENT ON TABLE queue_items IS 'Stores user clip queues for sequential playback';
COMMENT ON COLUMN queue_items.position IS '1-based position in queue, must be unique per user';
COMMENT ON COLUMN queue_items.played_at IS 'Timestamp when clip was played, NULL if not played yet';

-- Auto-cleanup stale queues function (removes old inactive queues)
CREATE OR REPLACE FUNCTION cleanup_stale_queues()
RETURNS void AS $$
BEGIN
    -- Delete queue items for users who haven't added items in 7 days
    -- and have more than 100 unplayed items (indicating abandoned queue)
    DELETE FROM queue_items 
    WHERE user_id IN (
        SELECT DISTINCT user_id 
        FROM queue_items
        WHERE added_at < NOW() - INTERVAL '7 days'
            AND played_at IS NULL
        GROUP BY user_id
        HAVING COUNT(*) > 100
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_stale_queues IS 'Removes stale queues that have been inactive for 7+ days with 100+ unplayed items';
