-- Add verification status to users table
ALTER TABLE users
ADD COLUMN is_verified BOOLEAN DEFAULT false,
ADD COLUMN verified_at TIMESTAMP;

-- Creator verification applications table
CREATE TABLE creator_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected, revoked
    
    -- Application data
    application_reason TEXT,
    identity_document_type VARCHAR(50), -- government_id, passport, other
    identity_verified BOOLEAN DEFAULT false,
    identity_verified_at TIMESTAMP,
    identity_verified_by UUID REFERENCES users(id),
    
    -- Eligibility criteria
    follower_count INT,
    content_creation_months INT,
    platform_username VARCHAR(255),
    platform_url TEXT,
    
    -- Review information
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    rejection_reason TEXT,
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_active_application UNIQUE (user_id, status)
);

-- Create indexes for common queries
CREATE INDEX idx_creator_verifications_user_id ON creator_verifications(user_id);
CREATE INDEX idx_creator_verifications_status ON creator_verifications(status);
CREATE INDEX idx_creator_verifications_created_at ON creator_verifications(created_at DESC);

-- Verification audit log table
CREATE TABLE verification_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID NOT NULL REFERENCES creator_verifications(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- submitted, identity_verified, approved, rejected, revoked
    performed_by UUID REFERENCES users(id),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_verification_audit_logs_verification_id ON verification_audit_logs(verification_id);
CREATE INDEX idx_verification_audit_logs_created_at ON verification_audit_logs(created_at DESC);

-- Add comment on tables
COMMENT ON TABLE creator_verifications IS 'Stores creator verification applications and their status';
COMMENT ON TABLE verification_audit_logs IS 'Audit trail for all verification-related actions';
