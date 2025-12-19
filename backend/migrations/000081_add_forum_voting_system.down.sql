-- Rollback forum voting system migration

-- Drop triggers
DROP TRIGGER IF EXISTS trg_forum_votes_update_counts ON forum_votes;

-- Drop functions
DROP FUNCTION IF EXISTS trigger_update_vote_counts();
DROP FUNCTION IF EXISTS refresh_reply_vote_count(UUID);
DROP FUNCTION IF EXISTS update_reputation_score(UUID);

-- Drop columns from forum_replies
ALTER TABLE forum_replies DROP COLUMN IF EXISTS flagged_as_spam;
ALTER TABLE forum_replies DROP COLUMN IF EXISTS hidden;

-- Drop indexes
DROP INDEX IF EXISTS idx_user_reputation_badge;
DROP INDEX IF EXISTS idx_user_reputation_score;
DROP INDEX IF EXISTS idx_forum_replies_spam;
DROP INDEX IF EXISTS idx_forum_vote_counts_reply;
DROP INDEX IF EXISTS idx_forum_votes_created;
DROP INDEX IF EXISTS idx_forum_votes_user;
DROP INDEX IF EXISTS idx_forum_votes_reply;

-- Drop tables and views
DROP TABLE IF EXISTS user_reputation;
DROP MATERIALIZED VIEW IF EXISTS forum_vote_counts;
DROP TABLE IF EXISTS forum_votes;
