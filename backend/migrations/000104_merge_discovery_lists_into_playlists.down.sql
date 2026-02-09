-- Recreate discovery_lists table
CREATE TABLE IF NOT EXISTS discovery_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    description TEXT,
    is_featured BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discovery_list_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES discovery_lists(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(list_id, clip_id)
);

CREATE TABLE IF NOT EXISTS discovery_list_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES discovery_lists(id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, list_id)
);

CREATE TABLE IF NOT EXISTS discovery_list_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES discovery_lists(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, list_id)
);

-- Migrate curated playlists back to discovery_lists
INSERT INTO discovery_lists (id, name, slug, description, is_featured, is_active, display_order, created_by, created_at, updated_at)
SELECT
    id,
    title,
    slug,
    description,
    is_featured,
    CASE WHEN visibility = 'public' THEN true ELSE false END,
    display_order,
    user_id,
    created_at,
    updated_at
FROM playlists
WHERE is_curated = TRUE;

-- Migrate clips back
INSERT INTO discovery_list_clips (list_id, clip_id, display_order, added_at)
SELECT playlist_id, clip_id, order_index, added_at
FROM playlist_items
WHERE playlist_id IN (SELECT id FROM playlists WHERE is_curated = TRUE);

-- Migrate follows back
INSERT INTO discovery_list_follows (user_id, list_id, followed_at)
SELECT user_id, playlist_id, followed_at
FROM playlist_follows
WHERE playlist_id IN (SELECT id FROM playlists WHERE is_curated = TRUE);

-- Migrate bookmarks back
INSERT INTO discovery_list_bookmarks (user_id, list_id, bookmarked_at)
SELECT user_id, playlist_id, bookmarked_at
FROM playlist_bookmarks
WHERE playlist_id IN (SELECT id FROM playlists WHERE is_curated = TRUE);

-- Drop new tables and columns
DROP TRIGGER IF EXISTS playlist_bookmarks_count_trigger ON playlist_bookmarks;
DROP TRIGGER IF EXISTS playlist_follows_count_trigger ON playlist_follows;
DROP FUNCTION IF EXISTS update_playlist_bookmark_count();
DROP FUNCTION IF EXISTS update_playlist_follower_count();

DROP TABLE IF EXISTS playlist_bookmarks CASCADE;
DROP TABLE IF EXISTS playlist_follows CASCADE;

ALTER TABLE playlists
    DROP COLUMN IF EXISTS is_curated,
    DROP COLUMN IF EXISTS is_featured,
    DROP COLUMN IF EXISTS display_order,
    DROP COLUMN IF EXISTS slug,
    DROP COLUMN IF EXISTS follower_count,
    DROP COLUMN IF EXISTS bookmark_count,
    DROP COLUMN IF EXISTS view_count,
    DROP COLUMN IF EXISTS share_count;

-- Delete migrated curated playlists
DELETE FROM playlists WHERE id IN (SELECT id FROM discovery_lists);
