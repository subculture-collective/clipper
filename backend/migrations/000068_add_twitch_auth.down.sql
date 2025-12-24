-- Drop twitch_auth table and related objects
DROP TRIGGER IF EXISTS update_twitch_auth_updated_at_trigger ON twitch_auth;
DROP FUNCTION IF EXISTS update_twitch_auth_updated_at();
DROP TABLE IF EXISTS twitch_auth;
