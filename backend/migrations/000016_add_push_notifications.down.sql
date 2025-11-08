-- Remove push notification fields from users table
DROP INDEX IF EXISTS idx_users_device_token;

ALTER TABLE users 
    DROP COLUMN IF EXISTS device_token,
    DROP COLUMN IF EXISTS device_platform;
