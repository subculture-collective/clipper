-- Ads system migration
-- Adds tables for ad management, impressions, and frequency capping

-- Create ads table
CREATE TABLE ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    advertiser_name VARCHAR(255) NOT NULL,
    ad_type VARCHAR(50) NOT NULL, -- 'banner', 'video', 'native'
    content_url TEXT NOT NULL, -- URL to ad creative
    click_url TEXT, -- Target URL when ad is clicked
    alt_text VARCHAR(500),
    width INT,
    height INT,
    priority INT DEFAULT 0, -- Higher priority gets served first
    weight INT DEFAULT 100, -- Weight for rotation (1-100)
    daily_budget_cents BIGINT, -- Daily budget in cents (NULL = unlimited)
    total_budget_cents BIGINT, -- Total budget in cents (NULL = unlimited)
    spent_today_cents BIGINT DEFAULT 0, -- Amount spent today in cents
    spent_total_cents BIGINT DEFAULT 0, -- Total amount spent in cents
    cpm_cents INT DEFAULT 100, -- Cost per 1000 impressions in cents
    is_active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    targeting_criteria JSONB, -- JSON with targeting options (e.g., game_ids, languages)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ad impressions table for tracking
CREATE TABLE ad_impressions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous users
    session_id VARCHAR(255), -- Session identifier for anonymous tracking
    platform VARCHAR(50) NOT NULL, -- 'web', 'ios', 'android'
    ip_address INET,
    user_agent TEXT,
    page_url TEXT,
    viewability_time_ms INT DEFAULT 0, -- Time ad was viewable in milliseconds
    is_viewable BOOLEAN DEFAULT false, -- Met viewability threshold (50% visible for 1s)
    is_clicked BOOLEAN DEFAULT false,
    clicked_at TIMESTAMP WITH TIME ZONE,
    cost_cents INT DEFAULT 0, -- Cost charged for this impression
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create frequency caps table
CREATE TABLE ad_frequency_caps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255), -- For anonymous users
    impression_count INT DEFAULT 0,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    window_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'lifetime'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add partial unique indexes for ad_frequency_caps
CREATE UNIQUE INDEX unique_user_ad_window ON ad_frequency_caps(ad_id, user_id, window_type) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX unique_session_ad_window ON ad_frequency_caps(ad_id, session_id, window_type) WHERE session_id IS NOT NULL;

-- Create ad frequency limits table (configurable per ad)
CREATE TABLE ad_frequency_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    window_type VARCHAR(20) NOT NULL, -- 'hourly', 'daily', 'weekly', 'lifetime'
    max_impressions INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (ad_id, window_type)
);

-- Create indexes for performance
CREATE INDEX idx_ads_active_dates ON ads(is_active, start_date, end_date) WHERE is_active = true;
CREATE INDEX idx_ads_priority_weight ON ads(priority DESC, weight DESC) WHERE is_active = true;
CREATE INDEX idx_ad_impressions_ad_id ON ad_impressions(ad_id);
CREATE INDEX idx_ad_impressions_user_id ON ad_impressions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ad_impressions_session_id ON ad_impressions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_ad_impressions_created_at ON ad_impressions(created_at);
CREATE INDEX idx_ad_impressions_viewable ON ad_impressions(ad_id, is_viewable) WHERE is_viewable = true;
CREATE INDEX idx_ad_frequency_caps_user_ad ON ad_frequency_caps(user_id, ad_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ad_frequency_caps_session_ad ON ad_frequency_caps(session_id, ad_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_ad_frequency_caps_window ON ad_frequency_caps(ad_id, window_type, window_start);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_ads_updated_at
    BEFORE UPDATE ON ads
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_frequency_caps_updated_at
    BEFORE UPDATE ON ad_frequency_caps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE ads IS 'Stores ad campaigns with targeting, budgets, and scheduling';
COMMENT ON TABLE ad_impressions IS 'Tracks ad impressions with viewability and click data';
COMMENT ON TABLE ad_frequency_caps IS 'Per-user/session impression counts for frequency capping';
COMMENT ON TABLE ad_frequency_limits IS 'Configurable frequency limits per ad';
