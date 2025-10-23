-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twitch_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(50) NOT NULL,
    display_name VARCHAR(100),
    email VARCHAR(255),
    avatar_url TEXT,
    bio TEXT,
    karma_points INT DEFAULT 0,
    role VARCHAR(20) DEFAULT 'user', -- user, moderator, admin
    is_banned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP
);

CREATE INDEX idx_users_twitch_id ON users(twitch_id);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_karma ON users(karma_points DESC);

-- Clips table
CREATE TABLE clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    twitch_clip_id VARCHAR(100) UNIQUE NOT NULL,
    twitch_clip_url TEXT NOT NULL,
    embed_url TEXT NOT NULL,
    title VARCHAR(255) NOT NULL,
    creator_name VARCHAR(100) NOT NULL,
    creator_id VARCHAR(50),
    broadcaster_name VARCHAR(100) NOT NULL,
    broadcaster_id VARCHAR(50),
    game_id VARCHAR(50),
    game_name VARCHAR(100),
    language VARCHAR(10),
    thumbnail_url TEXT,
    duration FLOAT,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL, -- Twitch creation time
    imported_at TIMESTAMP DEFAULT NOW(),
    vote_score INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    favorite_count INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    is_nsfw BOOLEAN DEFAULT false,
    is_removed BOOLEAN DEFAULT false,
    removed_reason TEXT
);

CREATE INDEX idx_clips_twitch_id ON clips(twitch_clip_id);
CREATE INDEX idx_clips_broadcaster ON clips(broadcaster_id);
CREATE INDEX idx_clips_game ON clips(game_id);
CREATE INDEX idx_clips_created ON clips(created_at DESC);
CREATE INDEX idx_clips_vote_score ON clips(vote_score DESC);
CREATE INDEX idx_clips_hot ON clips(vote_score DESC, created_at DESC);

-- Votes table
CREATE TABLE votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL, -- 1 for upvote, -1 for downvote
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, clip_id)
);

CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_votes_clip ON votes(clip_id);
CREATE INDEX idx_votes_created ON votes(created_at DESC);

-- Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    vote_score INT DEFAULT 0,
    is_edited BOOLEAN DEFAULT false,
    is_removed BOOLEAN DEFAULT false,
    removed_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_comments_clip ON comments(clip_id, created_at);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id);
CREATE INDEX idx_comments_score ON comments(vote_score DESC);

-- Comment votes table
CREATE TABLE comment_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    vote_type SMALLINT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, comment_id)
);

CREATE INDEX idx_comment_votes_user ON comment_votes(user_id);
CREATE INDEX idx_comment_votes_comment ON comment_votes(comment_id);

-- Favorites table
CREATE TABLE favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, clip_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id, created_at DESC);
CREATE INDEX idx_favorites_clip ON favorites(clip_id);

-- Tags table
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tags_slug ON tags(slug);
CREATE INDEX idx_tags_usage ON tags(usage_count DESC);

