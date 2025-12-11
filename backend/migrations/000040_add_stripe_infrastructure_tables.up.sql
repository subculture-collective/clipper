-- Create stripe_customers table for tracking Stripe customer sync
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);

-- Create stripe_subscriptions table for detailed subscription tracking
CREATE TABLE IF NOT EXISTS stripe_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_price_id VARCHAR(255),
    status VARCHAR(50) NOT NULL,
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,
    trial_start TIMESTAMP,
    trial_end TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stripe_subscriptions_subscription_id ON stripe_subscriptions(stripe_subscription_id);
CREATE INDEX idx_stripe_subscriptions_customer_id ON stripe_subscriptions(stripe_customer_id);
CREATE INDEX idx_stripe_subscriptions_status ON stripe_subscriptions(status);

-- Create stripe_payment_intents table for tracking payment attempts
CREATE TABLE IF NOT EXISTS stripe_payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_intent_id VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    stripe_customer_id VARCHAR(255),
    amount_cents INT NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    status VARCHAR(50) NOT NULL,
    payment_method_type VARCHAR(50),
    metadata JSONB,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stripe_payment_intents_intent_id ON stripe_payment_intents(stripe_intent_id);
CREATE INDEX idx_stripe_payment_intents_user_id ON stripe_payment_intents(user_id);
CREATE INDEX idx_stripe_payment_intents_customer_id ON stripe_payment_intents(stripe_customer_id);
CREATE INDEX idx_stripe_payment_intents_status ON stripe_payment_intents(status);
CREATE INDEX idx_stripe_payment_intents_idempotency_key ON stripe_payment_intents(idempotency_key);

-- Create stripe_webhooks_log table for comprehensive webhook event logging
CREATE TABLE IF NOT EXISTS stripe_webhooks_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_error TEXT,
    processing_attempts INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX idx_stripe_webhooks_log_event_id ON stripe_webhooks_log(event_id);
CREATE INDEX idx_stripe_webhooks_log_event_type ON stripe_webhooks_log(event_type);
CREATE INDEX idx_stripe_webhooks_log_processed ON stripe_webhooks_log(processed);
CREATE INDEX idx_stripe_webhooks_log_created_at ON stripe_webhooks_log(created_at);

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_stripe_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stripe_customers_updated_at
    BEFORE UPDATE ON stripe_customers
    FOR EACH ROW
    EXECUTE FUNCTION update_stripe_customers_updated_at();

CREATE OR REPLACE FUNCTION update_stripe_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stripe_subscriptions_updated_at
    BEFORE UPDATE ON stripe_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_stripe_subscriptions_updated_at();

CREATE OR REPLACE FUNCTION update_stripe_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_stripe_payment_intents_updated_at
    BEFORE UPDATE ON stripe_payment_intents
    FOR EACH ROW
    EXECUTE FUNCTION update_stripe_payment_intents_updated_at();

-- Add comments for documentation
COMMENT ON TABLE stripe_customers IS 'Tracks Stripe customer records synced with user accounts';
COMMENT ON TABLE stripe_subscriptions IS 'Detailed tracking of Stripe subscription lifecycle separate from internal subscriptions table';
COMMENT ON TABLE stripe_payment_intents IS 'Tracks all payment intent attempts including one-time payments with idempotency support';
COMMENT ON TABLE stripe_webhooks_log IS 'Comprehensive log of all Stripe webhook events received for debugging and audit purposes';
