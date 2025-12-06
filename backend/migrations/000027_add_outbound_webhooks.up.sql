-- Create webhook_subscriptions table for managing third-party webhook endpoints
CREATE TABLE IF NOT EXISTS webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    url VARCHAR(2048) NOT NULL,
    secret VARCHAR(255) NOT NULL, -- HMAC secret for signing webhooks
    events TEXT[] NOT NULL, -- Array of subscribed events: clip.submitted, clip.approved, clip.rejected
    is_active BOOLEAN NOT NULL DEFAULT true,
    description TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_delivery_at TIMESTAMP,
    
    -- Ensure URL is unique per user
    UNIQUE(user_id, url)
);

-- Create index on user_id for quick user lookups
CREATE INDEX idx_webhook_subscriptions_user_id ON webhook_subscriptions(user_id);

-- Create index on is_active for filtering active subscriptions
CREATE INDEX idx_webhook_subscriptions_active ON webhook_subscriptions(is_active);

-- Create index on events for event-based lookups (GIN index for array operations)
CREATE INDEX idx_webhook_subscriptions_events ON webhook_subscriptions USING GIN(events);

-- Create webhook_deliveries table for tracking webhook delivery attempts
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- clip.submitted, clip.approved, clip.rejected
    event_id UUID NOT NULL, -- submission_id
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, delivered, failed
    http_status_code INT,
    response_body TEXT,
    error_message TEXT,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMP,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on subscription_id for quick lookups
CREATE INDEX idx_webhook_deliveries_subscription_id ON webhook_deliveries(subscription_id);

-- Create index on status for filtering by status
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);

-- Create index on event_type for filtering by event type
CREATE INDEX idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);

-- Create index on next_attempt_at for processing retries
CREATE INDEX idx_webhook_deliveries_next_attempt ON webhook_deliveries(next_attempt_at) WHERE status = 'pending';

-- Create index on created_at for time-based queries
CREATE INDEX idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- Add trigger to update updated_at timestamp for webhook_subscriptions
CREATE OR REPLACE FUNCTION update_webhook_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_webhook_subscriptions_updated_at
    BEFORE UPDATE ON webhook_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_subscriptions_updated_at();

-- Add trigger to update updated_at timestamp for webhook_deliveries
CREATE OR REPLACE FUNCTION update_webhook_deliveries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_webhook_deliveries_updated_at
    BEFORE UPDATE ON webhook_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_deliveries_updated_at();
