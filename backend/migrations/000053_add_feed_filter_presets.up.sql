-- Create user_filter_presets table for saving feed filter configurations
CREATE TABLE IF NOT EXISTS user_filter_presets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    filters_json JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT user_filter_presets_user_limit CHECK (
        (SELECT COUNT(*) FROM user_filter_presets WHERE user_id = user_filter_presets.user_id) <= 10
    )
);

-- Create indexes for filter presets
CREATE INDEX idx_user_filter_presets_user_id ON user_filter_presets(user_id, created_at DESC);

-- Add performance indexes for clip filtering
-- Index for game filtering with date range
CREATE INDEX IF NOT EXISTS idx_clips_game_created ON clips(game_id, created_at DESC) WHERE is_removed = false AND is_hidden = false;

-- Index for broadcaster filtering with date range
CREATE INDEX IF NOT EXISTS idx_clips_broadcaster_created ON clips(broadcaster_id, created_at DESC) WHERE is_removed = false AND is_hidden = false;

-- Index for language filtering
CREATE INDEX IF NOT EXISTS idx_clips_language ON clips(language) WHERE is_removed = false AND is_hidden = false;

-- Composite index for trending sort (vote_score + created_at)
CREATE INDEX IF NOT EXISTS idx_clips_trending ON clips(vote_score DESC, created_at DESC) WHERE is_removed = false AND is_hidden = false;

-- Index for most commented sort
CREATE INDEX IF NOT EXISTS idx_clips_discussed ON clips(comment_count DESC, created_at DESC) WHERE is_removed = false AND is_hidden = false;

-- Index for clip_tags to support tag filtering
CREATE INDEX IF NOT EXISTS idx_clip_tags_tag_clip ON clip_tags(tag_id, clip_id);
