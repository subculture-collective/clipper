-- Drop indexes
DROP INDEX IF EXISTS idx_discovery_list_bookmarks_list_id;
DROP INDEX IF EXISTS idx_discovery_list_bookmarks_user_id;
DROP INDEX IF EXISTS idx_discovery_list_follows_list_id;
DROP INDEX IF EXISTS idx_discovery_list_follows_user_id;
DROP INDEX IF EXISTS idx_discovery_list_clips_clip_id;
DROP INDEX IF EXISTS idx_discovery_list_clips_list_id;
DROP INDEX IF EXISTS idx_discovery_lists_slug;
DROP INDEX IF EXISTS idx_discovery_lists_featured;

-- Drop tables
DROP TABLE IF EXISTS discovery_list_bookmarks;
DROP TABLE IF EXISTS discovery_list_follows;
DROP TABLE IF EXISTS discovery_list_clips;
DROP TABLE IF EXISTS discovery_lists;
