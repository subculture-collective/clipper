-- Add comprehensive email monitoring and metrics tracking

-- Email logs table for tracking all email events (SendGrid webhooks)
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    template VARCHAR(100),
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL,  -- delivered, processed, bounce, dropped, open, click, spam_report, unsubscribe, deferred
    event_type VARCHAR(50) NOT NULL, -- SendGrid event type
    sendgrid_message_id VARCHAR(255), -- SendGrid message ID for tracking
    sendgrid_event_id VARCHAR(255), -- SendGrid event ID (unique per event)
    bounce_type VARCHAR(50), -- hard, soft (for bounce events)
    bounce_reason TEXT, -- Detailed bounce reason
    spam_report_reason TEXT, -- Spam report details
    link_url TEXT, -- URL clicked (for click events)
    ip_address VARCHAR(50), -- IP address from event
    user_agent TEXT, -- User agent from event
    metadata JSONB, -- Full SendGrid event data
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    spam_reported_at TIMESTAMP,
    unsubscribed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_template ON email_logs(template) WHERE template IS NOT NULL;
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient);
CREATE INDEX idx_email_logs_sendgrid_message_id ON email_logs(sendgrid_message_id) WHERE sendgrid_message_id IS NOT NULL;
CREATE INDEX idx_email_logs_sendgrid_event_id ON email_logs(sendgrid_event_id) WHERE sendgrid_event_id IS NOT NULL;
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);

-- Email metrics summary table for aggregated daily/hourly stats
CREATE TABLE IF NOT EXISTS email_metrics_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    granularity VARCHAR(20) NOT NULL, -- hourly, daily
    template VARCHAR(100), -- null for overall metrics
    total_sent INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_bounced INT DEFAULT 0,
    total_hard_bounced INT DEFAULT 0,
    total_soft_bounced INT DEFAULT 0,
    total_dropped INT DEFAULT 0,
    total_opened INT DEFAULT 0,
    total_clicked INT DEFAULT 0,
    total_spam_reports INT DEFAULT 0,
    total_unsubscribes INT DEFAULT 0,
    unique_opened INT DEFAULT 0, -- Unique recipients who opened
    unique_clicked INT DEFAULT 0, -- Unique recipients who clicked
    bounce_rate DECIMAL(5,2), -- Percentage
    open_rate DECIMAL(5,2), -- Percentage
    click_rate DECIMAL(5,2), -- Percentage
    spam_rate DECIMAL(5,2), -- Percentage
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for metrics queries
CREATE INDEX idx_email_metrics_period ON email_metrics_summary(period_start DESC, granularity);
CREATE INDEX idx_email_metrics_template ON email_metrics_summary(template, period_start DESC) WHERE template IS NOT NULL;
CREATE UNIQUE INDEX idx_email_metrics_unique ON email_metrics_summary(period_start, granularity, COALESCE(template, ''));

-- Email alerts table for tracking triggered alerts
CREATE TABLE IF NOT EXISTS email_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL, -- high_bounce_rate, high_complaint_rate, send_errors, open_rate_drop, unsubscribe_spike
    severity VARCHAR(20) NOT NULL, -- warning, critical
    metric_name VARCHAR(50) NOT NULL,
    current_value DECIMAL(10,2),
    threshold_value DECIMAL(10,2),
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    triggered_at TIMESTAMP DEFAULT NOW(),
    acknowledged_at TIMESTAMP,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for alert queries
CREATE INDEX idx_email_alerts_type ON email_alerts(alert_type, triggered_at DESC);
CREATE INDEX idx_email_alerts_triggered_at ON email_alerts(triggered_at DESC);
CREATE INDEX idx_email_alerts_unresolved ON email_alerts(resolved_at) WHERE resolved_at IS NULL;

-- Update email_notification_logs to track SendGrid message IDs
-- This allows correlation between notification logs and webhook events
ALTER TABLE email_notification_logs 
    ADD COLUMN IF NOT EXISTS sendgrid_message_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS event_type VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_email_notification_logs_sendgrid_id 
    ON email_notification_logs(sendgrid_message_id) 
    WHERE sendgrid_message_id IS NOT NULL;
