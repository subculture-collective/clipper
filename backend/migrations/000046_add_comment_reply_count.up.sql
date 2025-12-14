-- Add reply_count column to comments table for denormalized reply tracking
ALTER TABLE comments ADD COLUMN reply_count INT DEFAULT 0 NOT NULL;

-- Create index on parent_comment_id for efficient reply queries
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

-- Backfill reply_count for existing comments
UPDATE comments c
SET reply_count = (
    SELECT COUNT(*)
    FROM comments replies
    WHERE replies.parent_comment_id = c.id
);

-- Create trigger function to maintain reply_count
CREATE OR REPLACE FUNCTION update_comment_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Increment reply_count when a reply is added
        IF NEW.parent_comment_id IS NOT NULL THEN
            UPDATE comments
            SET reply_count = reply_count + 1
            WHERE id = NEW.parent_comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Decrement reply_count when a reply is deleted
        IF OLD.parent_comment_id IS NOT NULL THEN
            UPDATE comments
            SET reply_count = GREATEST(reply_count - 1, 0)
            WHERE id = OLD.parent_comment_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle parent_comment_id changes (should be rare)
        IF OLD.parent_comment_id IS DISTINCT FROM NEW.parent_comment_id THEN
            -- Decrement old parent's count
            IF OLD.parent_comment_id IS NOT NULL THEN
                UPDATE comments
                SET reply_count = GREATEST(reply_count - 1, 0)
                WHERE id = OLD.parent_comment_id;
            END IF;
            -- Increment new parent's count
            IF NEW.parent_comment_id IS NOT NULL THEN
                UPDATE comments
                SET reply_count = reply_count + 1
                WHERE id = NEW.parent_comment_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update reply_count
CREATE TRIGGER trigger_update_comment_reply_count
AFTER INSERT OR UPDATE OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_reply_count();
