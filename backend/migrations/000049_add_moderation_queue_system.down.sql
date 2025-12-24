-- Drop moderation queue system

DROP TRIGGER IF EXISTS trg_moderation_queue_reviewed ON moderation_queue;
DROP FUNCTION IF EXISTS update_moderation_queue_reviewed();

DROP TABLE IF EXISTS moderation_decisions;
DROP TABLE IF EXISTS moderation_queue;
