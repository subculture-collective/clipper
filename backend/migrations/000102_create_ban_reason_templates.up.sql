-- Create ban_reason_templates table for storing reusable ban reason templates
CREATE TABLE IF NOT EXISTS ban_reason_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    duration_seconds INTEGER, -- NULL for permanent ban, otherwise timeout duration
    is_default BOOLEAN DEFAULT FALSE, -- System-provided default templates
    broadcaster_id VARCHAR(100), -- Twitch broadcaster ID for channel-specific templates
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usage_count INTEGER DEFAULT 0, -- Track how often template is used
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Ensure unique names per broadcaster (or globally for defaults)
    CONSTRAINT unique_template_name UNIQUE (broadcaster_id, name)
);

-- Index for quick lookups by broadcaster
CREATE INDEX idx_ban_reason_templates_broadcaster ON ban_reason_templates(broadcaster_id) WHERE broadcaster_id IS NOT NULL;

-- Index for default templates
CREATE INDEX idx_ban_reason_templates_defaults ON ban_reason_templates(is_default) WHERE is_default = TRUE;

-- Index for sorting by usage
CREATE INDEX idx_ban_reason_templates_usage ON ban_reason_templates(broadcaster_id, usage_count DESC);

-- Insert default templates
INSERT INTO ban_reason_templates (name, reason, duration_seconds, is_default, broadcaster_id) VALUES
    ('Spam', 'Spamming chat with repeated messages', 600, TRUE, NULL),
    ('Harassment', 'Harassment or hate speech', NULL, TRUE, NULL),
    ('NSFW Content', 'Posting NSFW or inappropriate content', 86400, TRUE, NULL),
    ('Self-Promotion', 'Unauthorized self-promotion or advertising', 3600, TRUE, NULL),
    ('Trolling', 'Disruptive behavior or trolling', 1800, TRUE, NULL),
    ('Spoilers', 'Posting spoilers without warning', 600, TRUE, NULL);
