-- Ad targeting rules, experiments, and measurement migration
-- Adds support for country, device, and interests targeting, A/B experiments, and CTR analytics

-- Add slot_id to ads for slot-based reporting
ALTER TABLE ads ADD COLUMN IF NOT EXISTS slot_id VARCHAR(100);

-- Add experiment support to ads
ALTER TABLE ads ADD COLUMN IF NOT EXISTS experiment_id UUID;
ALTER TABLE ads ADD COLUMN IF NOT EXISTS experiment_variant VARCHAR(50); -- 'control', 'variant_a', 'variant_b', etc.

-- Create ad experiments table
CREATE TABLE IF NOT EXISTS ad_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed'
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    traffic_percent INT DEFAULT 100 CHECK (traffic_percent >= 0 AND traffic_percent <= 100), -- % of traffic in experiment
    winning_variant VARCHAR(50), -- Set when experiment is completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ad targeting rules table for more structured targeting
CREATE TABLE IF NOT EXISTS ad_targeting_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- 'country', 'device', 'interest', 'platform', 'language', 'game'
    operator VARCHAR(20) NOT NULL DEFAULT 'include', -- 'include', 'exclude'
    values TEXT[] NOT NULL, -- Array of values to match
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add slot_id to ad_impressions for slot-based analytics
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS slot_id VARCHAR(100);

-- Add device and country info to impressions for analytics
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS country VARCHAR(2);
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS device_type VARCHAR(50); -- 'desktop', 'mobile', 'tablet'

-- Add experiment tracking to impressions
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS experiment_id UUID;
ALTER TABLE ad_impressions ADD COLUMN IF NOT EXISTS experiment_variant VARCHAR(50);

-- Create ad campaign analytics table for aggregated metrics
CREATE TABLE IF NOT EXISTS ad_campaign_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_id UUID NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    slot_id VARCHAR(100),
    impressions INT DEFAULT 0,
    viewable_impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    spend_cents BIGINT DEFAULT 0,
    unique_users INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index using COALESCE to handle NULL slot_id properly
CREATE UNIQUE INDEX IF NOT EXISTS unique_ad_date_slot ON ad_campaign_analytics (ad_id, date, COALESCE(slot_id, ''));

-- Create experiment analytics table
CREATE TABLE IF NOT EXISTS ad_experiment_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES ad_experiments(id) ON DELETE CASCADE,
    variant VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    impressions INT DEFAULT 0,
    viewable_impressions INT DEFAULT 0,
    clicks INT DEFAULT 0,
    conversions INT DEFAULT 0, -- Optional conversion tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_experiment_variant_date UNIQUE (experiment_id, variant, date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ads_slot_id ON ads(slot_id) WHERE slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ads_experiment_id ON ads(experiment_id) WHERE experiment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_targeting_rules_ad_id ON ad_targeting_rules(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_targeting_rules_type ON ad_targeting_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_ad_impressions_slot_id ON ad_impressions(slot_id) WHERE slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_impressions_experiment ON ad_impressions(experiment_id, experiment_variant) WHERE experiment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_impressions_date ON ad_impressions(created_at);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_analytics_ad_date ON ad_campaign_analytics(ad_id, date);
CREATE INDEX IF NOT EXISTS idx_ad_campaign_analytics_slot ON ad_campaign_analytics(slot_id) WHERE slot_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_experiment_analytics_experiment ON ad_experiment_analytics(experiment_id, date);

-- Add foreign key for experiments
ALTER TABLE ads ADD CONSTRAINT fk_ads_experiment FOREIGN KEY (experiment_id) REFERENCES ad_experiments(id) ON DELETE SET NULL;

-- Add trigger to update updated_at timestamp for experiments
CREATE TRIGGER update_ad_experiments_updated_at
    BEFORE UPDATE ON ad_experiments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ad_campaign_analytics_updated_at
    BEFORE UPDATE ON ad_campaign_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE ad_experiments IS 'A/B experiments for comparing ad variants';
COMMENT ON TABLE ad_targeting_rules IS 'Structured targeting rules for ads (country, device, interests)';
COMMENT ON TABLE ad_campaign_analytics IS 'Aggregated campaign analytics by date and slot';
COMMENT ON TABLE ad_experiment_analytics IS 'Aggregated experiment analytics by variant and date';
COMMENT ON COLUMN ads.slot_id IS 'Identifier for the ad placement slot (e.g., header, sidebar, feed)';
COMMENT ON COLUMN ads.experiment_id IS 'Reference to A/B experiment if ad is part of an experiment';
COMMENT ON COLUMN ads.experiment_variant IS 'Variant name within the experiment (control, variant_a, etc.)';
