-- Drop functions
DROP FUNCTION IF EXISTS calculate_trending_score(INT, INT, INT, INT, TIMESTAMP);
DROP FUNCTION IF EXISTS calculate_hot_score_value(INT, INT, FLOAT);

-- Drop indexes
DROP INDEX IF EXISTS idx_clips_trending_score;
DROP INDEX IF EXISTS idx_clips_hot_score;
DROP INDEX IF EXISTS idx_clips_popularity_index;
DROP INDEX IF EXISTS idx_clips_engagement_count;

-- Drop columns
ALTER TABLE clips DROP COLUMN IF EXISTS trending_score;
ALTER TABLE clips DROP COLUMN IF EXISTS hot_score;
ALTER TABLE clips DROP COLUMN IF EXISTS popularity_index;
ALTER TABLE clips DROP COLUMN IF EXISTS engagement_count;
