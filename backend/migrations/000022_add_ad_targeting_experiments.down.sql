-- Rollback ad targeting rules, experiments, and measurement migration

-- Drop triggers
DROP TRIGGER IF EXISTS update_ad_campaign_analytics_updated_at ON ad_campaign_analytics;
DROP TRIGGER IF EXISTS update_ad_experiments_updated_at ON ad_experiments;

-- Drop foreign key constraint
ALTER TABLE ads DROP CONSTRAINT IF EXISTS fk_ads_experiment;

-- Drop indexes
DROP INDEX IF EXISTS idx_ad_experiment_analytics_experiment;
DROP INDEX IF EXISTS idx_ad_campaign_analytics_slot;
DROP INDEX IF EXISTS idx_ad_campaign_analytics_ad_date;
DROP INDEX IF EXISTS idx_ad_impressions_date;
DROP INDEX IF EXISTS idx_ad_impressions_experiment;
DROP INDEX IF EXISTS idx_ad_impressions_slot_id;
DROP INDEX IF EXISTS idx_ad_targeting_rules_type;
DROP INDEX IF EXISTS idx_ad_targeting_rules_ad_id;
DROP INDEX IF EXISTS idx_ads_experiment_id;
DROP INDEX IF EXISTS idx_ads_slot_id;
DROP INDEX IF EXISTS unique_ad_date_slot;

-- Drop new tables
DROP TABLE IF EXISTS ad_experiment_analytics;
DROP TABLE IF EXISTS ad_campaign_analytics;
DROP TABLE IF EXISTS ad_targeting_rules;
DROP TABLE IF EXISTS ad_experiments;

-- Remove columns from ad_impressions
ALTER TABLE ad_impressions DROP COLUMN IF EXISTS experiment_variant;
ALTER TABLE ad_impressions DROP COLUMN IF EXISTS experiment_id;
ALTER TABLE ad_impressions DROP COLUMN IF EXISTS device_type;
ALTER TABLE ad_impressions DROP COLUMN IF EXISTS country;
ALTER TABLE ad_impressions DROP COLUMN IF EXISTS slot_id;

-- Remove columns from ads
ALTER TABLE ads DROP COLUMN IF EXISTS experiment_variant;
ALTER TABLE ads DROP COLUMN IF EXISTS experiment_id;
ALTER TABLE ads DROP COLUMN IF EXISTS slot_id;
