-- Create watch_party_events table for tracking analytics events
CREATE TABLE watch_party_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    time TIMESTAMP NOT NULL DEFAULT NOW(),
    party_id UUID NOT NULL REFERENCES watch_parties(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('join', 'leave', 'chat', 'reaction', 'sync')),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_party_events_party_time ON watch_party_events(party_id, time DESC);
CREATE INDEX idx_party_events_type ON watch_party_events(party_id, event_type);
CREATE INDEX idx_party_events_user ON watch_party_events(user_id) WHERE user_id IS NOT NULL;

-- Create materialized view for aggregated analytics
CREATE MATERIALIZED VIEW watch_party_analytics AS
SELECT
    wp.id as party_id,
    wp.host_user_id,
    COUNT(DISTINCT wpe.user_id) FILTER (WHERE wpe.event_type = 'join' AND wpe.user_id IS NOT NULL) as unique_viewers,
    COUNT(*) FILTER (WHERE wpe.event_type = 'chat') as chat_messages,
    COUNT(*) FILTER (WHERE wpe.event_type = 'reaction') as reactions,
    COALESCE(
        AVG(
            EXTRACT(EPOCH FROM (leave_times.left_at - join_times.joined_at))
        )::INT, 
        0
    ) as avg_watch_duration_seconds,
    (
        SELECT MAX(concurrent_count)
        FROM (
            SELECT 
                time,
                SUM(
                    CASE 
                        WHEN event_type = 'join' THEN 1 
                        WHEN event_type = 'leave' THEN -1 
                        ELSE 0 
                    END
                ) OVER (ORDER BY time) as concurrent_count
            FROM watch_party_events
            WHERE party_id = wp.id AND event_type IN ('join', 'leave')
        ) concurrent
    ) as peak_concurrent_viewers
FROM watch_parties wp
LEFT JOIN watch_party_events wpe ON wpe.party_id = wp.id
LEFT JOIN LATERAL (
    SELECT user_id, MIN(time) as joined_at
    FROM watch_party_events
    WHERE party_id = wp.id AND event_type = 'join'
    GROUP BY user_id
) join_times ON join_times.user_id = wpe.user_id
LEFT JOIN LATERAL (
    SELECT user_id, MAX(time) as left_at
    FROM watch_party_events
    WHERE party_id = wp.id AND event_type = 'leave'
    GROUP BY user_id
) leave_times ON leave_times.user_id = join_times.user_id
GROUP BY wp.id, wp.host_user_id;

-- Index for materialized view
CREATE UNIQUE INDEX idx_watch_party_analytics_party ON watch_party_analytics(party_id);
CREATE INDEX idx_watch_party_analytics_host ON watch_party_analytics(host_user_id);

-- Add comments for documentation
COMMENT ON TABLE watch_party_events IS 'Event log for watch party analytics tracking';
COMMENT ON COLUMN watch_party_events.event_type IS 'Type of event: join, leave, chat, reaction, sync';
COMMENT ON COLUMN watch_party_events.metadata IS 'Additional event data in JSON format';
COMMENT ON MATERIALIZED VIEW watch_party_analytics IS 'Aggregated analytics for watch parties';
