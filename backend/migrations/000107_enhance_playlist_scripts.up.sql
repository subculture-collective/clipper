-- Add scheduling, strategy, and filter columns to playlist_scripts
ALTER TABLE playlist_scripts
    ADD COLUMN IF NOT EXISTS schedule VARCHAR(20) NOT NULL DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS strategy VARCHAR(40) NOT NULL DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS game_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS game_ids TEXT[],
    ADD COLUMN IF NOT EXISTS broadcaster_id VARCHAR(50),
    ADD COLUMN IF NOT EXISTS tag VARCHAR(100),
    ADD COLUMN IF NOT EXISTS exclude_tags TEXT[],
    ADD COLUMN IF NOT EXISTS language VARCHAR(10),
    ADD COLUMN IF NOT EXISTS min_vote_score INT,
    ADD COLUMN IF NOT EXISTS min_view_count INT,
    ADD COLUMN IF NOT EXISTS exclude_nsfw BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS top_10k_streamers BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS seed_clip_id UUID REFERENCES clips(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS retention_days INT NOT NULL DEFAULT 30,
    ADD COLUMN IF NOT EXISTS title_template VARCHAR(200);

-- Add constraints for schedule and strategy values
ALTER TABLE playlist_scripts
    ADD CONSTRAINT chk_playlist_scripts_schedule
        CHECK (schedule IN ('manual', 'hourly', 'daily', 'weekly', 'monthly')),
    ADD CONSTRAINT chk_playlist_scripts_strategy
        CHECK (strategy IN (
            'standard', 'sleeper_hits', 'viral_velocity', 'community_favorites',
            'deep_cuts', 'fresh_faces', 'similar_vibes', 'cross_game_hits',
            'controversial', 'binge_worthy', 'rising_stars',
            'twitch_top_game', 'twitch_top_broadcaster', 'twitch_trending', 'twitch_discovery'
        ));

-- Index for scheduler: find active, non-manual scripts due for execution
CREATE INDEX IF NOT EXISTS idx_playlist_scripts_schedule
    ON playlist_scripts (schedule, is_active, last_run_at)
    WHERE is_active = true AND schedule != 'manual';

-- Create a system bot user for automated clip posting by playlist scripts.
-- Uses a well-known UUID so it can be referenced in application code.
INSERT INTO users (id, username, display_name, role, account_type, account_status)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'clpr-bot',
    'clpr bot',
    'admin',
    'admin',
    'active'
) ON CONFLICT (id) DO NOTHING;
