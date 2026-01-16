-- Create service status tables for tracking system health

-- Service status table: Current status of all services
CREATE TABLE IF NOT EXISTS service_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    status_message TEXT,
    last_check_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    response_time_ms INTEGER,
    error_rate FLOAT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Status history table: Historical status data for charts (24h, 7d)
CREATE TABLE IF NOT EXISTS status_history (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    response_time_ms INTEGER,
    error_rate FLOAT,
    checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Status incidents table: Track service incidents
CREATE TABLE IF NOT EXISTS status_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'maintenance')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Status incident updates table: Timeline of incident updates
CREATE TABLE IF NOT EXISTS status_incident_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES status_incidents(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('investigating', 'identified', 'monitoring', 'resolved')),
    message TEXT NOT NULL,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Status subscriptions table: User subscriptions for status updates
CREATE TABLE IF NOT EXISTS status_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_name VARCHAR(100),
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN ('email', 'webhook', 'all')),
    webhook_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, service_name, notification_type)
);

-- Create indexes for efficient queries
CREATE INDEX idx_service_status_service_name ON service_status(service_name);
CREATE INDEX idx_service_status_status ON service_status(status);
CREATE INDEX idx_service_status_last_check ON service_status(last_check_at DESC);

CREATE INDEX idx_status_history_service_name ON status_history(service_name);
CREATE INDEX idx_status_history_checked_at ON status_history(checked_at DESC);
CREATE INDEX idx_status_history_service_time ON status_history(service_name, checked_at DESC);

CREATE INDEX idx_status_incidents_service_name ON status_incidents(service_name);
CREATE INDEX idx_status_incidents_status ON status_incidents(status);
CREATE INDEX idx_status_incidents_started_at ON status_incidents(started_at DESC);
CREATE INDEX idx_status_incidents_severity ON status_incidents(severity);

CREATE INDEX idx_status_incident_updates_incident_id ON status_incident_updates(incident_id);
CREATE INDEX idx_status_incident_updates_created_at ON status_incident_updates(created_at DESC);

CREATE INDEX idx_status_subscriptions_user_id ON status_subscriptions(user_id);
CREATE INDEX idx_status_subscriptions_service_name ON status_subscriptions(service_name);
CREATE INDEX idx_status_subscriptions_active ON status_subscriptions(is_active) WHERE is_active = TRUE;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER service_status_updated_at
    BEFORE UPDATE ON service_status
    FOR EACH ROW
    EXECUTE FUNCTION update_service_status_updated_at();

CREATE TRIGGER status_incidents_updated_at
    BEFORE UPDATE ON status_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_service_status_updated_at();

CREATE TRIGGER status_subscriptions_updated_at
    BEFORE UPDATE ON status_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_service_status_updated_at();

-- Insert initial service entries
INSERT INTO service_status (service_name, status, status_message) VALUES
    ('database', 'healthy', 'PostgreSQL connection pool healthy'),
    ('redis', 'healthy', 'Redis cache operational'),
    ('opensearch', 'healthy', 'OpenSearch cluster operational'),
    ('api', 'healthy', 'API server responding normally'),
    ('websocket', 'healthy', 'WebSocket connections stable')
ON CONFLICT (service_name) DO NOTHING;
