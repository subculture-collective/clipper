-- Add grace_period_end to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN grace_period_end TIMESTAMPTZ;

-- Create payment_failures table to track failed payments
CREATE TABLE IF NOT EXISTS payment_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    stripe_invoice_id VARCHAR(255) NOT NULL,
    stripe_payment_intent_id VARCHAR(255),
    amount_due BIGINT NOT NULL, -- Amount in cents
    currency VARCHAR(3) NOT NULL DEFAULT 'usd',
    attempt_count INTEGER NOT NULL DEFAULT 1,
    failure_reason TEXT,
    next_retry_at TIMESTAMPTZ,
    resolved BOOLEAN NOT NULL DEFAULT false,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_failures_subscription ON payment_failures(subscription_id);
CREATE INDEX idx_payment_failures_invoice ON payment_failures(stripe_invoice_id);
CREATE INDEX idx_payment_failures_resolved ON payment_failures(resolved, next_retry_at);

-- Create dunning_attempts table to track communication with users
CREATE TABLE IF NOT EXISTS dunning_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_failure_id UUID NOT NULL REFERENCES payment_failures(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- 'payment_failed', 'payment_retry', 'grace_period_warning', 'subscription_downgraded'
    email_sent BOOLEAN NOT NULL DEFAULT false,
    email_sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dunning_attempts_failure ON dunning_attempts(payment_failure_id);
CREATE INDEX idx_dunning_attempts_user ON dunning_attempts(user_id);
CREATE INDEX idx_dunning_attempts_created ON dunning_attempts(created_at);

-- Add comment documentation
COMMENT ON TABLE payment_failures IS 'Tracks failed payment attempts for subscriptions with retry information';
COMMENT ON TABLE dunning_attempts IS 'Tracks dunning communication attempts to users about failed payments';
COMMENT ON COLUMN subscriptions.grace_period_end IS 'End of grace period during which user retains premium access despite payment failure';
