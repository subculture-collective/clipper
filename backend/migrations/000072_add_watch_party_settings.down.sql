-- Rollback watch party settings migration

-- Drop the password column
ALTER TABLE watch_parties
DROP COLUMN IF EXISTS password;

-- Drop the visibility index
DROP INDEX IF EXISTS idx_parties_visibility;
