-- Add a placeholder embedding column so embedding-aware queries do not fail
-- Use BYTEA to avoid requiring pgvector locally while keeping nullability semantics
ALTER TABLE clips ADD COLUMN IF NOT EXISTS embedding BYTEA;

COMMENT ON COLUMN clips.embedding IS 'Placeholder for clip embedding; nullable until vector support is enabled.';
