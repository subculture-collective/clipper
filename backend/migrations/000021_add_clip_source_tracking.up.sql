-- Add source type enum for clips
CREATE TYPE clip_source_type AS ENUM ('user_submitted', 'auto_synced', 'staff_pick');

-- Add source tracking and engagement scoring to clips table
ALTER TABLE clips
ADD COLUMN source_type clip_source_type NOT NULL DEFAULT 'auto_synced',
ADD COLUMN engagement_score DECIMAL(12, 2) NOT NULL DEFAULT 0.0;

-- Create index for filtering by source type
CREATE INDEX idx_clips_source_type ON clips(source_type);

-- Create index for sorting by engagement score
CREATE INDEX idx_clips_engagement_score ON clips(engagement_score DESC);

-- Create composite index for common queries (source + engagement)
CREATE INDEX idx_clips_source_engagement ON clips(source_type, engagement_score DESC);

-- Update existing user-submitted clips by matching approved submissions
UPDATE clips c
SET source_type = 'user_submitted'
WHERE EXISTS (
		SELECT 1 FROM clip_submissions s
		WHERE s.twitch_clip_id = c.twitch_clip_id
			AND s.status = 'approved'
);

-- Clear out auto-synced clips to start fresh with new top 1000 strategy
DELETE FROM clips WHERE source_type = 'auto_synced';

-- Comment for clarity
COMMENT ON COLUMN clips.source_type IS 'Source of the clip: user_submitted, auto_synced (discovery), or staff_pick';
COMMENT ON COLUMN clips.engagement_score IS 'Weighted engagement score calculated from votes, comments, favorites, and platform views';
