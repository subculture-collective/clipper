-- Rollback cold start improvements

-- Drop the function
DROP FUNCTION IF EXISTS complete_user_onboarding(UUID, TEXT[], TEXT[], TEXT[], UUID[]);

-- Restore original update_user_preferences_from_interactions function
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

-- Drop index
DROP INDEX IF EXISTS idx_user_preferences_onboarding_completed;

-- Remove columns
ALTER TABLE user_preferences 
DROP COLUMN IF EXISTS cold_start_source,
DROP COLUMN IF EXISTS onboarding_completed_at,
DROP COLUMN IF EXISTS onboarding_completed;
