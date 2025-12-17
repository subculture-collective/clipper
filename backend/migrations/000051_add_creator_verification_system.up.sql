-- Creator Verification System
-- Applications and review queue for creator verification badges

-- Creator Verification Applications Table
CREATE TABLE creator_verification_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Application details
    twitch_channel_url VARCHAR(500) NOT NULL,
    follower_count INT,
    subscriber_count INT,
    avg_viewers INT,
    content_description TEXT,
    social_media_links JSONB, -- {twitter: "", instagram: "", youtube: "", etc.}
    
    -- Review status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    priority INT DEFAULT 50, -- Higher = more urgent (0-100 scale)
    
    -- Review details
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    reviewer_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT verification_app_valid_status CHECK (status IN ('pending', 'approved', 'rejected')),
    CONSTRAINT verification_app_valid_priority CHECK (priority >= 0 AND priority <= 100)
);

-- Indexes for efficient queries
CREATE INDEX idx_verification_app_user_id ON creator_verification_applications(user_id);
CREATE INDEX idx_verification_app_status_priority ON creator_verification_applications(status, priority DESC, created_at);
CREATE INDEX idx_verification_app_reviewed_by ON creator_verification_applications(reviewed_by);
CREATE INDEX idx_verification_app_created_at ON creator_verification_applications(created_at DESC);

-- Only allow one pending application per user
CREATE UNIQUE INDEX uq_verification_app_user_pending ON creator_verification_applications(user_id) 
WHERE status = 'pending';

-- Creator Verification Decisions Table (Audit Trail)
CREATE TABLE creator_verification_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES creator_verification_applications(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    
    -- Decision details
    decision VARCHAR(20) NOT NULL, -- 'approved', 'rejected'
    notes TEXT,
    metadata JSONB, -- Additional context
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT verification_decision_valid_decision CHECK (decision IN ('approved', 'rejected'))
);

-- Indexes for audit trail
CREATE INDEX idx_verification_decision_application ON creator_verification_decisions(application_id);
CREATE INDEX idx_verification_decision_reviewer ON creator_verification_decisions(reviewer_id);
CREATE INDEX idx_verification_decision_created_at ON creator_verification_decisions(created_at DESC);

-- Add verified status to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;

-- Create indexes for verified users
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified) WHERE is_verified = TRUE;

-- Function to automatically update reviewed_at when status changes
CREATE OR REPLACE FUNCTION update_verification_application_reviewed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != 'pending' AND OLD.status = 'pending' THEN
        NEW.reviewed_at = NOW();
        NEW.updated_at = NOW();
        
        -- Ensure reviewed_by is set by application code
        IF NEW.reviewed_by IS NULL THEN
            RAISE EXCEPTION 'reviewed_by must be set when changing status from pending';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_verification_application_reviewed
    BEFORE UPDATE ON creator_verification_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_verification_application_reviewed();

-- Function to update user verification status when application is approved
CREATE OR REPLACE FUNCTION update_user_verification_status()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        UPDATE users 
        SET is_verified = TRUE,
            verified_at = NOW(),
            updated_at = NOW()
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_verification
    AFTER UPDATE ON creator_verification_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_user_verification_status();
