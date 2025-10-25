-- Drop indexes
DROP INDEX IF EXISTS hot_clips_materialized_creator_hot_idx;
DROP INDEX IF EXISTS hot_clips_materialized_game_hot_idx;
DROP INDEX IF EXISTS hot_clips_materialized_created_at_idx;
DROP INDEX IF EXISTS hot_clips_materialized_hot_score_idx;
DROP INDEX IF EXISTS hot_clips_materialized_id_idx;

-- Drop materialized view
DROP MATERIALIZED VIEW IF EXISTS hot_clips_materialized;
