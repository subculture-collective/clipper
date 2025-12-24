-- Add twitch_auth table for Twitch OAuth integration
CREATE TABLE IF NOT EXISTS twitch_auth (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    twitch_user_id VARCHAR(50) NOT NULL UNIQUE,
    twitch_username VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add index for token expiration queries
CREATE INDEX IF NOT EXISTS idx_twitch_auth_expires ON twitch_auth(expires_at);

-- Add index for Twitch user ID lookups
CREATE INDEX IF NOT EXISTS idx_twitch_auth_user_id ON twitch_auth(twitch_user_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_twitch_auth_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_twitch_auth_updated_at_trigger
    BEFORE UPDATE ON twitch_auth
    FOR EACH ROW
    EXECUTE FUNCTION update_twitch_auth_updated_at();
