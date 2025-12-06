-- Add creator-specific notification preferences to notification_preferences table
-- These preferences control notifications for clip approvals, comments on clips, and threshold alerts

ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS notify_clip_approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_clip_rejected BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_clip_comments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_clip_threshold BOOLEAN DEFAULT true;

-- Add comments to explain the new columns
COMMENT ON COLUMN notification_preferences.notify_clip_approved IS 'Notify creator when their submitted clip is approved';
COMMENT ON COLUMN notification_preferences.notify_clip_rejected IS 'Notify creator when their submitted clip is rejected';
COMMENT ON COLUMN notification_preferences.notify_clip_comments IS 'Notify creator when someone comments on their clip';
COMMENT ON COLUMN notification_preferences.notify_clip_threshold IS 'Notify creator when their clip reaches view/vote thresholds';
