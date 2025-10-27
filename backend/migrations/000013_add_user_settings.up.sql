-- Add user settings table for privacy and other preferences
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_visibility VARCHAR(20) DEFAULT 'public', -- public, private, followers
    show_karma_publicly BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create default settings for existing users
INSERT INTO user_settings (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Add account deletion tracking
CREATE TABLE IF NOT EXISTS account_deletions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_at TIMESTAMP DEFAULT NOW(),
    scheduled_for TIMESTAMP NOT NULL, -- deletion_date (grace period)
    reason TEXT,
    is_cancelled BOOLEAN DEFAULT false,
    cancelled_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Enforce only one active (not cancelled, not completed) deletion request per user
CREATE UNIQUE INDEX idx_active_deletion ON account_deletions(user_id) WHERE is_cancelled = false AND completed_at IS NULL;
CREATE INDEX idx_account_deletions_user ON account_deletions(user_id);
CREATE INDEX idx_account_deletions_scheduled ON account_deletions(scheduled_for) WHERE completed_at IS NULL AND is_cancelled = false;

-- Create trigger to auto-create user settings for new users
CREATE OR REPLACE FUNCTION create_default_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_create_user_settings
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_settings();
