-- Create outbound_webhook_dead_letter_queue table for permanently failed webhook deliveries
CREATE TABLE IF NOT EXISTS outbound_webhook_dead_letter_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    delivery_id UUID NOT NULL, -- Original delivery ID
    event_type VARCHAR(100) NOT NULL,
    event_id UUID NOT NULL,
    payload JSONB NOT NULL,
    error_message TEXT NOT NULL,
    http_status_code INT,
    response_body TEXT,
    attempt_count INT NOT NULL,
    original_created_at TIMESTAMP NOT NULL, -- When the delivery was first created
    moved_to_dlq_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    replayed_at TIMESTAMP,
    replay_successful BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on subscription_id for quick lookups
CREATE INDEX idx_outbound_webhook_dlq_subscription_id ON outbound_webhook_dead_letter_queue(subscription_id);

-- Create index on event_type for filtering by event type
CREATE INDEX idx_outbound_webhook_dlq_event_type ON outbound_webhook_dead_letter_queue(event_type);

-- Create index on moved_to_dlq_at for time-based queries
CREATE INDEX idx_outbound_webhook_dlq_moved_at ON outbound_webhook_dead_letter_queue(moved_to_dlq_at);

-- Create index on replayed_at for filtering replayed items
CREATE INDEX idx_outbound_webhook_dlq_replayed_at ON outbound_webhook_dead_letter_queue(replayed_at) WHERE replayed_at IS NOT NULL;
