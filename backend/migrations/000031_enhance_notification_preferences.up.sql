-- Enhance notification_preferences table with granular category controls
-- This migration adds fields for Account & Security, Content, Community, and Global preferences

-- Account & Security notifications
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS notify_login_new_device BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_failed_login BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_password_changed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_email_changed BOOLEAN DEFAULT true;

-- Content notifications (some already exist, adding missing ones)
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS notify_submission_approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_submission_rejected BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_content_trending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_content_flagged BOOLEAN DEFAULT true;

-- Community notifications
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS notify_moderator_message BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_user_followed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_comment_on_content BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_discussion_reply BOOLEAN DEFAULT true;

-- Global preferences
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS notify_marketing BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notify_policy_updates BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_platform_announcements BOOLEAN DEFAULT true;

-- Update email_digest to support 'never' option
ALTER TABLE notification_preferences
ALTER COLUMN email_digest TYPE VARCHAR(20);

-- Add comments for documentation
COMMENT ON COLUMN notification_preferences.notify_login_new_device IS 'Notify when account is accessed from a new device';
COMMENT ON COLUMN notification_preferences.notify_failed_login IS 'Notify on failed login attempts';
COMMENT ON COLUMN notification_preferences.notify_password_changed IS 'Notify when password is changed';
COMMENT ON COLUMN notification_preferences.notify_email_changed IS 'Notify when email is verified or changed';

COMMENT ON COLUMN notification_preferences.notify_submission_approved IS 'Notify when content submission is approved';
COMMENT ON COLUMN notification_preferences.notify_submission_rejected IS 'Notify when content submission is rejected';
COMMENT ON COLUMN notification_preferences.notify_content_trending IS 'Notify when content is trending';
COMMENT ON COLUMN notification_preferences.notify_content_flagged IS 'Notify when content is flagged for review';

COMMENT ON COLUMN notification_preferences.notify_moderator_message IS 'Notify on messages from community moderators';
COMMENT ON COLUMN notification_preferences.notify_user_followed IS 'Notify when another user follows you';
COMMENT ON COLUMN notification_preferences.notify_comment_on_content IS 'Notify when someone comments on your content';
COMMENT ON COLUMN notification_preferences.notify_discussion_reply IS 'Notify on replies to discussions you participate in';

COMMENT ON COLUMN notification_preferences.notify_marketing IS 'Receive marketing and product emails';
COMMENT ON COLUMN notification_preferences.notify_policy_updates IS 'Receive policy and terms updates (recommended)';
COMMENT ON COLUMN notification_preferences.notify_platform_announcements IS 'Receive platform announcements and news';

COMMENT ON COLUMN notification_preferences.email_enabled IS 'Master toggle for all email notifications';
COMMENT ON COLUMN notification_preferences.email_digest IS 'Email delivery frequency: immediate, daily, weekly, or never';
