-- Drop trigger
DROP TRIGGER IF EXISTS trigger_update_comment_reply_count ON comments;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_comment_reply_count();

-- Drop index
DROP INDEX IF EXISTS idx_comments_parent_comment_id;

-- Remove reply_count column
ALTER TABLE comments DROP COLUMN IF EXISTS reply_count;
