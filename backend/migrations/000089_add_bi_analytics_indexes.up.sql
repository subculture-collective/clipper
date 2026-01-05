-- Add indexes to optimize Metabase BI dashboard queries
-- These indexes improve performance for analytics queries on large datasets

-- Analytics events indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_user_type
    ON analytics_events(created_at DESC, user_id, event_type)
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created_clip
    ON analytics_events(event_type, created_at DESC, clip_id)
    WHERE clip_id IS NOT NULL;

-- Subscriptions indexes for revenue analytics
CREATE INDEX IF NOT EXISTS idx_subscriptions_status_tier_created
    ON subscriptions(status, tier, created_at DESC)
    WHERE tier != 'free';

CREATE INDEX IF NOT EXISTS idx_subscriptions_canceled_at
    ON subscriptions(canceled_at DESC)
    WHERE canceled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_period_dates
    ON subscriptions(current_period_start DESC, current_period_end DESC)
    WHERE status = 'active';

-- Stripe payment intents indexes for revenue tracking
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_created_status_amount
    ON stripe_payment_intents(created_at DESC, status, amount_cents)
    WHERE status = 'succeeded';

CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_customer_created
    ON stripe_payment_intents(stripe_customer_id, created_at DESC, status);

-- User analytics composite index
CREATE INDEX IF NOT EXISTS idx_users_created_at_active
    ON users(created_at DESC)
    WHERE is_banned = false;

-- Clips for content analytics
CREATE INDEX IF NOT EXISTS idx_clips_created_game_removed
    ON clips(created_at DESC, game_name, is_removed)
    WHERE is_removed = false;

CREATE INDEX IF NOT EXISTS idx_clips_creator_created_removed
    ON clips(creator_name, created_at DESC, is_removed)
    WHERE is_removed = false;

-- Subscription events for audit and timeline queries
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_type
    ON subscription_events(created_at DESC, event_type);

-- Comments for engagement metrics
CREATE INDEX IF NOT EXISTS idx_comments_created_user_removed
    ON comments(created_at DESC, user_id, is_removed)
    WHERE is_removed = false;
