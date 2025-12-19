-- Rollback watch party settings migration

-- Drop the password column
ALTER TABLE watch_parties
DROP COLUMN IF EXISTS password;

-- Drop the visibility index
DROP INDEX IF EXISTS idx_parties_visibility;

-- Restore original visibility CHECK constraint
ALTER TABLE watch_parties DROP CONSTRAINT IF EXISTS watch_parties_visibility_check;
ALTER TABLE watch_parties ADD CONSTRAINT watch_parties_visibility_check 
  CHECK (visibility IN ('private', 'public', 'friends'));
