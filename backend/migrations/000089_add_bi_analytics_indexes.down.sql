-- Remove BI analytics indexes

DROP INDEX IF EXISTS idx_analytics_events_created_user_type;
DROP INDEX IF EXISTS idx_analytics_events_type_created_clip;
DROP INDEX IF EXISTS idx_subscriptions_status_tier_created;
DROP INDEX IF EXISTS idx_subscriptions_canceled_at;
DROP INDEX IF EXISTS idx_subscriptions_period_dates;
DROP INDEX IF EXISTS idx_stripe_payment_intents_created_status_amount;
DROP INDEX IF EXISTS idx_stripe_payment_intents_customer_created;
DROP INDEX IF EXISTS idx_users_created_at_active;
DROP INDEX IF EXISTS idx_clips_created_game_removed;
DROP INDEX IF EXISTS idx_clips_creator_created_removed;
DROP INDEX IF EXISTS idx_subscription_events_created_type;
DROP INDEX IF EXISTS idx_comments_created_user_removed;
