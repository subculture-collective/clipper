-- ============================================================================
-- Migration: Add Clip Mirrors for Multi-Region Hosting
-- Description: Creates tables and indexes for tracking mirrored clips across regions
-- ============================================================================

-- Clip Mirrors table - tracks replicated clips in different regions
CREATE TABLE clip_mirrors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    region VARCHAR(50) NOT NULL, -- e.g., 'us-east-1', 'eu-west-1', 'ap-southeast-1'
    mirror_url TEXT NOT NULL, -- Full URL to the mirrored clip
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, active, failed, expired
    storage_provider VARCHAR(50) NOT NULL, -- e.g., 's3', 'cloudflare-r2', 'bunny'
    size_bytes BIGINT, -- Size of the mirrored file
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_accessed_at TIMESTAMP, -- Track last access for TTL decisions
    access_count INT DEFAULT 0, -- Number of times this mirror was accessed
    expires_at TIMESTAMP, -- TTL expiration time
    failure_reason TEXT, -- Error message if status is 'failed'
    UNIQUE(clip_id, region)
);

CREATE INDEX idx_clip_mirrors_clip_id ON clip_mirrors(clip_id);
CREATE INDEX idx_clip_mirrors_region ON clip_mirrors(region);
CREATE INDEX idx_clip_mirrors_status ON clip_mirrors(status);
CREATE INDEX idx_clip_mirrors_expires_at ON clip_mirrors(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_clip_mirrors_last_accessed ON clip_mirrors(last_accessed_at DESC);

-- Mirror Metrics table - tracks mirror performance and usage
CREATE TABLE mirror_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    region VARCHAR(50) NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'access', 'failover', 'bandwidth', 'cost'
    metric_value FLOAT NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB -- Additional context data
);

CREATE INDEX idx_mirror_metrics_clip_id ON mirror_metrics(clip_id);
CREATE INDEX idx_mirror_metrics_region ON mirror_metrics(region);
CREATE INDEX idx_mirror_metrics_type ON mirror_metrics(metric_type);
CREATE INDEX idx_mirror_metrics_recorded_at ON mirror_metrics(recorded_at DESC);

-- CDN Configuration table - stores CDN provider settings
CREATE TABLE cdn_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL, -- 'cloudflare', 'bunny', 'aws-cloudfront'
    region VARCHAR(50), -- Optional: region-specific configuration
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 0, -- Higher priority providers are tried first
    config JSONB NOT NULL, -- Provider-specific configuration (API keys, zones, etc.)
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(provider, region)
);

CREATE INDEX idx_cdn_config_provider ON cdn_configurations(provider);
CREATE INDEX idx_cdn_config_active ON cdn_configurations(is_active) WHERE is_active = true;
CREATE INDEX idx_cdn_config_priority ON cdn_configurations(priority DESC);

-- CDN Metrics table - tracks CDN performance and costs
CREATE TABLE cdn_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    region VARCHAR(50),
    metric_type VARCHAR(50) NOT NULL, -- 'latency', 'bandwidth', 'cost', 'cache_hit_rate', 'requests'
    metric_value FLOAT NOT NULL,
    recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX idx_cdn_metrics_provider ON cdn_metrics(provider);
CREATE INDEX idx_cdn_metrics_type ON cdn_metrics(metric_type);
CREATE INDEX idx_cdn_metrics_recorded_at ON cdn_metrics(recorded_at DESC);

-- Add CDN and mirror fields to clips table
ALTER TABLE clips ADD COLUMN IF NOT EXISTS primary_cdn_url TEXT;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS cdn_provider VARCHAR(50);
ALTER TABLE clips ADD COLUMN IF NOT EXISTS is_mirrored BOOLEAN DEFAULT false;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS mirror_count INT DEFAULT 0;
ALTER TABLE clips ADD COLUMN IF NOT EXISTS last_mirror_sync_at TIMESTAMP;

CREATE INDEX idx_clips_cdn_provider ON clips(cdn_provider) WHERE cdn_provider IS NOT NULL;
CREATE INDEX idx_clips_mirrored ON clips(is_mirrored) WHERE is_mirrored = true;
