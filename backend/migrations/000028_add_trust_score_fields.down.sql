-- Drop view
DROP VIEW IF EXISTS trust_score_leaderboard;

-- Drop function
DROP FUNCTION IF EXISTS update_user_trust_score(UUID, INT, VARCHAR, JSONB, UUID, TEXT);

-- Drop indexes
DROP INDEX IF EXISTS idx_trust_score_history_changed_by;
DROP INDEX IF EXISTS idx_trust_score_history_reason;
DROP INDEX IF EXISTS idx_trust_score_history_user;

-- Drop trust_score_history table
DROP TABLE IF EXISTS trust_score_history;

-- Drop indexes on users table
DROP INDEX IF EXISTS idx_users_trust_score_updated_at;
DROP INDEX IF EXISTS idx_users_trust_score;

-- Remove columns from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS trust_score_updated_at,
DROP COLUMN IF EXISTS trust_score;
