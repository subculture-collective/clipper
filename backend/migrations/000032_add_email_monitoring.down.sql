-- Rollback email monitoring tables

DROP INDEX IF EXISTS idx_email_notification_logs_sendgrid_id;
ALTER TABLE email_notification_logs 
    DROP COLUMN IF EXISTS sendgrid_message_id,
    DROP COLUMN IF EXISTS event_type;

DROP TABLE IF EXISTS email_alerts;
DROP TABLE IF EXISTS email_metrics_summary;
DROP TABLE IF EXISTS email_logs;
