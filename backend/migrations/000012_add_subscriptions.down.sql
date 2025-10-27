-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_subscriptions_updated_at ON subscriptions;
DROP FUNCTION IF EXISTS update_subscriptions_updated_at();

-- Drop tables
DROP TABLE IF EXISTS subscription_events;
DROP TABLE IF EXISTS subscriptions;
