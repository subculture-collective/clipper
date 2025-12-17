-- Drop indexes
DROP INDEX IF EXISTS idx_clip_tags_tag_clip;
DROP INDEX IF EXISTS idx_clips_discussed;
DROP INDEX IF EXISTS idx_clips_language;
DROP INDEX IF EXISTS idx_clips_broadcaster_created;
DROP INDEX IF EXISTS idx_clips_game_created;
DROP INDEX IF EXISTS idx_user_filter_presets_user_id;

-- Drop user_filter_presets table
DROP TABLE IF EXISTS user_filter_presets;
