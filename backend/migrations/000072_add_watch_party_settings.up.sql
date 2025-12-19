-- Add privacy and password columns to watch_parties table for settings management

-- Add password column for password-protected parties
ALTER TABLE watch_parties
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Update visibility CHECK constraint to include 'invite' option
ALTER TABLE watch_parties DROP CONSTRAINT IF EXISTS watch_parties_visibility_check;
ALTER TABLE watch_parties ADD CONSTRAINT watch_parties_visibility_check 
  CHECK (visibility IN ('private', 'public', 'friends', 'invite'));

-- Add index for querying parties by visibility
CREATE INDEX IF NOT EXISTS idx_parties_visibility ON watch_parties(visibility) WHERE ended_at IS NULL;

-- Add comment documentation
COMMENT ON COLUMN watch_parties.password IS 'Optional bcrypt-hashed password for invite-only parties';
