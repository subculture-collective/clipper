-- Migration 109: Create discovery_clips staging table
-- Separates scraped/discovery clips from the main clips table.
-- Discovery clips live here until a user "claims" one, at which point
-- the row is moved into the clips table and deleted from discovery_clips.

BEGIN;

-- Create the discovery_clips staging table
CREATE TABLE IF NOT EXISTS discovery_clips (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twitch_clip_id  VARCHAR(255) NOT NULL UNIQUE,
    twitch_clip_url VARCHAR(500) NOT NULL,
    embed_url       VARCHAR(500) NOT NULL DEFAULT '',
    title           VARCHAR(500) NOT NULL,
    creator_name    VARCHAR(255) NOT NULL DEFAULT '',
    creator_id      VARCHAR(255),
    broadcaster_name VARCHAR(255) NOT NULL DEFAULT '',
    broadcaster_id  VARCHAR(255),
    game_id         VARCHAR(255),
    game_name       VARCHAR(255),
    language        VARCHAR(10),
    thumbnail_url   TEXT,
    duration        DOUBLE PRECISION,
    view_count      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    imported_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_nsfw         BOOLEAN NOT NULL DEFAULT FALSE,
    is_removed      BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden       BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for common query patterns on discovery_clips
CREATE INDEX IF NOT EXISTS idx_discovery_clips_created_at ON discovery_clips (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_clips_view_count ON discovery_clips (view_count DESC);
CREATE INDEX IF NOT EXISTS idx_discovery_clips_broadcaster_id ON discovery_clips (broadcaster_id);
CREATE INDEX IF NOT EXISTS idx_discovery_clips_game_id ON discovery_clips (game_id);
CREATE INDEX IF NOT EXISTS idx_discovery_clips_language ON discovery_clips (language);
CREATE INDEX IF NOT EXISTS idx_discovery_clips_is_removed ON discovery_clips (is_removed) WHERE is_removed = false;

-- Full-text search vector for discovery clips
ALTER TABLE discovery_clips ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX IF NOT EXISTS idx_discovery_clips_search ON discovery_clips USING GIN (search_vector);

-- Trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION discovery_clips_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('english',
        COALESCE(NEW.title, '') || ' ' ||
        COALESCE(NEW.broadcaster_name, '') || ' ' ||
        COALESCE(NEW.creator_name, '') || ' ' ||
        COALESCE(NEW.game_name, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_discovery_clips_search_vector ON discovery_clips;
CREATE TRIGGER trg_discovery_clips_search_vector
    BEFORE INSERT OR UPDATE ON discovery_clips
    FOR EACH ROW
    EXECUTE FUNCTION discovery_clips_search_vector_update();

-- Migrate existing scraped clips (submitted_by_user_id IS NULL) from clips to discovery_clips
INSERT INTO discovery_clips (
    id, twitch_clip_id, twitch_clip_url, embed_url, title,
    creator_name, creator_id, broadcaster_name, broadcaster_id,
    game_id, game_name, language, thumbnail_url, duration,
    view_count, created_at, imported_at, is_nsfw, is_removed, is_hidden
)
SELECT
    id, twitch_clip_id, twitch_clip_url, embed_url, title,
    creator_name, creator_id, broadcaster_name, broadcaster_id,
    game_id, game_name, language, thumbnail_url, duration,
    view_count, created_at, imported_at, is_nsfw, is_removed, is_hidden
FROM clips
WHERE submitted_by_user_id IS NULL
ON CONFLICT (twitch_clip_id) DO NOTHING;

-- Delete the migrated scraped clips from the main clips table.
-- Only delete rows that were successfully copied (match on twitch_clip_id).
DELETE FROM clips
WHERE submitted_by_user_id IS NULL
  AND twitch_clip_id IN (SELECT twitch_clip_id FROM discovery_clips);

COMMIT;
