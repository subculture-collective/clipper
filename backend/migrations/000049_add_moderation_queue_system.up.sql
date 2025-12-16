-- Moderation Queue System
-- Comprehensive queue for reviewing flagged content with bulk actions and decision tracking

-- Moderation Queue Table
CREATE TABLE moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(20) NOT NULL, -- 'comment', 'clip', 'user', 'submission'
    content_id UUID NOT NULL,
    reason VARCHAR(50) NOT NULL, -- 'spam', 'harassment', 'inappropriate', 'offensive', 'other'
    priority INT DEFAULT 50, -- Higher = more urgent (0-100 scale)
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'escalated'
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    reported_by UUID[] DEFAULT '{}', -- Array of user IDs who reported
    report_count INT DEFAULT 0,
    auto_flagged BOOLEAN DEFAULT FALSE, -- Was it auto-detected by AI/rules?
    confidence_score DECIMAL(3,2), -- AI confidence (0.00-1.00) if auto-flagged
    created_at TIMESTAMP DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT moderation_queue_valid_content_type CHECK (content_type IN ('comment', 'clip', 'user', 'submission')),
    CONSTRAINT moderation_queue_valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
    CONSTRAINT moderation_queue_valid_priority CHECK (priority >= 0 AND priority <= 100),
    CONSTRAINT moderation_queue_valid_confidence CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1))
);

-- Indexes for efficient queue queries
CREATE INDEX idx_modqueue_status_priority ON moderation_queue(status, priority DESC, created_at);
CREATE INDEX idx_modqueue_content ON moderation_queue(content_type, content_id);
CREATE INDEX idx_modqueue_assigned_to ON moderation_queue(assigned_to) WHERE status = 'pending';
CREATE INDEX idx_modqueue_auto_flagged ON moderation_queue(auto_flagged) WHERE status = 'pending';
CREATE INDEX idx_modqueue_created_at ON moderation_queue(created_at DESC);

-- Moderation Decisions Table (Audit Trail)
CREATE TABLE moderation_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_item_id UUID NOT NULL REFERENCES moderation_queue(id) ON DELETE CASCADE,
    moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(20) NOT NULL, -- 'approve', 'reject', 'escalate', 'ban_user'
    reason TEXT, -- Optional explanation for the decision
    metadata JSONB, -- Additional context (e.g., bulk action details)
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT moderation_decisions_valid_action CHECK (action IN ('approve', 'reject', 'escalate', 'ban_user'))
);

-- Indexes for decision tracking
CREATE INDEX idx_moddecisions_queue_item ON moderation_decisions(queue_item_id);
CREATE INDEX idx_moddecisions_moderator ON moderation_decisions(moderator_id);
CREATE INDEX idx_moddecisions_created_at ON moderation_decisions(created_at DESC);
CREATE INDEX idx_moddecisions_action ON moderation_decisions(action);

-- Add function to automatically update reviewed_at and reviewed_by when status changes
CREATE OR REPLACE FUNCTION update_moderation_queue_reviewed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != 'pending' AND OLD.status = 'pending' THEN
        NEW.reviewed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_moderation_queue_reviewed
    BEFORE UPDATE ON moderation_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_moderation_queue_reviewed();
