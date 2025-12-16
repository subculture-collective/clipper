-- Rollback DMCA system

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_update_dmca_strikes_count ON dmca_strikes;
DROP FUNCTION IF EXISTS update_user_dmca_strikes_count();

-- Drop indexes on users table
DROP INDEX IF EXISTS idx_users_dmca_terminated;
DROP INDEX IF EXISTS idx_users_dmca_suspended;

-- Remove DMCA columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS dmca_terminated_at;
ALTER TABLE users DROP COLUMN IF EXISTS dmca_terminated;
ALTER TABLE users DROP COLUMN IF EXISTS dmca_suspended_until;
ALTER TABLE users DROP COLUMN IF EXISTS dmca_strikes_count;

-- Drop indexes on clips table
DROP INDEX IF EXISTS idx_clips_dmca_notice_id;
DROP INDEX IF EXISTS idx_clips_dmca_removed;

-- Remove DMCA columns from clips table
ALTER TABLE clips DROP COLUMN IF EXISTS dmca_reinstated_at;
ALTER TABLE clips DROP COLUMN IF EXISTS dmca_removed_at;
ALTER TABLE clips DROP COLUMN IF EXISTS dmca_notice_id;
ALTER TABLE clips DROP COLUMN IF EXISTS dmca_removed;

-- Drop dmca_strikes table and indexes
DROP INDEX IF EXISTS idx_dmca_strikes_dmca_notice_id;
DROP INDEX IF EXISTS idx_dmca_strikes_expires_at;
DROP INDEX IF EXISTS idx_dmca_strikes_status;
DROP INDEX IF EXISTS idx_dmca_strikes_user_status;
DROP INDEX IF EXISTS idx_dmca_strikes_user_id;
DROP TABLE IF EXISTS dmca_strikes;

-- Drop dmca_counter_notices table and indexes
DROP INDEX IF EXISTS idx_dmca_counter_notices_submitted_at;
DROP INDEX IF EXISTS idx_dmca_counter_notices_waiting_period;
DROP INDEX IF EXISTS idx_dmca_counter_notices_status;
DROP INDEX IF EXISTS idx_dmca_counter_notices_user_id;
DROP INDEX IF EXISTS idx_dmca_counter_notices_dmca_notice_id;
DROP TABLE IF EXISTS dmca_counter_notices;

-- Drop dmca_notices table and indexes
DROP INDEX IF EXISTS idx_dmca_notices_reviewed_by;
DROP INDEX IF EXISTS idx_dmca_notices_complainant_email;
DROP INDEX IF EXISTS idx_dmca_notices_submitted_at;
DROP INDEX IF EXISTS idx_dmca_notices_status;
DROP TABLE IF EXISTS dmca_notices;
