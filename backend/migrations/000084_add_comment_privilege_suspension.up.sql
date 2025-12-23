-- Comment Privilege Suspension System
-- Allows temporary suspension of commenting privileges with warning escalation

-- Add comment suspension fields to users table
ALTER TABLE users 
ADD COLUMN comment_suspended_until TIMESTAMP,
ADD COLUMN comments_require_review BOOLEAN DEFAULT false,
ADD COLUMN comment_warning_count INT DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN users.comment_suspended_until IS 'Date when temporary comment suspension expires';
COMMENT ON COLUMN users.comments_require_review IS 'Flag to require all user comments to be reviewed before publishing';
COMMENT ON COLUMN users.comment_warning_count IS 'Number of warnings issued to user for comment violations';

-- Create index for checking active suspensions
CREATE INDEX idx_users_comment_suspended ON users(comment_suspended_until) 
WHERE comment_suspended_until IS NOT NULL AND comment_suspended_until > NOW();

-- Create index for users requiring review
CREATE INDEX idx_users_comments_require_review ON users(comments_require_review) 
WHERE comments_require_review = true;

-- Comment Suspension History Table
CREATE TABLE comment_suspension_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    suspended_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    suspension_type VARCHAR(20) NOT NULL, -- 'warning', 'temporary', 'permanent'
    reason TEXT NOT NULL,
    duration_hours INT, -- NULL for warnings and permanent bans
    suspended_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- NULL for warnings and permanent bans
    is_active BOOLEAN DEFAULT true,
    lifted_at TIMESTAMP,
    lifted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    lift_reason TEXT,
    metadata JSONB, -- Additional context (e.g., related moderation action)
    -- Note: suspension_type values must match models.SuspensionType* constants in models.go
    CONSTRAINT comment_suspension_valid_type CHECK (suspension_type IN ('warning', 'temporary', 'permanent'))
);

-- Indexes for suspension history
CREATE INDEX idx_suspension_history_user_id ON comment_suspension_history(user_id);
CREATE INDEX idx_suspension_history_suspended_by ON comment_suspension_history(suspended_by);
CREATE INDEX idx_suspension_history_suspended_at ON comment_suspension_history(suspended_at DESC);
CREATE INDEX idx_suspension_history_active ON comment_suspension_history(is_active) WHERE is_active = true;

-- Function to automatically mark expired suspensions as inactive
CREATE OR REPLACE FUNCTION expire_comment_suspensions()
RETURNS void AS $$
BEGIN
    UPDATE comment_suspension_history
    SET is_active = false
    WHERE is_active = true 
    AND expires_at IS NOT NULL 
    AND expires_at < NOW();
    
    -- Clear the comment_suspended_until field for users whose suspension has expired
    UPDATE users
    SET comment_suspended_until = NULL
    WHERE comment_suspended_until IS NOT NULL 
    AND comment_suspended_until < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically expire suspensions when checking
CREATE OR REPLACE FUNCTION check_and_expire_user_suspension()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.comment_suspended_until IS NOT NULL AND NEW.comment_suspended_until < NOW() THEN
        NEW.comment_suspended_until = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_expire_user_suspension
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION check_and_expire_user_suspension();
