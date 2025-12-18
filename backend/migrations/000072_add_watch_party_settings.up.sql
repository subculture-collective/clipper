-- Add privacy and password columns to watch_parties table for settings management

-- Add privacy column (already exists but let's ensure it's properly configured)
-- Note: privacy column already exists in 000068_add_watch_parties.up.sql
-- We're just adding password support here

-- Add password column for password-protected parties
ALTER TABLE watch_parties
ADD COLUMN IF NOT EXISTS password VARCHAR(255);

-- Add index for querying parties by visibility
CREATE INDEX IF NOT EXISTS idx_parties_visibility ON watch_parties(visibility) WHERE ended_at IS NULL;

-- Add comment documentation
COMMENT ON COLUMN watch_parties.password IS 'Optional bcrypt-hashed password for invite-only parties';
