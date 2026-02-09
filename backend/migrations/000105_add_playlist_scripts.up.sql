-- Add playlist scripts table
CREATE TABLE IF NOT EXISTS playlist_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    sort VARCHAR(20) NOT NULL,
    timeframe VARCHAR(20),
    clip_limit INT NOT NULL DEFAULT 10,
    visibility VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'public', 'unlisted')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_run_at TIMESTAMP,
    last_generated_playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_playlist_scripts_active ON playlist_scripts(is_active);
CREATE INDEX IF NOT EXISTS idx_playlist_scripts_created_at ON playlist_scripts(created_at DESC);

-- Link playlists to scripts for easy identification
ALTER TABLE playlists
ADD COLUMN IF NOT EXISTS script_id UUID REFERENCES playlist_scripts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_playlists_script_id ON playlists(script_id);

-- Add generated playlists table
CREATE TABLE IF NOT EXISTS generated_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID NOT NULL REFERENCES playlist_scripts(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    generated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (playlist_id)
);

CREATE INDEX IF NOT EXISTS idx_generated_playlists_script_id ON generated_playlists(script_id, generated_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_playlist_scripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlist_scripts_updated_at_trigger
    BEFORE UPDATE ON playlist_scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_playlist_scripts_updated_at();
