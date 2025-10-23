-- Drop search analytics table
DROP TABLE IF EXISTS search_queries;

-- Drop indexes
DROP INDEX IF EXISTS idx_clips_search_vector;
DROP INDEX IF EXISTS idx_users_search_vector;
DROP INDEX IF EXISTS idx_tags_search_vector;

-- Drop triggers
DROP TRIGGER IF EXISTS clips_search_vector_trigger ON clips;
DROP TRIGGER IF EXISTS users_search_vector_trigger ON users;
DROP TRIGGER IF EXISTS tags_search_vector_trigger ON tags;

-- Drop functions
DROP FUNCTION IF EXISTS clips_search_vector_update();
DROP FUNCTION IF EXISTS users_search_vector_update();
DROP FUNCTION IF EXISTS tags_search_vector_update();

-- Drop tsvector columns
ALTER TABLE clips DROP COLUMN IF EXISTS search_vector;
ALTER TABLE users DROP COLUMN IF EXISTS search_vector;
ALTER TABLE tags DROP COLUMN IF EXISTS search_vector;
