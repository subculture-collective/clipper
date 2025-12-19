-- Drop triggers
DROP TRIGGER IF EXISTS trg_update_thread_timestamp ON forum_replies;

-- Drop functions
DROP FUNCTION IF EXISTS update_thread_updated_at();
DROP FUNCTION IF EXISTS auto_lock_inactive_threads();

-- Drop indexes
DROP INDEX IF EXISTS idx_forum_replies_thread_parent;
DROP INDEX IF EXISTS idx_forum_replies_search;
DROP INDEX IF EXISTS idx_forum_replies_depth;
DROP INDEX IF EXISTS idx_forum_replies_path;
DROP INDEX IF EXISTS idx_forum_threads_locked;
DROP INDEX IF EXISTS idx_forum_threads_search;
DROP INDEX IF EXISTS idx_forum_threads_tags;
DROP INDEX IF EXISTS idx_forum_threads_game;

-- Remove search vectors
ALTER TABLE forum_replies DROP COLUMN IF EXISTS search_vector;
ALTER TABLE forum_threads DROP COLUMN IF EXISTS search_vector;

-- Remove depth constraint
ALTER TABLE forum_replies DROP CONSTRAINT IF EXISTS forum_replies_depth_check;

-- Remove new columns from forum_replies
ALTER TABLE forum_replies DROP COLUMN IF EXISTS deleted_at;
ALTER TABLE forum_replies DROP COLUMN IF EXISTS path;
ALTER TABLE forum_replies DROP COLUMN IF EXISTS depth;

-- Remove new columns from forum_threads
ALTER TABLE forum_threads DROP COLUMN IF EXISTS locked_by;
ALTER TABLE forum_threads DROP COLUMN IF EXISTS locked_at;
ALTER TABLE forum_threads DROP COLUMN IF EXISTS tags;
ALTER TABLE forum_threads DROP COLUMN IF EXISTS game_id;

-- Note: We don't drop the ltree extension as other parts of the system might use it
