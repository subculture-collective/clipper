-- Add scopes column to twitch_auth table to store granted OAuth scopes
ALTER TABLE twitch_auth 
ADD COLUMN IF NOT EXISTS scopes TEXT DEFAULT '';

-- Update existing records to have default scopes (chat:read chat:edit)
-- This reflects the current scopes that were granted before this migration
UPDATE twitch_auth 
SET scopes = 'chat:read chat:edit' 
WHERE scopes = '' OR scopes IS NULL;

-- Add comment to document the column
COMMENT ON COLUMN twitch_auth.scopes IS 'Space-separated list of granted OAuth scopes';
