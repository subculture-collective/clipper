-- Rollback enhanced notification preferences

ALTER TABLE notification_preferences
DROP COLUMN IF EXISTS notify_login_new_device,
DROP COLUMN IF EXISTS notify_failed_login,
DROP COLUMN IF EXISTS notify_password_changed,
DROP COLUMN IF EXISTS notify_email_changed,
DROP COLUMN IF EXISTS notify_submission_approved,
DROP COLUMN IF EXISTS notify_submission_rejected,
DROP COLUMN IF EXISTS notify_content_trending,
DROP COLUMN IF EXISTS notify_content_flagged,
DROP COLUMN IF EXISTS notify_moderator_message,
DROP COLUMN IF EXISTS notify_user_followed,
DROP COLUMN IF EXISTS notify_comment_on_content,
DROP COLUMN IF EXISTS notify_discussion_reply,
DROP COLUMN IF EXISTS notify_marketing,
DROP COLUMN IF EXISTS notify_policy_updates,
DROP COLUMN IF EXISTS notify_platform_announcements;
