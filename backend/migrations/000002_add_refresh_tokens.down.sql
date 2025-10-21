-- Drop the cleanup function
DROP FUNCTION IF EXISTS cleanup_expired_refresh_tokens();

-- Drop the refresh_tokens table
DROP TABLE IF EXISTS refresh_tokens;
