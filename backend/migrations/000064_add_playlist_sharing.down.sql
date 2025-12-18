-- Drop triggers
DROP TRIGGER IF EXISTS collaborators_updated_at_trigger ON playlist_collaborators;
DROP FUNCTION IF EXISTS update_collaborators_updated_at();

-- Drop tables
DROP TABLE IF EXISTS playlist_shares;
DROP TABLE IF EXISTS playlist_collaborators;

-- Drop indexes
DROP INDEX IF EXISTS idx_shares_platform;
DROP INDEX IF EXISTS idx_shares_playlist;
DROP INDEX IF EXISTS idx_collab_permission;
DROP INDEX IF EXISTS idx_collab_user;
DROP INDEX IF EXISTS idx_collab_playlist;
DROP INDEX IF EXISTS idx_playlists_visibility_created;
DROP INDEX IF EXISTS idx_playlists_share_token;

-- Remove columns from playlists
ALTER TABLE playlists 
DROP COLUMN IF EXISTS share_count,
DROP COLUMN IF EXISTS view_count,
DROP COLUMN IF EXISTS share_token;
