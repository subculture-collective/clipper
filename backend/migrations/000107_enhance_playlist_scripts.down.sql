-- Remove bot user (only if no clips are attributed to it)
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001' AND username = 'clpr-bot';

-- Remove constraints
ALTER TABLE playlist_scripts
    DROP CONSTRAINT IF EXISTS chk_playlist_scripts_schedule,
    DROP CONSTRAINT IF EXISTS chk_playlist_scripts_strategy;

-- Remove index
DROP INDEX IF EXISTS idx_playlist_scripts_schedule;

-- Remove added columns
ALTER TABLE playlist_scripts
    DROP COLUMN IF EXISTS schedule,
    DROP COLUMN IF EXISTS strategy,
    DROP COLUMN IF EXISTS game_id,
    DROP COLUMN IF EXISTS game_ids,
    DROP COLUMN IF EXISTS broadcaster_id,
    DROP COLUMN IF EXISTS tag,
    DROP COLUMN IF EXISTS exclude_tags,
    DROP COLUMN IF EXISTS language,
    DROP COLUMN IF EXISTS min_vote_score,
    DROP COLUMN IF EXISTS min_view_count,
    DROP COLUMN IF EXISTS exclude_nsfw,
    DROP COLUMN IF EXISTS top_10k_streamers,
    DROP COLUMN IF EXISTS seed_clip_id,
    DROP COLUMN IF EXISTS retention_days,
    DROP COLUMN IF EXISTS title_template;
