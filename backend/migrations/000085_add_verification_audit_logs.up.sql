-- Verification Audit Logs
-- Stores periodic audit results for verified users

CREATE TABLE verification_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Audit details
    audit_type VARCHAR(50) NOT NULL, -- 'periodic_check', 'manual_review', 'abuse_detection'
    status VARCHAR(20) NOT NULL, -- 'passed', 'flagged', 'revoked'
    
    -- Audit findings
    findings JSONB, -- Detailed audit findings (follower count changes, engagement metrics, etc.)
    notes TEXT,
    
    -- Auditor info (NULL for automated audits)
    audited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Action taken
    action_taken VARCHAR(50), -- 'none', 'warning_sent', 'verification_revoked', 'further_review_required'
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT audit_log_valid_type CHECK (audit_type IN ('periodic_check', 'manual_review', 'abuse_detection')),
    CONSTRAINT audit_log_valid_status CHECK (status IN ('passed', 'flagged', 'revoked')),
    CONSTRAINT audit_log_valid_action CHECK (action_taken IN ('none', 'warning_sent', 'verification_revoked', 'further_review_required') OR action_taken IS NULL)
);

-- Indexes for efficient queries
CREATE INDEX idx_verification_audit_user_id ON verification_audit_logs(user_id);
CREATE INDEX idx_verification_audit_status ON verification_audit_logs(status);
CREATE INDEX idx_verification_audit_type ON verification_audit_logs(audit_type);
CREATE INDEX idx_verification_audit_created_at ON verification_audit_logs(created_at DESC);
CREATE INDEX idx_verification_audit_audited_by ON verification_audit_logs(audited_by);

-- Index for finding flagged audits
CREATE INDEX idx_verification_audit_flagged ON verification_audit_logs(status, created_at DESC) 
WHERE status IN ('flagged', 'revoked');
