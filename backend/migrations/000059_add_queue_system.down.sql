-- Drop cleanup function
DROP FUNCTION IF EXISTS cleanup_stale_queues();

-- Drop indexes
DROP INDEX IF EXISTS idx_queue_added_at;
DROP INDEX IF EXISTS idx_queue_clip;
DROP INDEX IF EXISTS idx_queue_user_position;

-- Drop queue_items table
DROP TABLE IF EXISTS queue_items;
