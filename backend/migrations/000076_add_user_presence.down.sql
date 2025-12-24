-- Drop user_presence table
DROP TRIGGER IF EXISTS update_user_presence_updated_at ON user_presence;
DROP TABLE IF EXISTS user_presence;
