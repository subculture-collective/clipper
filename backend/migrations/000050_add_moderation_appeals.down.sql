-- Drop moderation appeals system

DROP TRIGGER IF EXISTS trg_moderation_appeals_resolved ON moderation_appeals;
DROP FUNCTION IF EXISTS update_moderation_appeals_resolved();
DROP TABLE IF EXISTS moderation_appeals;
