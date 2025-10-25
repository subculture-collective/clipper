-- Add broadcaster_name_override column to clip_submissions table
ALTER TABLE clip_submissions
ADD COLUMN broadcaster_name_override VARCHAR(100);

-- Add comment to document the purpose
COMMENT ON COLUMN clip_submissions.broadcaster_name_override IS 'User-provided override for the broadcaster name, similar to custom_title';
