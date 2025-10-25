-- Analytics Events Table
-- Stores raw analytics events for tracking user interactions and behaviors
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- 'clip_view', 'vote', 'comment', 'favorite', 'share', 'search'
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for anonymous views
    clip_id UUID REFERENCES clips(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{}', -- Additional event data (e.g., duration, referrer)
    ip_address VARCHAR(45), -- Anonymized IP (last octet removed)
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_clip ON analytics_events(clip_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_type_created ON analytics_events(event_type, created_at DESC);

-- Daily Analytics Aggregates
-- Pre-computed daily statistics for faster queries
CREATE TABLE daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'clip_views', 'votes', 'comments', 'users_active', etc.
    entity_type VARCHAR(50), -- 'clip', 'user', 'creator', 'game', 'platform'
    entity_id VARCHAR(255), -- ID of the entity (clip_id, user_id, creator_name, game_id, or 'global')
    value BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}', -- Additional metrics (e.g., unique_viewers, avg_duration)
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(date, metric_type, entity_type, entity_id)
);

-- Indexes for aggregates
CREATE INDEX idx_daily_analytics_date ON daily_analytics(date DESC);
CREATE INDEX idx_daily_analytics_entity ON daily_analytics(entity_type, entity_id);
CREATE INDEX idx_daily_analytics_metric ON daily_analytics(metric_type);
CREATE INDEX idx_daily_analytics_date_entity ON daily_analytics(date DESC, entity_type, entity_id);

-- Clip Analytics Summary
-- Denormalized table for quick access to clip statistics
CREATE TABLE clip_analytics (
    clip_id UUID PRIMARY KEY REFERENCES clips(id) ON DELETE CASCADE,
    total_views BIGINT DEFAULT 0,
    unique_viewers BIGINT DEFAULT 0,
    avg_view_duration FLOAT, -- Average watch duration in seconds
    total_shares BIGINT DEFAULT 0,
    peak_concurrent_viewers INT DEFAULT 0,
    retention_rate FLOAT, -- Percentage of viewers who watched to the end
    first_viewed_at TIMESTAMP,
    last_viewed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Creator Analytics Summary
-- Aggregated statistics for content creators
CREATE TABLE creator_analytics (
    creator_name VARCHAR(100) PRIMARY KEY,
    creator_id VARCHAR(50),
    total_clips INT DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    total_upvotes BIGINT DEFAULT 0,
    total_downvotes BIGINT DEFAULT 0,
    total_comments BIGINT DEFAULT 0,
    total_favorites BIGINT DEFAULT 0,
    avg_engagement_rate FLOAT, -- (votes + comments) / views
    follower_count INT DEFAULT 0, -- For future implementation
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_creator_analytics_id ON creator_analytics(creator_id);
CREATE INDEX idx_creator_analytics_views ON creator_analytics(total_views DESC);

-- User Activity Summary
-- Personal statistics for users
CREATE TABLE user_analytics (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    clips_upvoted INT DEFAULT 0,
    clips_downvoted INT DEFAULT 0,
    comments_posted INT DEFAULT 0,
    clips_favorited INT DEFAULT 0,
    searches_performed INT DEFAULT 0,
    days_active INT DEFAULT 0,
    total_karma_earned INT DEFAULT 0,
    last_active_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Platform Analytics Summary
-- Global platform statistics
CREATE TABLE platform_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_users BIGINT DEFAULT 0,
    active_users_daily INT DEFAULT 0,
    active_users_weekly INT DEFAULT 0,
    active_users_monthly INT DEFAULT 0,
    new_users_today INT DEFAULT 0,
    total_clips BIGINT DEFAULT 0,
    new_clips_today INT DEFAULT 0,
    total_votes BIGINT DEFAULT 0,
    votes_today INT DEFAULT 0,
    total_comments BIGINT DEFAULT 0,
    comments_today INT DEFAULT 0,
    total_views BIGINT DEFAULT 0,
    views_today BIGINT DEFAULT 0,
    avg_session_duration FLOAT, -- In minutes
    metadata JSONB DEFAULT '{}', -- Additional metrics
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platform_analytics_date ON platform_analytics(date DESC);

-- Function to update clip analytics on view event
CREATE OR REPLACE FUNCTION update_clip_analytics()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.event_type = 'clip_view' AND NEW.clip_id IS NOT NULL THEN
        INSERT INTO clip_analytics (clip_id, total_views, unique_viewers, first_viewed_at, last_viewed_at)
        VALUES (
            NEW.clip_id,
            1,
            CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END,
            NEW.created_at,
            NEW.created_at
        )
        ON CONFLICT (clip_id) DO UPDATE SET
            total_views = clip_analytics.total_views + 1,
            unique_viewers = CASE 
                WHEN NEW.user_id IS NOT NULL 
                    AND NOT EXISTS (
                        SELECT 1 FROM analytics_events 
                        WHERE clip_id = NEW.clip_id 
                        AND user_id = NEW.user_id 
                        AND event_type = 'clip_view'
                        AND id != NEW.id
                    )
                THEN clip_analytics.unique_viewers + 1
                ELSE clip_analytics.unique_viewers
            END,
            last_viewed_at = NEW.created_at,
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic clip analytics updates
CREATE TRIGGER trigger_update_clip_analytics
AFTER INSERT ON analytics_events
FOR EACH ROW
EXECUTE FUNCTION update_clip_analytics();

-- Function to initialize creator analytics
CREATE OR REPLACE FUNCTION initialize_creator_analytics()
RETURNS void AS $$
BEGIN
    INSERT INTO creator_analytics (creator_name, creator_id, total_clips)
    SELECT 
        creator_name,
        creator_id,
        COUNT(*)
    FROM clips
    WHERE is_removed = false
    GROUP BY creator_name, creator_id
    ON CONFLICT (creator_name) DO UPDATE SET
        total_clips = EXCLUDED.total_clips,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update creator analytics from existing data
CREATE OR REPLACE FUNCTION update_creator_analytics_from_clips()
RETURNS void AS $$
BEGIN
    INSERT INTO creator_analytics (
        creator_name,
        creator_id,
        total_clips,
        total_upvotes,
        total_downvotes,
        total_comments,
        total_favorites
    )
    SELECT 
        c.creator_name,
        c.creator_id,
        COUNT(*) as total_clips,
        COALESCE(SUM(CASE WHEN c.vote_score > 0 THEN c.vote_score ELSE 0 END), 0) as total_upvotes,
        COALESCE(SUM(CASE WHEN c.vote_score < 0 THEN ABS(c.vote_score) ELSE 0 END), 0) as total_downvotes,
        COALESCE(SUM(c.comment_count), 0) as total_comments,
        COALESCE(SUM(c.favorite_count), 0) as total_favorites
    FROM clips c
    WHERE c.is_removed = false
    GROUP BY c.creator_name, c.creator_id
    ON CONFLICT (creator_name) DO UPDATE SET
        total_clips = EXCLUDED.total_clips,
        total_upvotes = EXCLUDED.total_upvotes,
        total_downvotes = EXCLUDED.total_downvotes,
        total_comments = EXCLUDED.total_comments,
        total_favorites = EXCLUDED.total_favorites,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Initialize creator analytics with existing data
SELECT initialize_creator_analytics();
SELECT update_creator_analytics_from_clips();
