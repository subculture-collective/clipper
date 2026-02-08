-- Idempotent migration: ensure embedding column uses vector(768).
-- This migration previously added a BYTEA placeholder; if any database still
-- has clips.embedding as BYTEA, upgrade it to vector(768). Otherwise, no-op.
DO $$
BEGIN
    -- Only run the ALTER if the column exists and is currently BYTEA.
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clips'
          AND column_name = 'embedding'
          AND data_type = 'bytea'
    ) THEN
        -- Convert the placeholder BYTEA column to vector(768).
        -- Since it was a placeholder, we safely set existing values to NULL.
        ALTER TABLE public.clips
            ALTER COLUMN embedding TYPE vector(768)
            USING NULL::vector(768);
    END IF;
END;
$$;
