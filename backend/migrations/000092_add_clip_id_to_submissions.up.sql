-- Add clip_id column to track the created clip when a submission is approved
ALTER TABLE clip_submissions
    ADD COLUMN clip_id UUID REFERENCES clips(id) ON DELETE SET NULL;

-- Create index for lookups
CREATE INDEX idx_submissions_clip_id ON clip_submissions(clip_id) WHERE clip_id IS NOT NULL;
