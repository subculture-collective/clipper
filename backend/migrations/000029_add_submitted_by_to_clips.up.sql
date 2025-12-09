-- Add submitted_by_user_id to clips table to track who submitted the clip
ALTER TABLE clips
ADD COLUMN submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add index for querying clips by submitter
CREATE INDEX idx_clips_submitted_by ON clips(submitted_by_user_id) WHERE submitted_by_user_id IS NOT NULL;

-- Add submitted_at timestamp to track when it was submitted to Clipper (vs created_at which is Twitch creation time)
-- For existing clips, submitted_at will be NULL since we don't have submission data
ALTER TABLE clips
ADD COLUMN submitted_at TIMESTAMP;
