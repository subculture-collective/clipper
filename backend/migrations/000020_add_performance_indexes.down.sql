-- Rollback performance indexes

-- Note: Dropping indexes is safe and won't affect data, only query performance

DROP INDEX IF EXISTS idx_clips_not_removed_hot;
DROP INDEX IF EXISTS idx_clips_not_removed_created;
DROP INDEX IF EXISTS idx_clips_not_removed_vote_score;

DROP INDEX IF EXISTS idx_comments_clip_not_removed_created;
DROP INDEX IF EXISTS idx_comments_clip_not_removed_score;

DROP INDEX IF EXISTS idx_votes_user_clip;
DROP INDEX IF EXISTS idx_votes_clip_user;

DROP INDEX IF EXISTS idx_favorites_user_clip;
DROP INDEX IF EXISTS idx_favorites_clip_user;

DROP INDEX IF EXISTS idx_clips_game_not_removed_created;
DROP INDEX IF EXISTS idx_clips_broadcaster_not_removed;

DROP INDEX IF EXISTS idx_comments_user_created;
DROP INDEX IF EXISTS idx_votes_user_created;
DROP INDEX IF EXISTS idx_favorites_user_created;

DROP INDEX IF EXISTS idx_clip_tags_clip;
DROP INDEX IF EXISTS idx_clip_tags_tag;
DROP INDEX IF EXISTS idx_tags_clip_count;

DROP INDEX IF EXISTS idx_notifications_user_unread;
