-- Migration: Add communities feature
-- Description: Creates tables for communities, members, and bans to support community spaces

-- Communities table
CREATE TABLE IF NOT EXISTS communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN DEFAULT true,
    member_count INT DEFAULT 0,
    rules TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Community members table
CREATE TABLE IF NOT EXISTS community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- admin, mod, member
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(community_id, user_id)
);

-- Community bans table
CREATE TABLE IF NOT EXISTS community_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    banned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    banned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(community_id, banned_user_id)
);

-- Community clips table (clips tagged with a community)
CREATE TABLE IF NOT EXISTS community_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    added_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    added_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(community_id, clip_id)
);

-- Discussion threads table
CREATE TABLE IF NOT EXISTS community_discussions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    vote_score INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Discussion comments table
CREATE TABLE IF NOT EXISTS community_discussion_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discussion_id UUID NOT NULL REFERENCES community_discussions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES community_discussion_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    vote_score INT DEFAULT 0,
    is_edited BOOLEAN DEFAULT false,
    is_removed BOOLEAN DEFAULT false,
    removed_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Discussion votes table
CREATE TABLE IF NOT EXISTS community_discussion_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discussion_id UUID REFERENCES community_discussions(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES community_discussion_comments(id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL CHECK (vote_type IN (1, -1)), -- 1 for upvote, -1 for downvote
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT one_vote_target CHECK (
        (discussion_id IS NOT NULL AND comment_id IS NULL) OR
        (discussion_id IS NULL AND comment_id IS NOT NULL)
    ),
    UNIQUE(user_id, discussion_id),
    UNIQUE(user_id, comment_id)
);

-- Indexes for communities
CREATE INDEX IF NOT EXISTS idx_communities_owner_id ON communities(owner_id);
CREATE INDEX IF NOT EXISTS idx_communities_slug ON communities(slug);
CREATE INDEX IF NOT EXISTS idx_communities_is_public ON communities(is_public);
CREATE INDEX IF NOT EXISTS idx_communities_member_count ON communities(member_count DESC);

-- Indexes for community members
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_community_members_role ON community_members(role);

-- Indexes for community bans
CREATE INDEX IF NOT EXISTS idx_community_bans_community_id ON community_bans(community_id);
CREATE INDEX IF NOT EXISTS idx_community_bans_banned_user_id ON community_bans(banned_user_id);

-- Indexes for community clips
CREATE INDEX IF NOT EXISTS idx_community_clips_community_id ON community_clips(community_id);
CREATE INDEX IF NOT EXISTS idx_community_clips_clip_id ON community_clips(clip_id);
CREATE INDEX IF NOT EXISTS idx_community_clips_added_at ON community_clips(added_at DESC);

-- Indexes for discussions
CREATE INDEX IF NOT EXISTS idx_community_discussions_community_id ON community_discussions(community_id);
CREATE INDEX IF NOT EXISTS idx_community_discussions_user_id ON community_discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_discussions_is_pinned ON community_discussions(is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_community_discussions_created_at ON community_discussions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_discussions_vote_score ON community_discussions(vote_score DESC);

-- Indexes for discussion comments
CREATE INDEX IF NOT EXISTS idx_community_discussion_comments_discussion_id ON community_discussion_comments(discussion_id);
CREATE INDEX IF NOT EXISTS idx_community_discussion_comments_user_id ON community_discussion_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_community_discussion_comments_parent_comment_id ON community_discussion_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_community_discussion_comments_created_at ON community_discussion_comments(created_at);

-- Indexes for discussion votes
CREATE INDEX IF NOT EXISTS idx_community_discussion_votes_user_id ON community_discussion_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_community_discussion_votes_discussion_id ON community_discussion_votes(discussion_id);
CREATE INDEX IF NOT EXISTS idx_community_discussion_votes_comment_id ON community_discussion_votes(comment_id);

-- Function to update community member count
CREATE OR REPLACE FUNCTION update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE communities SET member_count = member_count - 1 WHERE id = OLD.community_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update community member count
CREATE TRIGGER update_community_member_count_trigger
AFTER INSERT OR DELETE ON community_members
FOR EACH ROW EXECUTE FUNCTION update_community_member_count();

-- Function to update discussion comment count
CREATE OR REPLACE FUNCTION update_discussion_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE community_discussions SET comment_count = comment_count + 1 WHERE id = NEW.discussion_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE community_discussions SET comment_count = comment_count - 1 WHERE id = OLD.discussion_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update discussion comment count
CREATE TRIGGER update_discussion_comment_count_trigger
AFTER INSERT OR DELETE ON community_discussion_comments
FOR EACH ROW EXECUTE FUNCTION update_discussion_comment_count();

-- Function to update discussion vote scores
CREATE OR REPLACE FUNCTION update_discussion_vote_score()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.discussion_id IS NOT NULL THEN
            UPDATE community_discussions SET vote_score = vote_score + NEW.vote_type WHERE id = NEW.discussion_id;
        ELSIF NEW.comment_id IS NOT NULL THEN
            UPDATE community_discussion_comments SET vote_score = vote_score + NEW.vote_type WHERE id = NEW.comment_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.discussion_id IS NOT NULL THEN
            UPDATE community_discussions SET vote_score = vote_score - OLD.vote_type WHERE id = OLD.discussion_id;
        ELSIF OLD.comment_id IS NOT NULL THEN
            UPDATE community_discussion_comments SET vote_score = vote_score - OLD.vote_type WHERE id = OLD.comment_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.discussion_id IS NOT NULL THEN
            UPDATE community_discussions SET vote_score = vote_score - OLD.vote_type + NEW.vote_type WHERE id = NEW.discussion_id;
        ELSIF NEW.comment_id IS NOT NULL THEN
            UPDATE community_discussion_comments SET vote_score = vote_score - OLD.vote_type + NEW.vote_type WHERE id = NEW.comment_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update discussion vote scores
CREATE TRIGGER update_discussion_vote_score_trigger
AFTER INSERT OR UPDATE OR DELETE ON community_discussion_votes
FOR EACH ROW EXECUTE FUNCTION update_discussion_vote_score();

-- Function to update updated_at timestamp (generic for all tables)
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update communities updated_at
CREATE TRIGGER update_communities_updated_at_trigger
BEFORE UPDATE ON communities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

-- Trigger to automatically update discussions updated_at
CREATE TRIGGER update_discussions_updated_at_trigger
BEFORE UPDATE ON community_discussions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();

-- Trigger to automatically update discussion comments updated_at
CREATE TRIGGER update_discussion_comments_updated_at_trigger
BEFORE UPDATE ON community_discussion_comments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_timestamp();
