-- Drop views
DROP VIEW IF EXISTS engagement_leaderboard;
DROP VIEW IF EXISTS karma_leaderboard;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_award_karma_on_comment_vote ON comment_votes;
DROP TRIGGER IF EXISTS trigger_award_karma_on_clip_vote ON votes;

-- Drop functions
DROP FUNCTION IF EXISTS award_karma_on_comment_vote();
DROP FUNCTION IF EXISTS award_karma_on_clip_vote();
DROP FUNCTION IF EXISTS get_user_rank(INT);
DROP FUNCTION IF EXISTS calculate_engagement_score(UUID);
DROP FUNCTION IF EXISTS calculate_trust_score(UUID);
DROP FUNCTION IF EXISTS update_user_karma(UUID, INT, VARCHAR, UUID);

-- Drop tables
DROP TABLE IF EXISTS user_stats;
DROP TABLE IF EXISTS karma_history;
DROP TABLE IF EXISTS user_badges;
