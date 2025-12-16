-- Add MFA grace period tracking for admin/moderator enforcement

-- Add grace period columns to user_mfa table
ALTER TABLE user_mfa ADD COLUMN IF NOT EXISTS mfa_required BOOLEAN DEFAULT FALSE;
ALTER TABLE user_mfa ADD COLUMN IF NOT EXISTS mfa_required_at TIMESTAMPTZ;
ALTER TABLE user_mfa ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;

-- Create index for grace period queries
CREATE INDEX IF NOT EXISTS idx_user_mfa_grace_period ON user_mfa(grace_period_end) WHERE mfa_required = TRUE AND enabled = FALSE;

-- Add comment for documentation
COMMENT ON COLUMN user_mfa.mfa_required IS 'Whether MFA is required for this user (admin/moderator roles)';
COMMENT ON COLUMN user_mfa.mfa_required_at IS 'Timestamp when MFA became required for this user';
COMMENT ON COLUMN user_mfa.grace_period_end IS 'End of grace period for setting up MFA (7 days from mfa_required_at)';
