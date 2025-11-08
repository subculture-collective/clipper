-- Drop tables (trigger is automatically dropped with the table)
DROP TABLE IF EXISTS webhook_dead_letter_queue;
DROP TABLE IF EXISTS webhook_retry_queue;

-- Drop function
DROP FUNCTION IF EXISTS update_webhook_retry_queue_updated_at();
