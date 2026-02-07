-- No-op: embedding column is now created as vector(768) in migration 000019.
-- This migration previously added a BYTEA placeholder but pgvector is now enabled.
SELECT 1;
