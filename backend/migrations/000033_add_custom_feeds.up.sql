-- Create feeds table for user-created feeds
CREATE TABLE IF NOT EXISTS feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100),
    is_public BOOLEAN DEFAULT true,
    follower_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create feed_items table for clips in feeds
CREATE TABLE IF NOT EXISTS feed_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    position INT NOT NULL,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(feed_id, clip_id)
);

-- Create feed_follows table for following feeds
CREATE TABLE IF NOT EXISTS feed_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feed_id UUID NOT NULL REFERENCES feeds(id) ON DELETE CASCADE,
    followed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, feed_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feeds_user_id ON feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_feeds_is_public ON feeds(is_public);
CREATE INDEX IF NOT EXISTS idx_feed_items_feed_id ON feed_items(feed_id);
CREATE INDEX IF NOT EXISTS idx_feed_items_clip_id ON feed_items(clip_id);
CREATE INDEX IF NOT EXISTS idx_feed_items_position ON feed_items(feed_id, position);
CREATE INDEX IF NOT EXISTS idx_feed_follows_user_id ON feed_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_follows_feed_id ON feed_follows(feed_id);
