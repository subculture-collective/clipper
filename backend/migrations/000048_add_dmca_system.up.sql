-- DMCA Takedown System
-- Implements DMCA compliance for copyright takedown notices, counter-notices, and repeat infringer tracking

-- DMCA Notices Table
CREATE TABLE dmca_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complainant_name VARCHAR(255) NOT NULL,
    complainant_email VARCHAR(255) NOT NULL,
    complainant_address TEXT NOT NULL,
    complainant_phone VARCHAR(50),
    relationship VARCHAR(50) NOT NULL, -- 'owner' or 'agent'
    copyrighted_work_description TEXT NOT NULL,
    infringing_urls TEXT[] NOT NULL, -- array of URLs
    good_faith_statement BOOLEAN NOT NULL DEFAULT false,
    accuracy_statement BOOLEAN NOT NULL DEFAULT false,
    signature VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, valid, invalid, processed
    notes TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT dmca_notices_valid_relationship CHECK (relationship IN ('owner', 'agent')),
    CONSTRAINT dmca_notices_valid_status CHECK (status IN ('pending', 'valid', 'invalid', 'processed'))
);

CREATE INDEX idx_dmca_notices_status ON dmca_notices(status);
CREATE INDEX idx_dmca_notices_submitted_at ON dmca_notices(submitted_at DESC);
CREATE INDEX idx_dmca_notices_complainant_email ON dmca_notices(complainant_email);
CREATE INDEX idx_dmca_notices_reviewed_by ON dmca_notices(reviewed_by);

-- DMCA Counter-Notices Table
CREATE TABLE dmca_counter_notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dmca_notice_id UUID NOT NULL REFERENCES dmca_notices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_address TEXT NOT NULL,
    user_phone VARCHAR(50),
    removed_material_url TEXT NOT NULL,
    removed_material_description TEXT,
    good_faith_statement BOOLEAN NOT NULL DEFAULT false,
    consent_to_jurisdiction BOOLEAN NOT NULL DEFAULT false,
    consent_to_service BOOLEAN NOT NULL DEFAULT false,
    signature VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    forwarded_at TIMESTAMP, -- when sent to complainant
    waiting_period_ends TIMESTAMP, -- submitted_at + 14 days
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, forwarded, waiting, reinstated, rejected
    lawsuit_filed BOOLEAN DEFAULT false,
    lawsuit_filed_at TIMESTAMP,
    notes TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT dmca_counter_notices_valid_status CHECK (status IN ('pending', 'forwarded', 'waiting', 'reinstated', 'rejected'))
);

CREATE INDEX idx_dmca_counter_notices_dmca_notice_id ON dmca_counter_notices(dmca_notice_id);
CREATE INDEX idx_dmca_counter_notices_user_id ON dmca_counter_notices(user_id);
CREATE INDEX idx_dmca_counter_notices_status ON dmca_counter_notices(status);
CREATE INDEX idx_dmca_counter_notices_waiting_period ON dmca_counter_notices(waiting_period_ends) WHERE waiting_period_ends IS NOT NULL;
CREATE INDEX idx_dmca_counter_notices_submitted_at ON dmca_counter_notices(submitted_at DESC);

-- DMCA Strikes Table (Repeat Infringer Tracking)
CREATE TABLE dmca_strikes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dmca_notice_id UUID NOT NULL REFERENCES dmca_notices(id) ON DELETE RESTRICT,
    clip_id UUID REFERENCES clips(id) ON DELETE SET NULL,
    submission_id UUID, -- May reference clip_submissions but not foreign key for flexibility
    strike_number INT NOT NULL, -- 1, 2, or 3
    issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL, -- issued_at + 12 months
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, removed, expired
    removal_reason TEXT, -- if removed: 'counter_notice_successful', 'admin_override', 'expired'
    removed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT dmca_strikes_valid_status CHECK (status IN ('active', 'removed', 'expired')),
    CONSTRAINT dmca_strikes_valid_strike_number CHECK (strike_number >= 1 AND strike_number <= 3)
);

