-- Drop indexes for filtering submissions
DROP INDEX IF EXISTS idx_submissions_creator;
DROP INDEX IF EXISTS idx_submissions_broadcaster;
DROP INDEX IF EXISTS idx_submissions_is_nsfw;

-- Remove constraint
ALTER TABLE clip_submissions 
    DROP CONSTRAINT IF EXISTS check_rejection_reason_length;

-- Drop audit logs table
DROP INDEX IF EXISTS idx_audit_logs_action;
DROP INDEX IF EXISTS idx_audit_logs_created;
DROP INDEX IF EXISTS idx_audit_logs_entity;
DROP INDEX IF EXISTS idx_audit_logs_moderator;
DROP TABLE IF EXISTS moderation_audit_logs;
