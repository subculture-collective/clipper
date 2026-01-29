-- Drop triggers
DROP TRIGGER IF EXISTS playlist_likes_count_trigger ON playlist_likes;
DROP TRIGGER IF EXISTS playlists_updated_at_trigger ON playlists;

-- Drop functions
DROP FUNCTION IF EXISTS update_playlist_like_count();
DROP FUNCTION IF EXISTS update_playlists_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_playlist_likes_user_id;
DROP INDEX IF EXISTS idx_playlist_likes_playlist_id;
DROP INDEX IF EXISTS idx_playlist_items_clip_id;
DROP INDEX IF EXISTS idx_playlist_items_playlist_id;
DROP INDEX IF EXISTS idx_playlists_visibility;
DROP INDEX IF EXISTS idx_playlists_user_id;

-- Drop tables
DROP TABLE IF EXISTS playlist_likes;
DROP TABLE IF EXISTS playlist_items;
DROP TABLE IF EXISTS playlists;
