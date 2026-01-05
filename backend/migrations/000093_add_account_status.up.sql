-- Add account_status column to users table
-- Supports active (normal user), unclaimed (auto-created from Twitch), pending (being claimed)
ALTER TABLE users
ADD COLUMN account_status VARCHAR(20) DEFAULT 'active' NOT NULL;

-- Add check constraint for valid values
ALTER TABLE users
ADD CONSTRAINT check_account_status
CHECK (account_status IN ('active', 'unclaimed', 'pending'));

-- Create index for querying unclaimed accounts
CREATE INDEX idx_users_account_status ON users(account_status);

-- Allow twitch_id to be nullable for unclaimed accounts (they might not have linked yet)
-- But we'll still need a unique identifier, so we'll use twitch_user_id from clips as the identifier
ALTER TABLE users ALTER COLUMN twitch_id DROP NOT NULL;

-- Add a unique index on twitch_id where it's not null
CREATE UNIQUE INDEX idx_users_twitch_id_unique ON users(twitch_id) WHERE twitch_id IS NOT NULL;

-- Comment explaining the account_status field
COMMENT ON COLUMN users.account_status IS 'Account status: active (registered user), unclaimed (auto-created from clip creator), pending (being claimed)';
