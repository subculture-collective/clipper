-- Drop triggers
DROP TRIGGER IF EXISTS trigger_stripe_payment_intents_updated_at ON stripe_payment_intents;
DROP TRIGGER IF EXISTS trigger_stripe_subscriptions_updated_at ON stripe_subscriptions;
DROP TRIGGER IF EXISTS trigger_stripe_customers_updated_at ON stripe_customers;

-- Drop functions
DROP FUNCTION IF EXISTS update_stripe_payment_intents_updated_at();
DROP FUNCTION IF EXISTS update_stripe_subscriptions_updated_at();
DROP FUNCTION IF EXISTS update_stripe_customers_updated_at();

-- Drop tables
DROP TABLE IF EXISTS stripe_webhooks_log;
DROP TABLE IF EXISTS stripe_payment_intents;
DROP TABLE IF EXISTS stripe_subscriptions;
DROP TABLE IF EXISTS stripe_customers;
