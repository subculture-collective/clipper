-- Rollback comment privilege suspension system

DROP TRIGGER IF EXISTS trg_expire_user_suspension ON users;
DROP FUNCTION IF EXISTS check_and_expire_user_suspension();
DROP FUNCTION IF EXISTS expire_comment_suspensions();

DROP INDEX IF EXISTS idx_suspension_history_active;
DROP INDEX IF EXISTS idx_suspension_history_suspended_at;
DROP INDEX IF EXISTS idx_suspension_history_suspended_by;
DROP INDEX IF EXISTS idx_suspension_history_user_id;

DROP TABLE IF EXISTS comment_suspension_history;

DROP INDEX IF EXISTS idx_users_comments_require_review;
DROP INDEX IF EXISTS idx_users_comment_suspended;

ALTER TABLE users 
DROP COLUMN IF EXISTS comment_warning_count,
DROP COLUMN IF EXISTS comments_require_review,
DROP COLUMN IF EXISTS comment_suspended_until;
