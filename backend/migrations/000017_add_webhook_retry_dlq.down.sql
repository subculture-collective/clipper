-- Drop tables
DROP TABLE IF EXISTS webhook_dead_letter_queue;
DROP TABLE IF EXISTS webhook_retry_queue;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_webhook_retry_queue_updated_at ON webhook_retry_queue;
DROP FUNCTION IF EXISTS update_webhook_retry_queue_updated_at();
