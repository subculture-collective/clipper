-- Remove NSFW Detection System

-- Drop trigger and function
DROP TRIGGER IF EXISTS trg_nsfw_scan_progress ON nsfw_scan_jobs;
DROP FUNCTION IF EXISTS update_nsfw_scan_progress();

-- Drop tables
DROP TABLE IF EXISTS nsfw_scan_jobs;
DROP TABLE IF EXISTS nsfw_detection_metrics;

-- Drop indexes
DROP INDEX IF EXISTS idx_modqueue_nsfw_reason;

-- Remove columns from moderation queue
ALTER TABLE moderation_queue
DROP COLUMN IF EXISTS nsfw_categories,
DROP COLUMN IF EXISTS nsfw_detected_at;
