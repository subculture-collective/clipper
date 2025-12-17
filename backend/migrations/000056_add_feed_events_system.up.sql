-- Feed Events Table for Analytics & Performance Monitoring
-- Captures user interactions with the feed (views, filters, sorts, recommendations)
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    properties JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_events_user_type ON events (user_id, event_type, timestamp DESC);
CREATE INDEX idx_events_session ON events (session_id, timestamp DESC);
CREATE INDEX idx_events_type_time ON events (event_type, timestamp DESC);
CREATE INDEX idx_events_timestamp ON events (timestamp DESC);

-- Materialized view for hourly metrics
CREATE MATERIALIZED VIEW events_hourly_metrics AS
SELECT 
    DATE_TRUNC('hour', timestamp) as hour,
    event_type,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions
FROM events
GROUP BY DATE_TRUNC('hour', timestamp), event_type;

-- Unique index on materialized view for faster queries and CONCURRENTLY refresh support
CREATE UNIQUE INDEX idx_events_hourly_metrics_hour ON events_hourly_metrics (hour DESC, event_type);

-- Function to refresh hourly metrics (can be called via cron job)
CREATE OR REPLACE FUNCTION refresh_events_hourly_metrics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY events_hourly_metrics;
END;
$$ LANGUAGE plpgsql;
