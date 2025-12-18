-- Create watch_parties table for synchronized video watching
CREATE TABLE watch_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
    current_clip_id UUID REFERENCES clips(id) ON DELETE SET NULL,
    current_position_seconds INT DEFAULT 0 CHECK (current_position_seconds >= 0),
    is_playing BOOLEAN DEFAULT FALSE,
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'friends')),
    invite_code VARCHAR(10) UNIQUE NOT NULL,
    max_participants INT DEFAULT 100 CHECK (max_participants > 0 AND max_participants <= 1000),
    created_at TIMESTAMP DEFAULT NOW(),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    CONSTRAINT valid_timestamps CHECK (started_at IS NULL OR started_at >= created_at),
    CONSTRAINT valid_end_time CHECK (ended_at IS NULL OR (started_at IS NOT NULL AND ended_at >= started_at))
);

-- Create watch_party_participants table for tracking who is in each party
CREATE TABLE watch_party_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'viewer' CHECK (role IN ('host', 'co-host', 'viewer')),
    joined_at TIMESTAMP DEFAULT NOW(),
    left_at TIMESTAMP,
    last_sync_at TIMESTAMP,
    sync_offset_ms INT DEFAULT 0,
    UNIQUE(party_id, user_id),
    CONSTRAINT valid_left_at CHECK (left_at IS NULL OR left_at >= joined_at)
);

-- Indexes for watch_parties
CREATE INDEX idx_parties_host ON watch_parties(host_user_id) WHERE ended_at IS NULL;
CREATE INDEX idx_parties_invite ON watch_parties(invite_code) WHERE ended_at IS NULL;
CREATE INDEX idx_parties_active ON watch_parties(created_at DESC) WHERE ended_at IS NULL;
CREATE INDEX idx_parties_playlist ON watch_parties(playlist_id) WHERE playlist_id IS NOT NULL AND ended_at IS NULL;

-- Indexes for watch_party_participants
CREATE INDEX idx_participants_party ON watch_party_participants(party_id) WHERE left_at IS NULL;
CREATE INDEX idx_participants_user ON watch_party_participants(user_id) WHERE left_at IS NULL;
CREATE INDEX idx_participants_party_active ON watch_party_participants(party_id, left_at) WHERE left_at IS NULL;
CREATE INDEX idx_participants_last_sync ON watch_party_participants(party_id, last_sync_at) WHERE left_at IS NULL;

-- Add comment documentation
COMMENT ON TABLE watch_parties IS 'Watch parties for synchronized video viewing with friends';
COMMENT ON TABLE watch_party_participants IS 'Junction table tracking participants in watch parties';
COMMENT ON COLUMN watch_parties.invite_code IS 'Unique code for joining the party (6-10 characters)';
COMMENT ON COLUMN watch_parties.current_position_seconds IS 'Current playback position in seconds';
COMMENT ON COLUMN watch_party_participants.sync_offset_ms IS 'Participant sync offset in milliseconds for monitoring';
COMMENT ON COLUMN watch_party_participants.role IS 'Participant role: host (creator), co-host (elevated), or viewer';
