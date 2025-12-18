-- Drop triggers
DROP TRIGGER IF EXISTS trg_update_thread_flag_count ON content_flags;
DROP TRIGGER IF EXISTS trg_update_thread_reply_count ON forum_replies;

-- Drop functions
DROP FUNCTION IF EXISTS update_thread_flag_count();
DROP FUNCTION IF EXISTS update_thread_reply_count();

-- Drop tables
DROP TABLE IF EXISTS content_flags;
DROP TABLE IF EXISTS user_bans;
DROP TABLE IF EXISTS moderation_actions;
DROP TABLE IF EXISTS forum_replies;
DROP TABLE IF EXISTS forum_threads;