-- Clip tags junction table
CREATE TABLE clip_tags (
    clip_id UUID NOT NULL REFERENCES clips(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY(clip_id, tag_id)
);

CREATE INDEX idx_clip_tags_clip ON clip_tags(clip_id);
CREATE INDEX idx_clip_tags_tag ON clip_tags(tag_id);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reportable_type VARCHAR(20) NOT NULL, -- 'clip', 'comment', 'user'
    reportable_id UUID NOT NULL,
    reason VARCHAR(50) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, actioned, dismissed
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON reports(status, created_at);
CREATE INDEX idx_reports_type ON reports(reportable_type, reportable_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users.updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for comments.updated_at
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate hot score (Reddit-style algorithm)
-- Score = log(max(|score|, 1)) * sign(score) - (age_in_hours / 12.5)
CREATE OR REPLACE FUNCTION calculate_hot_score(score INT, created_at TIMESTAMP)
RETURNS FLOAT AS $$
DECLARE
    age_hours FLOAT;
    order_value FLOAT;
BEGIN
    -- Calculate age in hours
    age_hours := EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0;
    
    -- Calculate order (logarithmic component)
    order_value := LOG(GREATEST(ABS(score), 1));
    
    -- Apply sign
    IF score > 0 THEN
        order_value := order_value;
    ELSIF score < 0 THEN
        order_value := -order_value;
    ELSE
        order_value := 0;
    END IF;
    
    -- Combine with time decay
    RETURN order_value - (age_hours / 12.5);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update clip vote_score when votes change
CREATE OR REPLACE FUNCTION update_clip_vote_score()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE clips 
        SET vote_score = vote_score + NEW.vote_type
        WHERE id = NEW.clip_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE clips 
        SET vote_score = vote_score - OLD.vote_type
        WHERE id = OLD.clip_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE clips 
        SET vote_score = vote_score - OLD.vote_type + NEW.vote_type
        WHERE id = NEW.clip_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for clip vote_score updates
CREATE TRIGGER update_clip_votes AFTER INSERT OR UPDATE OR DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_clip_vote_score();

-- Function to update comment vote_score when comment_votes change
CREATE OR REPLACE FUNCTION update_comment_vote_score()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE comments 
        SET vote_score = vote_score + NEW.vote_type
        WHERE id = NEW.comment_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE comments 
        SET vote_score = vote_score - OLD.vote_type
        WHERE id = OLD.comment_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE comments 
        SET vote_score = vote_score - OLD.vote_type + NEW.vote_type
        WHERE id = NEW.comment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment vote_score updates
CREATE TRIGGER update_comment_votes AFTER INSERT OR UPDATE OR DELETE ON comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_comment_vote_score();

-- Function to update clip comment_count
CREATE OR REPLACE FUNCTION update_clip_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE clips 
        SET comment_count = comment_count + 1
        WHERE id = NEW.clip_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE clips 
        SET comment_count = comment_count - 1
        WHERE id = OLD.clip_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for clip comment_count updates
CREATE TRIGGER update_clip_comments AFTER INSERT OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_clip_comment_count();

-- Function to update clip favorite_count
CREATE OR REPLACE FUNCTION update_clip_favorite_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE clips 
        SET favorite_count = favorite_count + 1
        WHERE id = NEW.clip_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE clips 
        SET favorite_count = favorite_count - 1
        WHERE id = OLD.clip_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for clip favorite_count updates
CREATE TRIGGER update_clip_favorites AFTER INSERT OR DELETE ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_clip_favorite_count();

-- Function to update tag usage_count
CREATE OR REPLACE FUNCTION update_tag_usage_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags 
        SET usage_count = usage_count + 1
        WHERE id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags 
        SET usage_count = usage_count - 1
        WHERE id = OLD.tag_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for tag usage_count updates
CREATE TRIGGER update_tag_usage AFTER INSERT OR DELETE ON clip_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_usage_count();

-- View for hot clips feed
CREATE VIEW hot_clips AS
SELECT 
    c.id, c.twitch_clip_id, c.twitch_clip_url, c.embed_url, c.title,
    c.creator_name, c.creator_id, c.broadcaster_name, c.broadcaster_id,
    c.game_id, c.game_name, c.language, c.thumbnail_url, c.duration,
    c.view_count, c.created_at, c.imported_at, c.vote_score, c.comment_count,
    c.favorite_count, c.is_featured, c.is_nsfw, c.is_removed, c.removed_reason,
    calculate_hot_score(c.vote_score, c.created_at) as hot_score
FROM clips c
WHERE c.is_removed = false
ORDER BY hot_score DESC;

-- View for top clips (by vote score)
CREATE VIEW top_clips AS
SELECT 
    c.id, c.twitch_clip_id, c.twitch_clip_url, c.embed_url, c.title,
    c.creator_name, c.creator_id, c.broadcaster_name, c.broadcaster_id,
    c.game_id, c.game_name, c.language, c.thumbnail_url, c.duration,
    c.view_count, c.created_at, c.imported_at, c.vote_score, c.comment_count,
    c.favorite_count, c.is_featured, c.is_nsfw, c.is_removed, c.removed_reason
FROM clips c
WHERE c.is_removed = false
ORDER BY c.vote_score DESC, c.created_at DESC;

-- View for new clips (most recent)
CREATE VIEW new_clips AS
SELECT 
    c.id, c.twitch_clip_id, c.twitch_clip_url, c.embed_url, c.title,
    c.creator_name, c.creator_id, c.broadcaster_name, c.broadcaster_id,
    c.game_id, c.game_name, c.language, c.thumbnail_url, c.duration,
    c.view_count, c.created_at, c.imported_at, c.vote_score, c.comment_count,
    c.favorite_count, c.is_featured, c.is_nsfw, c.is_removed, c.removed_reason
FROM clips c
WHERE c.is_removed = false
ORDER BY c.created_at DESC;

-- View for trending clips (recent + popular)
CREATE VIEW trending_clips AS
SELECT 
    c.id, c.twitch_clip_id, c.twitch_clip_url, c.embed_url, c.title,
    c.creator_name, c.creator_id, c.broadcaster_name, c.broadcaster_id,
    c.game_id, c.game_name, c.language, c.thumbnail_url, c.duration,
    c.view_count, c.created_at, c.imported_at, c.vote_score, c.comment_count,
    c.favorite_count, c.is_featured, c.is_nsfw, c.is_removed, c.removed_reason,
    calculate_hot_score(c.vote_score, c.created_at) as hot_score
FROM clips c
WHERE 
    c.is_removed = false 
    AND c.created_at > NOW() - INTERVAL '7 days'
ORDER BY hot_score DESC;
