-- Create user_blocks table for blocking users
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, blocked_user_id),
    CONSTRAINT chk_user_blocks_no_self_block CHECK (user_id != blocked_user_id)
);

-- Index for finding all blocks by a user
CREATE INDEX idx_user_blocks_user_id ON user_blocks(user_id);

-- Index for checking if a specific user is blocked
CREATE INDEX idx_user_blocks_blocked_user_id ON user_blocks(blocked_user_id);

-- Index for created_at for sorting recent blocks
CREATE INDEX idx_user_blocks_blocked_at ON user_blocks(blocked_at DESC);

-- Add comments for documentation
COMMENT ON TABLE user_blocks IS 'Tracks user blocking relationships';
COMMENT ON COLUMN user_blocks.user_id IS 'User who initiated the block';
COMMENT ON COLUMN user_blocks.blocked_user_id IS 'User who is blocked';
