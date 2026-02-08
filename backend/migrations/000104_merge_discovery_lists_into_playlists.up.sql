-- Add curated/featured fields to playlists table
ALTER TABLE playlists
    ADD COLUMN IF NOT EXISTS is_curated BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS slug VARCHAR(200),
    ADD COLUMN IF NOT EXISTS follower_count INT DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS bookmark_count INT DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0 NOT NULL,
    ADD COLUMN IF NOT EXISTS share_count INT DEFAULT 0 NOT NULL;

-- Create playlist_follows table (similar to discovery_list_follows)
CREATE TABLE IF NOT EXISTS playlist_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, playlist_id)
);

-- Create playlist_bookmarks table (similar to discovery_list_bookmarks)
CREATE TABLE IF NOT EXISTS playlist_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, playlist_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_playlists_featured ON playlists(is_featured, display_order) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_playlists_curated ON playlists(is_curated) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_playlists_slug ON playlists(slug) WHERE deleted_at IS NULL AND slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_playlist_follows_user_id ON playlist_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_follows_playlist_id ON playlist_follows(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_bookmarks_user_id ON playlist_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_bookmarks_playlist_id ON playlist_bookmarks(playlist_id);

-- Migrate existing discovery_lists to playlists
INSERT INTO playlists (id, user_id, title, description, cover_url, visibility, is_curated, is_featured, display_order, slug, created_at, updated_at)
SELECT
    dl.id,
    COALESCE(dl.created_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
    dl.name,
    dl.description,
    NULL, -- no cover_url in discovery_lists
    CASE WHEN dl.is_active THEN 'public' ELSE 'unlisted' END,
    TRUE, -- all discovery lists are curated
    dl.is_featured,
    dl.display_order,
    dl.slug,
    dl.created_at,
    dl.updated_at
FROM discovery_lists dl
WHERE NOT EXISTS (SELECT 1 FROM playlists p WHERE p.id = dl.id);

-- Migrate discovery_list_clips to playlist_items
INSERT INTO playlist_items (playlist_id, clip_id, order_index, added_at)
SELECT
    dlc.list_id,
    dlc.clip_id,
    dlc.display_order,
    dlc.added_at
FROM discovery_list_clips dlc
WHERE NOT EXISTS (
    SELECT 1 FROM playlist_items pi
    WHERE pi.playlist_id = dlc.list_id AND pi.clip_id = dlc.clip_id
);

-- Migrate discovery_list_follows to playlist_follows
INSERT INTO playlist_follows (user_id, playlist_id, followed_at)
SELECT dlf.user_id, dlf.list_id, dlf.followed_at
FROM discovery_list_follows dlf
WHERE NOT EXISTS (
    SELECT 1 FROM playlist_follows pf
    WHERE pf.user_id = dlf.user_id AND pf.playlist_id = dlf.list_id
);

-- Migrate discovery_list_bookmarks to playlist_bookmarks
INSERT INTO playlist_bookmarks (user_id, playlist_id, bookmarked_at)
SELECT dlb.user_id, dlb.list_id, dlb.bookmarked_at
FROM discovery_list_bookmarks dlb
WHERE NOT EXISTS (
    SELECT 1 FROM playlist_bookmarks pb
    WHERE pb.user_id = dlb.user_id AND pb.playlist_id = dlb.list_id
);

-- Update follower counts and bookmark counts
UPDATE playlists p
SET follower_count = (SELECT COUNT(*) FROM playlist_follows WHERE playlist_id = p.id),
    bookmark_count = (SELECT COUNT(*) FROM playlist_bookmarks WHERE playlist_id = p.id);

-- Add triggers to update follower_count
CREATE OR REPLACE FUNCTION update_playlist_follower_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE playlists SET follower_count = follower_count + 1 WHERE id = NEW.playlist_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE playlists SET follower_count = follower_count - 1 WHERE id = OLD.playlist_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlist_follows_count_trigger
    AFTER INSERT OR DELETE ON playlist_follows
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_follower_count();

-- Add triggers to update bookmark_count
CREATE OR REPLACE FUNCTION update_playlist_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE playlists SET bookmark_count = bookmark_count + 1 WHERE id = NEW.playlist_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE playlists SET bookmark_count = bookmark_count - 1 WHERE id = OLD.playlist_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlist_bookmarks_count_trigger
    AFTER INSERT OR DELETE ON playlist_bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_bookmark_count();

-- Drop old discovery_lists tables (data already migrated)
DROP TABLE IF EXISTS discovery_list_bookmarks CASCADE;
DROP TABLE IF EXISTS discovery_list_follows CASCADE;
DROP TABLE IF EXISTS discovery_list_clips CASCADE;
DROP TABLE IF EXISTS discovery_lists CASCADE;
