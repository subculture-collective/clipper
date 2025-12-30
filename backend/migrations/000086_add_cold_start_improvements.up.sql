-- Add cold start improvements to user preferences
-- Adds onboarding tracking and enhances cold start handling

-- Add onboarding fields to user_preferences
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS cold_start_source VARCHAR(50); -- 'onboarding', 'inferred', 'default'

-- Create index for cold start queries
CREATE INDEX IF NOT EXISTS idx_user_preferences_onboarding 
ON user_preferences(onboarding_completed, cold_start_source);

-- Add comments for documentation
COMMENT ON COLUMN user_preferences.onboarding_completed IS 'Whether user has completed the onboarding preference selection';
COMMENT ON COLUMN user_preferences.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN user_preferences.cold_start_source IS 'Source of preferences: onboarding (explicit), inferred (from interactions), default (system)';

-- Function to mark onboarding as completed
CREATE OR REPLACE FUNCTION complete_user_onboarding(
    p_user_id UUID,
    p_favorite_games TEXT[],
    p_followed_streamers TEXT[],
    p_preferred_categories TEXT[],
    p_preferred_tags UUID[]
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_preferences (
        user_id, 
        favorite_games, 
        followed_streamers, 
        preferred_categories, 
        preferred_tags,
        onboarding_completed,
        onboarding_completed_at,
        cold_start_source,
        updated_at,
        created_at
    )
    VALUES (
        p_user_id,
        COALESCE(p_favorite_games, '{}'),
        COALESCE(p_followed_streamers, '{}'),
        COALESCE(p_preferred_categories, '{}'),
        COALESCE(p_preferred_tags, '{}'),
        TRUE,
        NOW(),
        'onboarding',
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id)
    DO UPDATE SET
        favorite_games = COALESCE(p_favorite_games, user_preferences.favorite_games),
        followed_streamers = COALESCE(p_followed_streamers, user_preferences.followed_streamers),
        preferred_categories = COALESCE(p_preferred_categories, user_preferences.preferred_categories),
        preferred_tags = COALESCE(p_preferred_tags, user_preferences.preferred_tags),
        onboarding_completed = TRUE,
        onboarding_completed_at = NOW(),
        cold_start_source = 'onboarding',
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Update existing function to mark inferred preferences
CREATE OR REPLACE FUNCTION update_user_preferences_from_interactions(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_games TEXT[];
    v_streamers TEXT[];
    v_has_onboarding BOOLEAN;
BEGIN
    -- Check if user has completed onboarding
    SELECT onboarding_completed INTO v_has_onboarding
    FROM user_preferences
    WHERE user_id = p_user_id;

    -- Only infer preferences if onboarding not completed
    IF v_has_onboarding IS NOT TRUE THEN
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

        -- Insert or update user preferences with inferred data
        INSERT INTO user_preferences (
            user_id, 
            favorite_games, 
            followed_streamers, 
            cold_start_source,
            updated_at,
            created_at
        )
        VALUES (
            p_user_id, 
            COALESCE(v_games, '{}'), 
            COALESCE(v_streamers, '{}'),
            'inferred',
            NOW(),
            NOW()
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
            favorite_games = COALESCE(v_games, '{}'),
            followed_streamers = COALESCE(v_streamers, '{}'),
            cold_start_source = CASE 
                WHEN user_preferences.cold_start_source IS NULL THEN 'inferred'
                ELSE user_preferences.cold_start_source
            END,
            updated_at = NOW();
    END IF;
END;
$$ LANGUAGE plpgsql;
