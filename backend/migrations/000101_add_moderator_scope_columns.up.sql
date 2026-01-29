-- Add moderator scope columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS moderator_scope VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS moderation_channels UUID[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS moderation_started_at TIMESTAMP;

-- Create indices for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_moderator_scope ON users(moderator_scope) WHERE moderator_scope IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_moderation_channels ON users USING GIN(moderation_channels) WHERE moderation_channels IS NOT NULL;

-- Add constraints to ensure data integrity
ALTER TABLE users ADD CONSTRAINT check_moderator_scope CHECK (
    moderator_scope IS NULL OR moderator_scope IN ('site', 'community')
);

-- Comment explaining the fields
COMMENT ON COLUMN users.moderator_scope IS 'Moderator scope: site (can moderate anywhere) or community (limited to specific communities)';
COMMENT ON COLUMN users.moderation_channels IS 'Array of community IDs that this moderator is authorized to moderate (only for community-scoped moderators)';
COMMENT ON COLUMN users.moderation_started_at IS 'Timestamp when user became a moderator';
