-- Add trending, hot, and popularity score columns to clips table
ALTER TABLE clips ADD COLUMN IF NOT EXISTS trending_score FLOAT DEFAULT 0;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS hot_score FLOAT DEFAULT 0;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS popularity_index INT DEFAULT 0;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS engagement_count INT DEFAULT 0;

-- Create indexes for efficient sorting by trending metrics
CREATE INDEX IF NOT EXISTS idx_clips_trending_score ON clips(trending_score DESC, created_at DESC) WHERE is_removed = false AND is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_clips_hot_score ON clips(hot_score DESC) WHERE is_removed = false AND is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_clips_popularity_index ON clips(popularity_index DESC, created_at DESC) WHERE is_removed = false AND is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_clips_engagement_count ON clips(engagement_count DESC) WHERE is_removed = false AND is_hidden = false;

-- Function to calculate trending score (engagement with recency decay)
-- Formula: (views + likes*2 + comments*3 + favorites*2) / age_in_hours
-- Returns higher scores for recent content with high engagement
CREATE OR REPLACE FUNCTION calculate_trending_score(
    view_count INT,
    vote_score INT,
    comment_count INT,
    favorite_count INT,
    created_at TIMESTAMP
) RETURNS FLOAT AS $$
DECLARE
    engagement FLOAT;
    age_hours FLOAT;
BEGIN
    -- Calculate total engagement (weighted by interaction value)
    engagement := view_count + (vote_score * 2) + (comment_count * 3) + (favorite_count * 2);
    
    -- Calculate age in hours
    age_hours := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0;
    
    -- Avoid division by zero, use minimum age of 1 hour
    IF age_hours < 1 THEN
        age_hours := 1;
    END IF;
    
    -- Return trending score (engagement divided by age with decay)
    RETURN engagement / age_hours;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate hot score (velocity-based trending)
-- Formula: current_engagement + (engagement_velocity * boost_factor)
-- This helps identify content that's gaining traction quickly
CREATE OR REPLACE FUNCTION calculate_hot_score_value(
    current_engagement INT,
    previous_engagement INT,
    hours_elapsed FLOAT
) RETURNS FLOAT AS $$
DECLARE
    velocity FLOAT;
BEGIN
    -- If no previous data or no time elapsed, return current engagement
    IF previous_engagement = 0 OR hours_elapsed = 0 THEN
        RETURN current_engagement::FLOAT;
    END IF;
    
    -- Calculate velocity (change in engagement per hour)
    velocity := (current_engagement - previous_engagement)::FLOAT / hours_elapsed;
    
    -- Return hot score (current engagement + velocity boost)
    -- Velocity is multiplied by 0.5 to give moderate boost to fast-growing content
    RETURN current_engagement + (velocity * 0.5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Initialize trending scores for existing clips
UPDATE clips 
SET 
    engagement_count = view_count + (vote_score * 2) + (comment_count * 3) + (favorite_count * 2),
    trending_score = calculate_trending_score(view_count, vote_score, comment_count, favorite_count, created_at),
    hot_score = calculate_trending_score(view_count, vote_score, comment_count, favorite_count, created_at),
    popularity_index = view_count + (vote_score * 2) + (comment_count * 3) + (favorite_count * 2)
WHERE is_removed = false;
