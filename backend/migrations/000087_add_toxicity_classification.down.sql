-- Rollback toxicity classification system

-- Drop view
DROP VIEW IF EXISTS toxicity_metrics;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trg_auto_flag_toxic_comment ON toxicity_predictions;
DROP FUNCTION IF EXISTS auto_flag_toxic_comment();

-- Drop tables
DROP TABLE IF EXISTS toxicity_review_feedback;
DROP TABLE IF EXISTS toxicity_predictions;

-- Note: We don't remove the metadata column from moderation_queue
-- as it might be used by other features
