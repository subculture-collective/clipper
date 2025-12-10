-- Add social_links JSONB column to users table
ALTER TABLE users ADD COLUMN social_links JSONB DEFAULT '{}'::jsonb;

-- Create user_follows table for user-to-user following
CREATE TABLE user_follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CONSTRAINT chk_user_follows_no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_user_follows_created ON user_follows(created_at DESC);

-- Create user_activity table for tracking user actions
CREATE TABLE user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'clip_submitted', 'upvote', 'downvote', 'comment', 'user_followed', 'broadcaster_followed'
    target_id UUID, -- clip_id, comment_id, user_id, etc.
    target_type VARCHAR(50), -- 'clip', 'comment', 'user', 'broadcaster'
    metadata JSONB, -- Additional context-specific data
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_activity_user ON user_activity(user_id, created_at DESC);
CREATE INDEX idx_user_activity_type ON user_activity(activity_type);
CREATE INDEX idx_user_activity_target ON user_activity(target_id, target_type);
CREATE INDEX idx_user_activity_created ON user_activity(created_at DESC);

-- Add follower/following counts to users (denormalized for performance)
ALTER TABLE users ADD COLUMN follower_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN following_count INT DEFAULT 0;

-- Function to update user follower/following counts
CREATE OR REPLACE FUNCTION update_user_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment follower count for the user being followed
        UPDATE users
        SET follower_count = follower_count + 1
        WHERE id = NEW.following_id;
        
        -- Increment following count for the follower
        UPDATE users
        SET following_count = following_count + 1
        WHERE id = NEW.follower_id;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement follower count for the user being unfollowed
        UPDATE users
        SET follower_count = follower_count - 1
        WHERE id = OLD.following_id;
        
        -- Decrement following count for the unfollower
        UPDATE users
        SET following_count = following_count - 1
        WHERE id = OLD.follower_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user follow count updates
CREATE TRIGGER update_user_follow_counts_trigger
AFTER INSERT OR DELETE ON user_follows
FOR EACH ROW EXECUTE FUNCTION update_user_follow_counts();

-- Add comments for documentation
COMMENT ON TABLE user_follows IS 'Tracks user-to-user following relationships';
COMMENT ON TABLE user_activity IS 'Activity feed for users - tracks various user actions';
COMMENT ON COLUMN users.social_links IS 'JSONB object containing social media links (twitter, twitch, discord, etc.)';
COMMENT ON COLUMN users.follower_count IS 'Cached count of users following this user';
COMMENT ON COLUMN users.following_count IS 'Cached count of users this user is following';
