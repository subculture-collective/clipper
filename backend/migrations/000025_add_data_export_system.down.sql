-- Rollback data export system

DROP TRIGGER IF EXISTS update_export_requests_updated_at ON export_requests;
DROP TABLE IF EXISTS export_requests;
