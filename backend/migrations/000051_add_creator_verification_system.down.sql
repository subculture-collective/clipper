-- Drop triggers
DROP TRIGGER IF EXISTS trg_update_user_verification ON creator_verification_applications;
DROP TRIGGER IF EXISTS trg_verification_application_reviewed ON creator_verification_applications;

-- Drop functions
DROP FUNCTION IF EXISTS update_user_verification_status();
DROP FUNCTION IF EXISTS update_verification_application_reviewed();

-- Drop indexes from users table
DROP INDEX IF EXISTS idx_users_is_verified;

-- Remove verified columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS verified_at;
ALTER TABLE users DROP COLUMN IF EXISTS is_verified;

-- Drop tables
DROP TABLE IF EXISTS creator_verification_decisions;
DROP TABLE IF EXISTS creator_verification_applications;
