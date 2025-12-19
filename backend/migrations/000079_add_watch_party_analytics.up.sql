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
WITH user_durations AS (
    SELECT 
        party_id,
        user_id,
        MIN(time) FILTER (WHERE event_type = 'join') as first_join,
        MAX(time) FILTER (WHERE event_type = 'leave') as last_leave
    FROM watch_party_events
    WHERE event_type IN ('join', 'leave')
    GROUP BY party_id, user_id
),
party_stats AS (
    SELECT
        wp.id as party_id,
        wp.host_user_id,
        COUNT(DISTINCT wpe.user_id) FILTER (WHERE wpe.event_type = 'join' AND wpe.user_id IS NOT NULL) as unique_viewers,
        COUNT(*) FILTER (WHERE wpe.event_type = 'chat') as chat_messages,
        COUNT(*) FILTER (WHERE wpe.event_type = 'reaction') as reactions
    FROM watch_parties wp
    LEFT JOIN watch_party_events wpe ON wpe.party_id = wp.id
    GROUP BY wp.id, wp.host_user_id
),
avg_durations AS (
    SELECT 
        party_id,
        COALESCE(
            ROUND(AVG(EXTRACT(EPOCH FROM (last_leave - first_join)))),
            0
        ) as avg_watch_duration_seconds
    FROM user_durations
    WHERE first_join IS NOT NULL AND last_leave IS NOT NULL
    GROUP BY party_id
),
peak_concurrent AS (
    SELECT 
        party_id,
        MAX(concurrent_count) as peak_concurrent_viewers
    FROM (
        SELECT 
            party_id,
            time,
            SUM(
                CASE 
                    WHEN event_type = 'join' THEN 1 
                    WHEN event_type = 'leave' THEN -1 
                    ELSE 0 
                END
            ) OVER (PARTITION BY party_id ORDER BY time) as concurrent_count
        FROM watch_party_events
        WHERE event_type IN ('join', 'leave')
    ) concurrent
    GROUP BY party_id
)
SELECT
    ps.party_id,
    ps.host_user_id,
    ps.unique_viewers,
    ps.chat_messages,
    ps.reactions,
    COALESCE(ad.avg_watch_duration_seconds, 0) as avg_watch_duration_seconds,
    COALESCE(pc.peak_concurrent_viewers, 0) as peak_concurrent_viewers
FROM party_stats ps
LEFT JOIN avg_durations ad ON ps.party_id = ad.party_id
LEFT JOIN peak_concurrent pc ON ps.party_id = pc.party_id;

-- Index for materialized view
CREATE UNIQUE INDEX idx_watch_party_analytics_party ON watch_party_analytics(party_id);
CREATE INDEX idx_watch_party_analytics_host ON watch_party_analytics(host_user_id);

-- Add comments for documentation
COMMENT ON TABLE watch_party_events IS 'Event log for watch party analytics tracking';
COMMENT ON COLUMN watch_party_events.event_type IS 'Type of event: join, leave, chat, reaction, sync';
COMMENT ON COLUMN watch_party_events.metadata IS 'Additional event data in JSON format';
COMMENT ON MATERIALIZED VIEW watch_party_analytics IS 'Aggregated analytics for watch parties';
