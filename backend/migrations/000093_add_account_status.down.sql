-- Drop the unique index on twitch_id
DROP INDEX IF EXISTS idx_users_twitch_id_unique;

-- Make twitch_id NOT NULL again (must be done before removing account_status)
-- First update any null twitch_id values to a placeholder
UPDATE users SET twitch_id = 'unclaimed_' || id::text WHERE twitch_id IS NULL;
ALTER TABLE users ALTER COLUMN twitch_id SET NOT NULL;

-- Drop the account_status index
DROP INDEX IF EXISTS idx_users_account_status;

-- Drop the check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_account_status;

-- Drop the account_status column
ALTER TABLE users DROP COLUMN IF EXISTS account_status;
