-- Migration: Rollback communities feature
-- Description: Removes all tables and functions related to communities

-- Drop triggers
DROP TRIGGER IF EXISTS update_discussion_comments_updated_at_trigger ON community_discussion_comments;
DROP TRIGGER IF EXISTS update_discussions_updated_at_trigger ON community_discussions;
DROP TRIGGER IF EXISTS update_communities_updated_at_trigger ON communities;
DROP TRIGGER IF EXISTS update_discussion_vote_score_trigger ON community_discussion_votes;
DROP TRIGGER IF EXISTS update_discussion_comment_count_trigger ON community_discussion_comments;
DROP TRIGGER IF EXISTS update_community_member_count_trigger ON community_members;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_timestamp();
DROP FUNCTION IF EXISTS update_discussion_vote_score();
DROP FUNCTION IF EXISTS update_discussion_comment_count();
DROP FUNCTION IF EXISTS update_community_member_count();

-- Drop tables (in reverse order of creation to handle dependencies)
DROP TABLE IF EXISTS community_discussion_votes;
DROP TABLE IF EXISTS community_discussion_comments;
DROP TABLE IF EXISTS community_discussions;
DROP TABLE IF EXISTS community_clips;
DROP TABLE IF EXISTS community_bans;
DROP TABLE IF EXISTS community_members;
DROP TABLE IF EXISTS communities;
