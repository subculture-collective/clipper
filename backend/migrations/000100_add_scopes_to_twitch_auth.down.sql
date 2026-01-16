-- Remove scopes column from twitch_auth table
ALTER TABLE twitch_auth DROP COLUMN IF EXISTS scopes;
