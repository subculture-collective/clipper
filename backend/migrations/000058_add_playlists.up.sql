-- Add playlists table
CREATE TABLE IF NOT EXISTS playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    cover_url VARCHAR(255),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
    like_count INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Add playlist_items table
CREATE TABLE IF NOT EXISTS playlist_items (
    id SERIAL PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    order_index INT NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(playlist_id, clip_id)
);

-- Add playlist_likes table for social engagement
CREATE TABLE IF NOT EXISTS playlist_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, playlist_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_visibility ON playlists(visibility) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist_id ON playlist_items(playlist_id, order_index);
CREATE INDEX IF NOT EXISTS idx_playlist_items_clip_id ON playlist_items(clip_id);
CREATE INDEX IF NOT EXISTS idx_playlist_likes_playlist_id ON playlist_likes(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_likes_user_id ON playlist_likes(user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_playlists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlists_updated_at_trigger
    BEFORE UPDATE ON playlists
    FOR EACH ROW
    EXECUTE FUNCTION update_playlists_updated_at();

-- Add trigger to update playlist like_count
CREATE OR REPLACE FUNCTION update_playlist_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE playlists SET like_count = like_count + 1 WHERE id = NEW.playlist_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE playlists SET like_count = like_count - 1 WHERE id = OLD.playlist_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlist_likes_count_trigger
    AFTER INSERT OR DELETE ON playlist_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_like_count();
