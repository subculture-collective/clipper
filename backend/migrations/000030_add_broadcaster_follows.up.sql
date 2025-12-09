-- Create broadcaster_follows table for tracking user follows of broadcasters
CREATE TABLE IF NOT EXISTS broadcaster_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    broadcaster_id VARCHAR(255) NOT NULL, -- Twitch broadcaster ID
    broadcaster_name VARCHAR(255) NOT NULL, -- Twitch broadcaster name (for quick lookup)
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, broadcaster_id)
);

-- Index for finding all follows by a user
CREATE INDEX idx_broadcaster_follows_user_id ON broadcaster_follows(user_id);

-- Index for counting followers of a broadcaster
CREATE INDEX idx_broadcaster_follows_broadcaster_id ON broadcaster_follows(broadcaster_id);

-- Index for created_at for sorting recent follows
CREATE INDEX idx_broadcaster_follows_created_at ON broadcaster_follows(created_at DESC);
