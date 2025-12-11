-- Add notify_broadcaster_live column to notification_preferences table
ALTER TABLE notification_preferences
ADD COLUMN IF NOT EXISTS notify_broadcaster_live BOOLEAN DEFAULT true;
