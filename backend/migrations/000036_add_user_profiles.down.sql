-- Drop trigger and function
DROP TRIGGER IF EXISTS update_user_follow_counts_trigger ON user_follows;
DROP FUNCTION IF EXISTS update_user_follow_counts();

-- Drop added columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS social_links;
ALTER TABLE users DROP COLUMN IF EXISTS follower_count;
ALTER TABLE users DROP COLUMN IF EXISTS following_count;

-- Drop tables
DROP TABLE IF EXISTS user_activity;
DROP TABLE IF EXISTS user_follows;
