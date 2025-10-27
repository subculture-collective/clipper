-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_create_user_settings ON users;
DROP FUNCTION IF EXISTS create_default_user_settings();

-- Drop indexes
DROP INDEX IF EXISTS idx_account_deletions_scheduled;
DROP INDEX IF EXISTS idx_account_deletions_user;

-- Drop tables
DROP TABLE IF EXISTS account_deletions;
DROP TABLE IF EXISTS user_settings;
