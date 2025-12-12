-- Drop MFA system tables
DROP TRIGGER IF EXISTS update_user_mfa_updated_at ON user_mfa;
DROP TABLE IF EXISTS mfa_audit_logs;
DROP TABLE IF EXISTS mfa_trusted_devices;
DROP TABLE IF EXISTS user_mfa;
