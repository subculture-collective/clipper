-- Add is_hidden column to clips table for creator content management
ALTER TABLE clips ADD COLUMN is_hidden BOOLEAN DEFAULT false NOT NULL;

-- Add index for filtering hidden clips
CREATE INDEX idx_clips_is_hidden ON clips(is_hidden) WHERE is_hidden = true;

-- Add comment for documentation
COMMENT ON COLUMN clips.is_hidden IS 'Indicates if the clip has been hidden by the creator. Hidden clips are not visible in public feeds/search unless viewed by the creator or admin.';
