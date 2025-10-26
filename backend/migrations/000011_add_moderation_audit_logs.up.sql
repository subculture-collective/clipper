-- Moderation audit logs table for tracking all moderation actions
CREATE TABLE moderation_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(50) NOT NULL, -- approve, reject, bulk_approve, bulk_reject
    entity_type VARCHAR(50) NOT NULL, -- clip_submission, clip, comment, user
    entity_id UUID NOT NULL,
    moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT,
    metadata JSONB, -- Store additional context (e.g., bulk action details, tags, filters used)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_moderator ON moderation_audit_logs(moderator_id);
CREATE INDEX idx_audit_logs_entity ON moderation_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON moderation_audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON moderation_audit_logs(action);

-- Add reason templates as enum-like constraint (can be extended)
ALTER TABLE clip_submissions 
    ADD CONSTRAINT check_rejection_reason_length CHECK (LENGTH(rejection_reason) <= 1000);

-- Add indexes for filtering submissions
CREATE INDEX idx_submissions_is_nsfw ON clip_submissions(is_nsfw) WHERE status = 'pending';
CREATE INDEX idx_submissions_broadcaster ON clip_submissions(broadcaster_name) WHERE status = 'pending';
CREATE INDEX idx_submissions_creator ON clip_submissions(creator_name) WHERE status = 'pending';
