-- Add scopes column to twitch_auth table to store granted OAuth scopes
-- Default to 'chat:read chat:edit' which are the scopes that existing tokens have
ALTER TABLE twitch_auth 
ADD COLUMN IF NOT EXISTS scopes TEXT NOT NULL DEFAULT 'chat:read chat:edit';

-- The default value of 'chat:read chat:edit' reflects the scopes that were granted
-- to existing tokens before this migration. New OAuth flows will grant additional scopes.

-- Add comment to document the column
COMMENT ON COLUMN twitch_auth.scopes IS 'Space-separated list of granted OAuth scopes';
