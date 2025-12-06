-- Revert creator-specific notification preferences
ALTER TABLE notification_preferences
DROP COLUMN IF EXISTS notify_clip_approved,
DROP COLUMN IF EXISTS notify_clip_rejected,
DROP COLUMN IF EXISTS notify_clip_comments,
DROP COLUMN IF EXISTS notify_clip_threshold;
