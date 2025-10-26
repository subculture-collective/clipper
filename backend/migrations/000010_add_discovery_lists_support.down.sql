-- Drop indexes
DROP INDEX IF EXISTS idx_clips_comment_count;
DROP INDEX IF EXISTS idx_clips_broadcaster_discussed;

-- Drop top streamers table and its indexes
DROP INDEX IF EXISTS idx_top_streamers_rank;
DROP INDEX IF EXISTS idx_top_streamers_broadcaster_id;
DROP TABLE IF EXISTS top_streamers;
