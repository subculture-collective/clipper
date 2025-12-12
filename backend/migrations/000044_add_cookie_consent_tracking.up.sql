-- Add table for tracking user cookie consent preferences
-- Part of GDPR/CCPA compliance - Issue #591

CREATE TABLE IF NOT EXISTS user_cookie_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    essential BOOLEAN NOT NULL DEFAULT true,
    functional BOOLEAN NOT NULL DEFAULT false,
    analytics BOOLEAN NOT NULL DEFAULT false,
    advertising BOOLEAN NOT NULL DEFAULT false,
    consent_date TIMESTAMP NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '12 months',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_cookie_consents_user_id ON user_cookie_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cookie_consents_consent_date ON user_cookie_consents(consent_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_cookie_consents_expires_at ON user_cookie_consents(expires_at);

-- Only keep the most recent consent record per user (for active consent)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cookie_consents_user_latest 
    ON user_cookie_consents(user_id, consent_date DESC);

COMMENT ON TABLE user_cookie_consents IS 'Stores user consent preferences for GDPR/CCPA compliance';
COMMENT ON COLUMN user_cookie_consents.essential IS 'Always true - required for site functionality';
COMMENT ON COLUMN user_cookie_consents.functional IS 'Optional - language, theme, user preferences';
COMMENT ON COLUMN user_cookie_consents.analytics IS 'Optional - PostHog, Google Analytics';
COMMENT ON COLUMN user_cookie_consents.advertising IS 'Optional - personalized advertising';
COMMENT ON COLUMN user_cookie_consents.ip_address IS 'IP address at time of consent (for audit trail)';
COMMENT ON COLUMN user_cookie_consents.user_agent IS 'User agent at time of consent (for audit trail)';
COMMENT ON COLUMN user_cookie_consents.expires_at IS 'Consent expires after 12 months per GDPR requirements';
