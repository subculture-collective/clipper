-- Add ltree extension for hierarchical queries
CREATE EXTENSION IF NOT EXISTS ltree;

-- Add missing fields to forum_threads
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES games(id);
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS tags VARCHAR[] DEFAULT '{}';
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP;
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES users(id);

-- Add missing fields to forum_replies for hierarchical support
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS depth INT DEFAULT 0;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS path ltree;

-- Add depth constraint (max 10 levels: 0-9)
ALTER TABLE forum_replies DROP CONSTRAINT IF EXISTS forum_replies_depth_check;
ALTER TABLE forum_replies ADD CONSTRAINT forum_replies_depth_check CHECK (depth <= 9);

-- Add full-text search support to forum_threads
ALTER TABLE forum_threads ADD COLUMN IF NOT EXISTS search_vector tsvector 
    GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED;

-- Add full-text search support to forum_replies
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS search_vector tsvector 
    GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forum_threads_game ON forum_threads(game_id, created_at DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_forum_threads_tags ON forum_threads USING GIN(tags) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_forum_threads_search ON forum_threads USING GIN(search_vector) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_forum_threads_locked ON forum_threads(locked, updated_at) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_forum_replies_path ON forum_replies USING GIST(path) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_forum_replies_depth ON forum_replies(depth, thread_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_forum_replies_search ON forum_replies USING GIN(search_vector) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_forum_replies_thread_parent ON forum_replies(thread_id, parent_reply_id, created_at) WHERE is_deleted = FALSE;

-- Note: Thread auto-locking after 30 days is designed to be handled by a scheduled job
-- that runs periodically (e.g., daily) rather than a database trigger, since triggers
-- fire on updates which defeats the purpose of checking for inactivity.
-- The scheduled job would execute:
-- UPDATE forum_threads SET locked = TRUE, locked_at = NOW()
-- WHERE locked = FALSE AND updated_at < NOW() - INTERVAL '30 days' AND is_deleted = FALSE;

-- Function to update thread updated_at when reply is added/edited
CREATE OR REPLACE FUNCTION update_thread_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if reply is not deleted
    IF (TG_OP = 'INSERT' AND NEW.is_deleted = FALSE) OR 
       (TG_OP = 'UPDATE' AND NEW.is_deleted = FALSE AND OLD.is_deleted = FALSE) THEN
        UPDATE forum_threads 
        SET updated_at = NOW()
        WHERE id = NEW.thread_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update thread updated_at timestamp when replies are added/edited
CREATE TRIGGER trg_update_thread_timestamp
AFTER INSERT OR UPDATE ON forum_replies
FOR EACH ROW
EXECUTE FUNCTION update_thread_updated_at();

-- Update existing forum_replies to set depth based on parent relationships
-- This is a one-time migration for existing data
DO $$
DECLARE
    reply_record RECORD;
    current_depth INT;
    current_path TEXT;
    processed_count INT;
    total_count INT;
    max_iterations INT := 100; -- Safety limit
    iteration INT := 0;
BEGIN
    -- Get total count of replies to process
    SELECT COUNT(*) INTO total_count FROM forum_replies WHERE depth IS NULL OR path IS NULL;
    
    IF total_count = 0 THEN
        RETURN; -- Nothing to process
    END IF;
    
    -- Keep processing until all replies have depth and path, or max iterations reached
    WHILE total_count > 0 AND iteration < max_iterations LOOP
        iteration := iteration + 1;
        processed_count := 0;
        
        -- Process replies without depth set, starting from root level
        FOR reply_record IN 
            SELECT id, thread_id, parent_reply_id 
            FROM forum_replies 
            WHERE depth IS NULL OR path IS NULL
            ORDER BY created_at ASC
        LOOP
            IF reply_record.parent_reply_id IS NULL THEN
                -- Root level reply
                current_depth := 0;
                -- Use full UUID with hyphens replaced by underscores for ltree compatibility
                current_path := REPLACE(reply_record.id::text, '-', '_');
                
                -- Update the reply with calculated depth and path
                UPDATE forum_replies
                SET depth = current_depth,
                    path = current_path::ltree
                WHERE id = reply_record.id;
                
                processed_count := processed_count + 1;
            ELSE
                -- Get parent's depth and path
                SELECT depth, path::text
                INTO current_depth, current_path
                FROM forum_replies
                WHERE id = reply_record.parent_reply_id;
                
                -- Only process if parent has been processed
                IF current_path IS NOT NULL AND current_depth IS NOT NULL THEN
                    current_depth := current_depth + 1;
                    current_path := current_path || '.' || REPLACE(reply_record.id::text, '-', '_');
                    
                    -- Update the reply with calculated depth and path
                    UPDATE forum_replies
                    SET depth = current_depth,
                        path = current_path::ltree
                    WHERE id = reply_record.id;
                    
                    processed_count := processed_count + 1;
                END IF;
            END IF;
        END LOOP;
        
        -- Exit if no progress made in this iteration
        EXIT WHEN processed_count = 0;
        
        -- Check if all are processed
        SELECT COUNT(*) INTO total_count FROM forum_replies WHERE depth IS NULL OR path IS NULL;
        EXIT WHEN total_count = 0;
    END LOOP;
END $$;
