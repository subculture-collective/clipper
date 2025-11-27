-- Migration: Add app_settings table for dynamic configuration
-- Description: Stores application settings that can be updated at runtime without restart

CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    value_type VARCHAR(50) NOT NULL DEFAULT 'string', -- string, number, boolean, json
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_settings_key ON app_settings(key);

COMMENT ON TABLE app_settings IS 'Application settings that can be updated at runtime';
COMMENT ON COLUMN app_settings.key IS 'Unique setting key (e.g., engagement_scoring.vote_weight)';
COMMENT ON COLUMN app_settings.value IS 'Setting value stored as text';
COMMENT ON COLUMN app_settings.value_type IS 'Type hint for parsing the value';
COMMENT ON COLUMN app_settings.updated_by IS 'User who last updated this setting (admin)';

-- Insert default engagement scoring weights from current env defaults
INSERT INTO app_settings (key, value, value_type, description)
VALUES
    ('engagement_scoring.vote_weight', '3.0', 'number', 'Weight for vote score in engagement calculation'),
    ('engagement_scoring.comment_weight', '2.0', 'number', 'Weight for comment count in engagement calculation'),
    ('engagement_scoring.favorite_weight', '1.5', 'number', 'Weight for favorite count in engagement calculation'),
    ('engagement_scoring.view_weight', '0.1', 'number', 'Weight for view count in engagement calculation')
ON CONFLICT (key) DO NOTHING;
