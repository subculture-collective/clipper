-- Remove notify_broadcaster_live column from notification_preferences table
ALTER TABLE notification_preferences
DROP COLUMN IF EXISTS notify_broadcaster_live;
