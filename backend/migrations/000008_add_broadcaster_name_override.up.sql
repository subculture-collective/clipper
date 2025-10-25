-- Add broadcaster_name_override column to clip_submissions table
ALTER TABLE clip_submissions
ADD COLUMN broadcaster_name_override VARCHAR(100);

-- Add comment to explain the column
COMMENT ON COLUMN clip_submissions.broadcaster_name_override IS 'User-provided override for broadcaster name, takes precedence over Twitch metadata when creating clip';
