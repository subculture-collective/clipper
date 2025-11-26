-- Create webhook_retry_queue table for tracking webhook processing retries
CREATE TABLE IF NOT EXISTS webhook_retry_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on stripe_event_id for quick lookups
CREATE INDEX idx_webhook_retry_queue_stripe_event_id ON webhook_retry_queue(stripe_event_id);

-- Create index on next_retry_at for processing pending retries
CREATE INDEX idx_webhook_retry_queue_next_retry_at ON webhook_retry_queue(next_retry_at);

-- Create index on event_type for filtering
CREATE INDEX idx_webhook_retry_queue_event_type ON webhook_retry_queue(event_type);

-- Create webhook_dead_letter_queue table for permanently failed webhooks
CREATE TABLE IF NOT EXISTS webhook_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    retry_count INT NOT NULL,
    error TEXT NOT NULL,
    original_timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on stripe_event_id for lookups
CREATE INDEX idx_webhook_dlq_stripe_event_id ON webhook_dead_letter_queue(stripe_event_id);

-- Create index on event_type for filtering
CREATE INDEX idx_webhook_dlq_event_type ON webhook_dead_letter_queue(event_type);

-- Create index on created_at for time-based queries
CREATE INDEX idx_webhook_dlq_created_at ON webhook_dead_letter_queue(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_retry_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_webhook_retry_queue_updated_at
    BEFORE UPDATE ON webhook_retry_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_retry_queue_updated_at();
