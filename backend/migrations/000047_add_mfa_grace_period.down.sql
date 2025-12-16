-- Remove MFA grace period tracking

DROP INDEX IF EXISTS idx_user_mfa_grace_period;

ALTER TABLE user_mfa DROP COLUMN IF EXISTS grace_period_end;
ALTER TABLE user_mfa DROP COLUMN IF EXISTS mfa_required_at;
ALTER TABLE user_mfa DROP COLUMN IF EXISTS mfa_required;
