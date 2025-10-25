-- Remove broadcaster_name_override column from clip_submissions table
ALTER TABLE clip_submissions
DROP COLUMN broadcaster_name_override;
