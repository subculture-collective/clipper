-- User Preferences table
-- Stores user preferences for games, streamers, tags, and categories
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    favorite_games TEXT[] DEFAULT '{}',
    followed_streamers TEXT[] DEFAULT '{}',
    preferred_categories TEXT[] DEFAULT '{}',
    preferred_tags UUID[] DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_preferences_games ON user_preferences USING GIN(favorite_games);
CREATE INDEX idx_user_preferences_streamers ON user_preferences USING GIN(followed_streamers);
CREATE INDEX idx_user_preferences_categories ON user_preferences USING GIN(preferred_categories);
CREATE INDEX idx_user_preferences_tags ON user_preferences USING GIN(preferred_tags);

-- User Clip Interactions table
-- Tracks all user interactions with clips for recommendation engine
CREATE TABLE user_clip_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    interaction_type VARCHAR(20) NOT NULL, -- 'view', 'like', 'share', 'dwell', 'dislike'
    dwell_time INT, -- seconds watched
    timestamp TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, clip_id, interaction_type)
);

CREATE INDEX idx_user_interactions_user ON user_clip_interactions(user_id, timestamp DESC);
CREATE INDEX idx_user_interactions_clip ON user_clip_interactions(clip_id, interaction_type);
CREATE INDEX idx_user_interactions_type ON user_clip_interactions(interaction_type, timestamp DESC);

-- Trigger to update user_preferences.updated_at
CREATE OR REPLACE FUNCTION update_user_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preferences_timestamp
BEFORE UPDATE ON user_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_preferences_timestamp();

-- Automatically populate user preferences based on interactions
-- This function analyzes recent interactions and updates user preferences
CREATE OR REPLACE FUNCTION update_user_preferences_from_interactions(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_games TEXT[];
    v_streamers TEXT[];
BEGIN
    -- Get favorite games from recent likes (last 90 days, top 10)
    SELECT ARRAY_AGG(game_id ORDER BY cnt DESC)
    INTO v_games
    FROM (
        SELECT c.game_id, COUNT(*) AS cnt
        FROM user_clip_interactions uci
        JOIN clips c ON uci.clip_id = c.id
        WHERE uci.user_id = p_user_id
          AND uci.interaction_type IN ('like', 'dwell')
          AND uci.timestamp > NOW() - INTERVAL '90 days'
          AND c.game_id IS NOT NULL
        GROUP BY c.game_id
        ORDER BY cnt DESC
        LIMIT 10
    ) game_stats;

    -- Get followed streamers from recent interactions (last 90 days, top 10)
    SELECT ARRAY_AGG(broadcaster_id ORDER BY cnt DESC)
    INTO v_streamers
    FROM (
        SELECT c.broadcaster_id, COUNT(*) AS cnt
        FROM user_clip_interactions uci
        JOIN clips c ON uci.clip_id = c.id
        WHERE uci.user_id = p_user_id
          AND uci.interaction_type IN ('like', 'dwell')
          AND uci.timestamp > NOW() - INTERVAL '90 days'
          AND c.broadcaster_id IS NOT NULL
        GROUP BY c.broadcaster_id
        ORDER BY cnt DESC
        LIMIT 10
    ) streamer_stats;

    -- Insert or update user preferences
    INSERT INTO user_preferences (user_id, favorite_games, followed_streamers)
    VALUES (p_user_id, COALESCE(v_games, '{}'), COALESCE(v_streamers, '{}'))
    ON CONFLICT (user_id)
    DO UPDATE SET
        favorite_games = COALESCE(v_games, '{}'),
        followed_streamers = COALESCE(v_streamers, '{}'),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create index for faster recommendation queries
CREATE INDEX idx_clips_recommendation_lookup ON clips(game_id, created_at DESC, vote_score DESC)
WHERE is_removed = false AND dmca_removed = false;
