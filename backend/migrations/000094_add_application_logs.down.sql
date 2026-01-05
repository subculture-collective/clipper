-- Drop application logs table
DROP INDEX IF EXISTS idx_application_logs_level_timestamp;
DROP INDEX IF EXISTS idx_application_logs_created_at;
DROP INDEX IF EXISTS idx_application_logs_service;
DROP INDEX IF EXISTS idx_application_logs_user_id;
DROP INDEX IF EXISTS idx_application_logs_timestamp;
DROP INDEX IF EXISTS idx_application_logs_level;
DROP TABLE IF EXISTS application_logs;
