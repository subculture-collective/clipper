-- Drop the HNSW index
DROP INDEX IF EXISTS idx_clips_embedding_hnsw;

-- Drop the embedding columns
ALTER TABLE clips DROP COLUMN IF EXISTS embedding;
ALTER TABLE clips DROP COLUMN IF EXISTS embedding_generated_at;
ALTER TABLE clips DROP COLUMN IF EXISTS embedding_model;

-- Note: We don't drop the vector extension as it might be used by other tables
-- To manually drop it if needed: DROP EXTENSION IF EXISTS vector CASCADE;
