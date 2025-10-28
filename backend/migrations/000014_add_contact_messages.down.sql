-- Drop contact_messages table and related objects
DROP TRIGGER IF EXISTS trigger_contact_messages_updated_at ON contact_messages;
DROP FUNCTION IF EXISTS update_contact_messages_updated_at();
DROP TABLE IF EXISTS contact_messages;