CREATE INDEX idx_dmca_strikes_user_id ON dmca_strikes(user_id);
CREATE INDEX idx_dmca_strikes_user_status ON dmca_strikes(user_id, status) WHERE status = 'active';
CREATE INDEX idx_dmca_strikes_status ON dmca_strikes(status);
CREATE INDEX idx_dmca_strikes_expires_at ON dmca_strikes(expires_at) WHERE status = 'active';
CREATE INDEX idx_dmca_strikes_dmca_notice_id ON dmca_strikes(dmca_notice_id);

-- Add DMCA fields to clips table
ALTER TABLE clips ADD COLUMN IF NOT EXISTS dmca_removed BOOLEAN DEFAULT false;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS dmca_notice_id UUID REFERENCES dmca_notices(id) ON DELETE SET NULL;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS dmca_removed_at TIMESTAMP;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS dmca_reinstated_at TIMESTAMP;

CREATE INDEX idx_clips_dmca_removed ON clips(dmca_removed) WHERE dmca_removed = true;
CREATE INDEX idx_clips_dmca_notice_id ON clips(dmca_notice_id) WHERE dmca_notice_id IS NOT NULL;

-- Add DMCA suspension tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS dmca_strikes_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dmca_suspended_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dmca_terminated BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dmca_terminated_at TIMESTAMP;

CREATE INDEX idx_users_dmca_suspended ON users(dmca_suspended_until) WHERE dmca_suspended_until IS NOT NULL;
CREATE INDEX idx_users_dmca_terminated ON users(dmca_terminated) WHERE dmca_terminated = true;

-- Function to update dmca_strikes_count automatically
CREATE OR REPLACE FUNCTION update_user_dmca_strikes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE users
        SET dmca_strikes_count = (
            SELECT COUNT(*)
            FROM dmca_strikes
            WHERE user_id = NEW.user_id
            AND status = 'active'
        )
        WHERE id = NEW.user_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        UPDATE users
        SET dmca_strikes_count = (
            SELECT COUNT(*)
            FROM dmca_strikes
            WHERE user_id = OLD.user_id
            AND status = 'active'
        )
        WHERE id = OLD.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_dmca_strikes_count
AFTER INSERT OR UPDATE OR DELETE ON dmca_strikes
FOR EACH ROW
EXECUTE FUNCTION update_user_dmca_strikes_count();

-- Audit log entries for DMCA actions
-- Leveraging existing moderation_audit_logs table
-- Add DMCA-specific action types:
-- - 'dmca_notice_received'
-- - 'dmca_notice_validated'
-- - 'dmca_notice_rejected'
-- - 'dmca_content_removed'
-- - 'dmca_counter_notice_received'
-- - 'dmca_counter_notice_forwarded'
-- - 'dmca_content_reinstated'
-- - 'dmca_strike_issued'
-- - 'dmca_strike_removed'
-- - 'dmca_user_suspended'
-- - 'dmca_user_terminated'

COMMENT ON TABLE dmca_notices IS 'DMCA takedown notices submitted by copyright holders';
COMMENT ON TABLE dmca_counter_notices IS 'DMCA counter-notices submitted by users whose content was removed';
COMMENT ON TABLE dmca_strikes IS 'Copyright infringement strikes for repeat infringer tracking (three-strike system)';
COMMENT ON COLUMN clips.dmca_removed IS 'Indicates if clip was removed due to DMCA takedown';
COMMENT ON COLUMN clips.dmca_notice_id IS 'Reference to DMCA notice that caused removal';
COMMENT ON COLUMN users.dmca_strikes_count IS 'Current count of active DMCA strikes (auto-updated)';
COMMENT ON COLUMN users.dmca_suspended_until IS 'Date when temporary DMCA suspension expires (Strike 2)';
COMMENT ON COLUMN users.dmca_terminated IS 'Indicates permanent account termination for repeat infringement (Strike 3)';
