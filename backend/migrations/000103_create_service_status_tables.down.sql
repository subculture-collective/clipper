-- Drop service status tables

DROP TRIGGER IF EXISTS status_subscriptions_updated_at ON status_subscriptions;
DROP TRIGGER IF EXISTS status_incidents_updated_at ON status_incidents;
DROP TRIGGER IF EXISTS service_status_updated_at ON service_status;

DROP FUNCTION IF EXISTS update_service_status_updated_at();

DROP TABLE IF EXISTS status_subscriptions;
DROP TABLE IF EXISTS status_incident_updates;
DROP TABLE IF EXISTS status_incidents;
DROP TABLE IF EXISTS status_history;
DROP TABLE IF EXISTS service_status;
