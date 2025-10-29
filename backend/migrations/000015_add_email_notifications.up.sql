-- Add email notification audit log table
CREATE TABLE IF NOT EXISTS email_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL, -- pending, sent, failed, bounced
    provider_message_id VARCHAR(255),
    error_message TEXT,
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_email_logs_user ON email_notification_logs(user_id, created_at DESC);
CREATE INDEX idx_email_logs_status ON email_notification_logs(status, created_at DESC);
CREATE INDEX idx_email_logs_type ON email_notification_logs(notification_type);

-- Add unsubscribe tokens table
CREATE TABLE IF NOT EXISTS email_unsubscribe_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    notification_type VARCHAR(50), -- null means unsubscribe from all
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP
);

-- Create indexes for token lookup
CREATE INDEX idx_unsubscribe_tokens_token ON email_unsubscribe_tokens(token) WHERE used_at IS NULL;
CREATE INDEX idx_unsubscribe_tokens_user ON email_unsubscribe_tokens(user_id);
CREATE INDEX idx_unsubscribe_tokens_expires ON email_unsubscribe_tokens(expires_at) WHERE used_at IS NULL;

-- Add rate limiting table for email notifications
CREATE TABLE IF NOT EXISTS email_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    window_start TIMESTAMP NOT NULL,
    email_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique index to prevent duplicate rate limit entries
CREATE UNIQUE INDEX idx_email_rate_limits_user_window ON email_rate_limits(user_id, window_start);
CREATE INDEX idx_email_rate_limits_window ON email_rate_limits(window_start);
