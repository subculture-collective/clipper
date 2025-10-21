-- Drop views
DROP VIEW IF EXISTS trending_clips;
DROP VIEW IF EXISTS new_clips;
DROP VIEW IF EXISTS top_clips;
DROP VIEW IF EXISTS hot_clips;

-- Drop triggers
DROP TRIGGER IF EXISTS update_tag_usage ON clip_tags;
DROP TRIGGER IF EXISTS update_clip_favorites ON favorites;
DROP TRIGGER IF EXISTS update_clip_comments ON comments;
DROP TRIGGER IF EXISTS update_comment_votes ON comment_votes;
DROP TRIGGER IF EXISTS update_clip_votes ON votes;
DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop functions
DROP FUNCTION IF EXISTS update_tag_usage_count();
DROP FUNCTION IF EXISTS update_clip_favorite_count();
DROP FUNCTION IF EXISTS update_clip_comment_count();
DROP FUNCTION IF EXISTS update_comment_vote_score();
DROP FUNCTION IF EXISTS update_clip_vote_score();
DROP FUNCTION IF EXISTS calculate_hot_score(INT, TIMESTAMP);
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables (in reverse order of creation to handle foreign keys)
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS clip_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS comment_votes;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS votes;
DROP TABLE IF EXISTS clips;
DROP TABLE IF EXISTS users;

-- Drop extension
DROP EXTENSION IF EXISTS "pgcrypto";
