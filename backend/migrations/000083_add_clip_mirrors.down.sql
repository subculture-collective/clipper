-- Rollback migration for clip mirrors

-- Remove indexes from clips table
DROP INDEX IF EXISTS idx_clips_mirrored;
DROP INDEX IF EXISTS idx_clips_cdn_provider;

-- Remove columns from clips table
ALTER TABLE clips DROP COLUMN IF EXISTS last_mirror_sync_at;
ALTER TABLE clips DROP COLUMN IF EXISTS mirror_count;
ALTER TABLE clips DROP COLUMN IF EXISTS is_mirrored;
ALTER TABLE clips DROP COLUMN IF EXISTS cdn_provider;
ALTER TABLE clips DROP COLUMN IF EXISTS primary_cdn_url;

-- Drop CDN metrics table
DROP TABLE IF EXISTS cdn_metrics;

-- Drop CDN configuration table
DROP TABLE IF EXISTS cdn_configurations;

-- Drop mirror metrics table
DROP TABLE IF EXISTS mirror_metrics;

-- Drop clip mirrors table
DROP TABLE IF EXISTS clip_mirrors;
