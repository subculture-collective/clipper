-- Rollback stream clip support columns

-- Drop CHECK constraints
ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_quality_check;
ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_stream_source_check;
ALTER TABLE clips DROP CONSTRAINT IF EXISTS clips_status_check;

-- Drop indexes
DROP INDEX IF EXISTS idx_clips_status;
DROP INDEX IF EXISTS idx_clips_stream_source;

-- Drop columns
ALTER TABLE clips DROP COLUMN IF EXISTS end_time;
ALTER TABLE clips DROP COLUMN IF EXISTS start_time;
ALTER TABLE clips DROP COLUMN IF EXISTS quality;
ALTER TABLE clips DROP COLUMN IF EXISTS processed_at;
ALTER TABLE clips DROP COLUMN IF EXISTS video_url;
ALTER TABLE clips DROP COLUMN IF EXISTS status;
ALTER TABLE clips DROP COLUMN IF EXISTS stream_source;
