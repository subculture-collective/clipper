-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON users;
DROP FUNCTION IF EXISTS create_default_notification_preferences();

-- Drop tables
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS notifications;
