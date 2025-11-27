-- Drop indexes
DROP INDEX IF EXISTS idx_clips_source_engagement;
DROP INDEX IF EXISTS idx_clips_engagement_score;
DROP INDEX IF EXISTS idx_clips_source_type;

-- Remove columns
ALTER TABLE clips
DROP COLUMN IF EXISTS engagement_score,
DROP COLUMN IF EXISTS source_type;

-- Drop enum type
DROP TYPE IF EXISTS clip_source_type;
