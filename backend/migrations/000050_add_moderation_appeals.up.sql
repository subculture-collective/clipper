-- Moderation Appeals System
-- Allows users to appeal moderation decisions with admin review workflow

-- Moderation Appeals Table
CREATE TABLE moderation_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    moderation_action_id UUID NOT NULL REFERENCES moderation_decisions(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolution TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    CONSTRAINT moderation_appeals_valid_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Indexes for efficient appeal queries
CREATE INDEX idx_appeals_status_created ON moderation_appeals(status, created_at);
CREATE INDEX idx_appeals_user_id ON moderation_appeals(user_id);
CREATE INDEX idx_appeals_moderation_action ON moderation_appeals(moderation_action_id);
-- Partial index on resolved_by: only index non-null values since we never query for NULL resolved_by
-- This reduces index size and improves write performance while supporting queries filtering by resolver
CREATE INDEX idx_appeals_resolved_by ON moderation_appeals(resolved_by) WHERE resolved_by IS NOT NULL;

-- Prevent duplicate appeals for the same moderation action
-- Only one pending appeal per moderation action is allowed
CREATE UNIQUE INDEX uq_appeals_action_pending ON moderation_appeals(moderation_action_id) 
WHERE status = 'pending';

-- Add function to automatically update resolved_at when status changes
CREATE OR REPLACE FUNCTION update_moderation_appeals_resolved()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != 'pending' AND OLD.status = 'pending' THEN
        NEW.resolved_at = NOW();
        -- Ensure resolved_by is set by application code
        IF NEW.resolved_by IS NULL THEN
            RAISE EXCEPTION 'resolved_by must be set when changing status from pending';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_moderation_appeals_resolved
    BEFORE UPDATE ON moderation_appeals
    FOR EACH ROW
    EXECUTE FUNCTION update_moderation_appeals_resolved();
