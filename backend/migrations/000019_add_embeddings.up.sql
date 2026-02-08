-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to clips table
-- Using 768 dimensions compatible with nomic-embed-text:v1.5 and text-embedding-3-small
ALTER TABLE clips ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Add metadata columns for embedding tracking
ALTER TABLE clips ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMP;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100);

-- Create HNSW index for fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_clips_embedding_hnsw ON clips
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

COMMENT ON INDEX idx_clips_embedding_hnsw IS
'HNSW index for fast vector similarity search using cosine distance. Used for semantic search re-ranking.';

COMMENT ON COLUMN clips.embedding IS
'Vector embedding of clip content (title + tags + metadata) for semantic search. 768 dimensions.';

COMMENT ON COLUMN clips.embedding_generated_at IS
'Timestamp when the embedding was last generated. Used for tracking and incremental updates.';

COMMENT ON COLUMN clips.embedding_model IS
'Model identifier used to generate the embedding (e.g., text-embedding-3-small). Used for versioning.';
