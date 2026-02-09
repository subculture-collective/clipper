DROP TRIGGER IF EXISTS playlist_scripts_updated_at_trigger ON playlist_scripts;
DROP FUNCTION IF EXISTS update_playlist_scripts_updated_at();

DROP INDEX IF EXISTS idx_playlists_script_id;
ALTER TABLE playlists DROP COLUMN IF EXISTS script_id;

DROP TABLE IF EXISTS generated_playlists;
DROP TABLE IF EXISTS playlist_scripts;
