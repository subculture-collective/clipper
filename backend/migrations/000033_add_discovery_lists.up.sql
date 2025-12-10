-- Create discovery_lists table
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

-- Create discovery_list_clips table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS discovery_list_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES discovery_lists(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    added_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(list_id, clip_id)
);

-- Create discovery_list_follows table
CREATE TABLE IF NOT EXISTS discovery_list_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES discovery_lists(id) ON DELETE CASCADE,
    followed_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, list_id)
);

-- Create discovery_list_bookmarks table
CREATE TABLE IF NOT EXISTS discovery_list_bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES discovery_lists(id) ON DELETE CASCADE,
    bookmarked_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, list_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_discovery_lists_featured ON discovery_lists(is_featured, display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_discovery_lists_slug ON discovery_lists(slug) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_discovery_list_clips_list_id ON discovery_list_clips(list_id, display_order);
CREATE INDEX IF NOT EXISTS idx_discovery_list_clips_clip_id ON discovery_list_clips(clip_id);
CREATE INDEX IF NOT EXISTS idx_discovery_list_follows_user_id ON discovery_list_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_discovery_list_follows_list_id ON discovery_list_follows(list_id);
CREATE INDEX IF NOT EXISTS idx_discovery_list_bookmarks_user_id ON discovery_list_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_discovery_list_bookmarks_list_id ON discovery_list_bookmarks(list_id);

-- Insert some sample discovery lists
INSERT INTO discovery_lists (name, slug, description, is_featured, display_order) VALUES
('Epic Gaming Moments', 'epic-gaming-moments', 'The most incredible plays and highlights from top streamers', true, 1),
('Funny Fails', 'funny-fails', 'Hilarious gaming fails that will make you laugh', true, 2),
('Speedrun Records', 'speedrun-records', 'Amazing speedrun moments and world records', true, 3),
('Community Favorites', 'community-favorites', 'Top-rated clips chosen by the community', false, 4);
