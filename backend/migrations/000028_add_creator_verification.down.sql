-- Drop verification audit logs table
DROP TABLE IF EXISTS verification_audit_logs;

-- Drop creator verifications table
DROP TABLE IF EXISTS creator_verifications;

-- Remove verification columns from users table
ALTER TABLE users
DROP COLUMN IF EXISTS is_verified,
DROP COLUMN IF EXISTS verified_at;
