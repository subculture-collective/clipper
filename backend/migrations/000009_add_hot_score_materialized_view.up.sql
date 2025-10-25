-- Create materialized view for hot clips with pre-computed hot scores
-- This improves performance for discovery list endpoints
CREATE MATERIALIZED VIEW hot_clips_materialized AS
SELECT 
    c.id, 
    c.twitch_clip_id, 
    c.twitch_clip_url, 
    c.embed_url, 
    c.title,
    c.creator_name, 
    c.creator_id, 
    c.broadcaster_name, 
    c.broadcaster_id,
    c.game_id, 
    c.game_name, 
    c.language, 
    c.thumbnail_url, 
    c.duration,
    c.view_count, 
    c.created_at, 
    c.imported_at, 
    c.vote_score, 
    c.comment_count,
    c.favorite_count, 
    c.is_featured, 
    c.is_nsfw, 
    c.is_removed, 
    c.removed_reason,
    calculate_hot_score(c.vote_score, c.created_at) as hot_score
FROM clips c
WHERE c.is_removed = false
ORDER BY calculate_hot_score(c.vote_score, c.created_at) DESC;

-- Create unique index on id for CONCURRENTLY refresh support
CREATE UNIQUE INDEX hot_clips_materialized_id_idx ON hot_clips_materialized (id);

-- Create index on hot_score for faster queries
CREATE INDEX hot_clips_materialized_hot_score_idx ON hot_clips_materialized (hot_score DESC);

-- Create index on created_at for time-based queries
CREATE INDEX hot_clips_materialized_created_at_idx ON hot_clips_materialized (created_at DESC);

-- Create composite index on game_id and hot_score for game-specific hot clips
CREATE INDEX hot_clips_materialized_game_hot_idx ON hot_clips_materialized (game_id, hot_score DESC);

-- Create composite index on creator_name and hot_score for creator-specific hot clips
CREATE INDEX hot_clips_materialized_creator_hot_idx ON hot_clips_materialized (creator_name, hot_score DESC);
