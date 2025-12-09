-- Remove submitted_by_user_id and submitted_at from clips table
DROP INDEX IF EXISTS idx_clips_submitted_by;
ALTER TABLE clips DROP COLUMN IF EXISTS submitted_by_user_id;
ALTER TABLE clips DROP COLUMN IF EXISTS submitted_at;
