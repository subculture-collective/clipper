-- Fix moderation audit logs foreign key constraint to cascade on delete
-- This prevents user deletion from being blocked by orphaned audit log references

ALTER TABLE moderation_audit_logs
DROP CONSTRAINT moderation_audit_logs_moderator_id_fkey;

ALTER TABLE moderation_audit_logs
ADD CONSTRAINT moderation_audit_logs_moderator_id_fkey
FOREIGN KEY (moderator_id) REFERENCES users(id) ON DELETE CASCADE;
