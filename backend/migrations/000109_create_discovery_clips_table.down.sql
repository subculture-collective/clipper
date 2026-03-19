-- Rollback migration 109: Move discovery_clips back into clips table

BEGIN;

-- Move discovery clips back into the main clips table with submitted_by_user_id = NULL
INSERT INTO clips (
    id, twitch_clip_id, twitch_clip_url, embed_url, title,
    creator_name, creator_id, broadcaster_name, broadcaster_id,
    game_id, game_name, language, thumbnail_url, duration,
    view_count, created_at, imported_at, is_nsfw, is_removed, is_hidden
)
SELECT
    id, twitch_clip_id, twitch_clip_url, embed_url, title,
    creator_name, creator_id, broadcaster_name, broadcaster_id,
    game_id, game_name, language, thumbnail_url, duration,
    view_count, created_at, imported_at, is_nsfw, is_removed, is_hidden
FROM discovery_clips
ON CONFLICT (twitch_clip_id) DO NOTHING;

-- Drop the trigger and function
DROP TRIGGER IF EXISTS trg_discovery_clips_search_vector ON discovery_clips;
DROP FUNCTION IF EXISTS discovery_clips_search_vector_update();

-- Drop the discovery_clips table
DROP TABLE IF EXISTS discovery_clips;

COMMIT;
