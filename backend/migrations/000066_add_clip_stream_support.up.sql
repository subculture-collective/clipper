-- Add stream clip support columns to clips table
-- These columns enable clips to be created from live streams with processing support

-- Add stream_source column to track if clip is from stream or Twitch
ALTER TABLE clips ADD COLUMN IF NOT EXISTS stream_source VARCHAR(20) DEFAULT 'twitch';

-- Add status column for tracking clip processing state
ALTER TABLE clips ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ready';

-- Add video_url column for processed clip storage (S3/CDN URL)
ALTER TABLE clips ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add processed_at timestamp for when clip processing completed
ALTER TABLE clips ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;

-- Add quality column for clip quality selection
ALTER TABLE clips ADD COLUMN IF NOT EXISTS quality VARCHAR(20);

-- Add start_time and end_time for stream-based clips
ALTER TABLE clips ADD COLUMN IF NOT EXISTS start_time FLOAT;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS end_time FLOAT;

-- Add index for status queries (finding processing/failed clips)
CREATE INDEX IF NOT EXISTS idx_clips_status ON clips(status);

-- Add index for stream source queries
CREATE INDEX IF NOT EXISTS idx_clips_stream_source ON clips(stream_source);

-- Add comment describing the status values
COMMENT ON COLUMN clips.status IS 'Clip processing status: ready (default for Twitch clips), processing, failed';
COMMENT ON COLUMN clips.stream_source IS 'Source of clip: twitch (default), stream (user-created from live stream)';
COMMENT ON COLUMN clips.quality IS 'Quality of processed clip: source, 1080p, 720p';

-- Add CHECK constraints to enforce valid values at database level
DO $$
BEGIN
    -- Add status constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'clips_status_check'
          AND conrelid = 'clips'::regclass
    ) THEN
        ALTER TABLE clips
        ADD CONSTRAINT clips_status_check
        CHECK (status IN ('ready', 'processing', 'failed'));
    END IF;

    -- Add stream_source constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'clips_stream_source_check'
          AND conrelid = 'clips'::regclass
    ) THEN
        ALTER TABLE clips
        ADD CONSTRAINT clips_stream_source_check
        CHECK (stream_source IN ('twitch', 'stream'));
    END IF;

    -- Add quality constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'clips_quality_check'
          AND conrelid = 'clips'::regclass
    ) THEN
        ALTER TABLE clips
        ADD CONSTRAINT clips_quality_check
        CHECK (quality IS NULL OR quality IN ('source', '1080p', '720p'));
    END IF;
END;
$$;
