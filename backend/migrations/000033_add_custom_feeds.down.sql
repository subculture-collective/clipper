-- Drop indexes
DROP INDEX IF EXISTS idx_feed_follows_feed_id;
DROP INDEX IF EXISTS idx_feed_follows_user_id;
DROP INDEX IF EXISTS idx_feed_items_position;
DROP INDEX IF EXISTS idx_feed_items_clip_id;
DROP INDEX IF EXISTS idx_feed_items_feed_id;
DROP INDEX IF EXISTS idx_feeds_is_public;
DROP INDEX IF EXISTS idx_feeds_user_id;

-- Drop tables
DROP TABLE IF EXISTS feed_follows;
DROP TABLE IF EXISTS feed_items;
DROP TABLE IF EXISTS feeds;
