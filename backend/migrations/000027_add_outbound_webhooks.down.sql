-- Drop webhook tables
DROP TRIGGER IF EXISTS trigger_webhook_deliveries_updated_at ON webhook_deliveries;
DROP FUNCTION IF EXISTS update_webhook_deliveries_updated_at();

DROP TRIGGER IF EXISTS trigger_webhook_subscriptions_updated_at ON webhook_subscriptions;
DROP FUNCTION IF EXISTS update_webhook_subscriptions_updated_at();

DROP TABLE IF EXISTS webhook_deliveries;
DROP TABLE IF EXISTS webhook_subscriptions;
