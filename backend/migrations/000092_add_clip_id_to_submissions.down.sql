-- Remove clip_id column from clip_submissions
DROP INDEX IF EXISTS idx_submissions_clip_id;

ALTER TABLE clip_submissions
    DROP COLUMN IF EXISTS clip_id;
