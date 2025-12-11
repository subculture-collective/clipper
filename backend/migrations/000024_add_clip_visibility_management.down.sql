-- Remove is_hidden column and index from clips table
DROP INDEX IF EXISTS idx_clips_is_hidden;
ALTER TABLE clips DROP COLUMN IF EXISTS is_hidden;
