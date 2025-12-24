-- Add sharing and collaboration fields to playlists table
ALTER TABLE playlists 
ADD COLUMN IF NOT EXISTS share_token VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS share_count INT DEFAULT 0 NOT NULL;

-- Create indexes for sharing features
CREATE INDEX IF NOT EXISTS idx_playlists_share_token ON playlists(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_playlists_visibility_created ON playlists(visibility, created_at DESC) WHERE deleted_at IS NULL;

-- Create playlist_collaborators table
CREATE TABLE IF NOT EXISTS playlist_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission VARCHAR(20) NOT NULL DEFAULT 'view' CHECK (permission IN ('view', 'edit', 'admin')),
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(playlist_id, user_id)
);

-- Create indexes for collaborators
CREATE INDEX IF NOT EXISTS idx_collab_playlist ON playlist_collaborators(playlist_id);
CREATE INDEX IF NOT EXISTS idx_collab_user ON playlist_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_permission ON playlist_collaborators(permission);

-- Create playlist_shares analytics table
CREATE TABLE IF NOT EXISTS playlist_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    platform VARCHAR(50), -- twitter, facebook, discord, embed
    referrer VARCHAR(255),
    shared_at TIMESTAMP DEFAULT NOW()
);

-- Create index for shares
CREATE INDEX IF NOT EXISTS idx_shares_playlist ON playlist_shares(playlist_id, shared_at DESC);
CREATE INDEX IF NOT EXISTS idx_shares_platform ON playlist_shares(platform, shared_at DESC);

-- Add trigger to update collaborators updated_at
CREATE OR REPLACE FUNCTION update_collaborators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collaborators_updated_at_trigger
    BEFORE UPDATE ON playlist_collaborators
    FOR EACH ROW
    EXECUTE FUNCTION update_collaborators_updated_at();
