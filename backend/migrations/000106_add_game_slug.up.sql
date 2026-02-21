-- Add slug column to games table for efficient slug-based lookups.
-- Previously, GetBySlug computed slugs on every row using REGEXP_REPLACE (full table scan).

ALTER TABLE games ADD COLUMN slug TEXT;

-- Backfill slugs from game names:
-- lowercase, strip non-alphanumeric (keep spaces/hyphens), replace underscores and
-- whitespace with hyphens, collapse consecutive hyphens, trim leading/trailing hyphens.
UPDATE games
SET slug = TRIM(BOTH '-' FROM
    REGEXP_REPLACE(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                LOWER(name),
                '[^a-z0-9 _-]', '', 'g'          -- strip special chars
            ),
            '[_ ]+', '-', 'g'                      -- underscores & spaces → hyphens
        ),
        '-{2,}', '-', 'g'                          -- collapse consecutive hyphens
    )
);

-- Index for fast slug lookups
CREATE INDEX idx_games_slug ON games (slug);
