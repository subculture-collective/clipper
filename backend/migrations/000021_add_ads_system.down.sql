-- Rollback ads system migration

-- Drop triggers
DROP TRIGGER IF EXISTS update_ad_frequency_caps_updated_at ON ad_frequency_caps;
DROP TRIGGER IF EXISTS update_ads_updated_at ON ads;

-- Drop indexes
DROP INDEX IF EXISTS idx_ad_frequency_caps_window;
DROP INDEX IF EXISTS idx_ad_frequency_caps_session_ad;
DROP INDEX IF EXISTS idx_ad_frequency_caps_user_ad;
DROP INDEX IF EXISTS idx_ad_impressions_viewable;
DROP INDEX IF EXISTS idx_ad_impressions_created_at;
DROP INDEX IF EXISTS idx_ad_impressions_session_id;
DROP INDEX IF EXISTS idx_ad_impressions_user_id;
DROP INDEX IF EXISTS idx_ad_impressions_ad_id;
DROP INDEX IF EXISTS idx_ads_priority_weight;
DROP INDEX IF EXISTS idx_ads_active_dates;

-- Drop tables (in order due to foreign keys)
DROP TABLE IF EXISTS ad_frequency_limits;
DROP TABLE IF EXISTS ad_frequency_caps;
DROP TABLE IF EXISTS ad_impressions;
DROP TABLE IF EXISTS ads;
