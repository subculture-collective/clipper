-- Create watch_party_messages table for chat messages
CREATE TABLE watch_party_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watch_party_id UUID NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL CHECK (length(message) > 0 AND length(message) <= 1000),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create watch_party_reactions table for emoji reactions
CREATE TABLE watch_party_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    watch_party_id UUID NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL CHECK (length(emoji) > 0),
    video_timestamp DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for watch_party_messages
CREATE INDEX idx_party_messages ON watch_party_messages(watch_party_id, created_at DESC);
CREATE INDEX idx_party_messages_user ON watch_party_messages(user_id, created_at DESC);

-- Indexes for watch_party_reactions  
CREATE INDEX idx_party_reactions ON watch_party_reactions(watch_party_id, created_at DESC);
CREATE INDEX idx_party_reactions_timestamp ON watch_party_reactions(watch_party_id, video_timestamp) WHERE video_timestamp IS NOT NULL;

-- Add comments for documentation
COMMENT ON TABLE watch_party_messages IS 'Chat messages in watch parties';
COMMENT ON TABLE watch_party_reactions IS 'Emoji reactions in watch parties with optional video timestamps';
COMMENT ON COLUMN watch_party_messages.message IS 'Chat message text (max 1000 characters)';
COMMENT ON COLUMN watch_party_reactions.emoji IS 'Emoji character or unicode (max 10 characters)';
COMMENT ON COLUMN watch_party_reactions.video_timestamp IS 'Video playback position when reaction was sent (seconds with 2 decimal places)';
