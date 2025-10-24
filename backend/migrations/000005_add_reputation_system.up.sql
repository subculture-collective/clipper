-- User badges table for badge assignments
CREATE TABLE user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL,
    awarded_at TIMESTAMP DEFAULT NOW(),
    awarded_by UUID REFERENCES users(id), -- NULL if automatically awarded
    UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);
CREATE INDEX idx_user_badges_awarded ON user_badges(awarded_at DESC);

-- Karma history table for tracking karma changes
CREATE TABLE karma_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL, -- +/- karma change
    source VARCHAR(50) NOT NULL, -- 'clip_vote', 'comment_vote', 'awarded_comment', etc.
    source_id UUID, -- ID of voted content or related entity
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_karma_history_user ON karma_history(user_id, created_at DESC);
CREATE INDEX idx_karma_history_source ON karma_history(source, source_id);

-- User statistics table for trust and engagement scores
CREATE TABLE user_stats (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    trust_score INT DEFAULT 0, -- 0-100
    engagement_score INT DEFAULT 0,
    total_comments INT DEFAULT 0,
    total_votes_cast INT DEFAULT 0,
    total_clips_submitted INT DEFAULT 0,
    correct_reports INT DEFAULT 0,
    incorrect_reports INT DEFAULT 0,
    days_active INT DEFAULT 0,
    last_active_date DATE,
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_stats_trust ON user_stats(trust_score DESC);
CREATE INDEX idx_user_stats_engagement ON user_stats(engagement_score DESC);

-- Function to update user karma and create history entry
CREATE OR REPLACE FUNCTION update_user_karma(
    p_user_id UUID,
    p_amount INT,
    p_source VARCHAR(50),
    p_source_id UUID
)
RETURNS VOID AS $$
BEGIN
    -- Update user's karma points
    UPDATE users 
    SET karma_points = GREATEST(karma_points + p_amount, 0)
    WHERE id = p_user_id;
    
    -- Insert karma history record
    INSERT INTO karma_history (user_id, amount, source, source_id)
    VALUES (p_user_id, p_amount, p_source, p_source_id);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate trust score
CREATE OR REPLACE FUNCTION calculate_trust_score(p_user_id UUID)
RETURNS INT AS $$
DECLARE
    v_account_age_days INT;
    v_karma INT;
    v_correct_reports INT;
    v_incorrect_reports INT;
    v_is_banned BOOLEAN;
    v_trust_score INT := 0;
BEGIN
    -- Get user data
    SELECT 
        EXTRACT(EPOCH FROM (NOW() - created_at))::INT / 86400,
        karma_points,
        is_banned
    INTO v_account_age_days, v_karma, v_is_banned
    FROM users
    WHERE id = p_user_id;
    
    -- Get report accuracy
    SELECT 
        COALESCE(correct_reports, 0),
        COALESCE(incorrect_reports, 0)
    INTO v_correct_reports, v_incorrect_reports
    FROM user_stats
    WHERE user_id = p_user_id;
    
    -- Account age contribution (max 20 points)
    v_trust_score := v_trust_score + LEAST(v_account_age_days / 18, 20);
    
    -- Karma contribution (max 40 points)
    v_trust_score := v_trust_score + LEAST(v_karma / 250, 40);
    
    -- Report accuracy contribution (max 20 points)
    IF (v_correct_reports + v_incorrect_reports) > 0 THEN
        v_trust_score := v_trust_score + (20 * v_correct_reports / (v_correct_reports + v_incorrect_reports));
    END IF;
    
    -- Activity contribution (max 20 points) - if user has stats
    IF EXISTS (SELECT 1 FROM user_stats WHERE user_id = p_user_id) THEN
        v_trust_score := v_trust_score + LEAST(
            (SELECT (total_comments / 10 + total_votes_cast / 100 + days_active / 5) 
             FROM user_stats WHERE user_id = p_user_id), 
            20
        );
    END IF;
    
    -- Penalty for banned users
    IF v_is_banned THEN
        v_trust_score := v_trust_score / 2;
    END IF;
    
    -- Clamp to 0-100 range
    RETURN GREATEST(0, LEAST(v_trust_score, 100));
END;
$$ LANGUAGE plpgsql;

-- Function to update engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(p_user_id UUID)
RETURNS INT AS $$
DECLARE
    v_score INT := 0;
    v_stats RECORD;
BEGIN
    SELECT * INTO v_stats FROM user_stats WHERE user_id = p_user_id;
    
    IF v_stats IS NULL THEN
        RETURN 0;
    END IF;
    
    -- Calculate engagement score based on activity
    v_score := v_score + (v_stats.total_comments * 2);
    v_score := v_score + v_stats.total_votes_cast;
    v_score := v_score + (v_stats.total_clips_submitted * 5);
    v_score := v_score + (v_stats.days_active * 3);
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to get user rank based on karma
CREATE OR REPLACE FUNCTION get_user_rank(p_karma INT)
RETURNS VARCHAR(20) AS $$
BEGIN
    CASE 
        WHEN p_karma >= 10000 THEN RETURN 'Legend';
        WHEN p_karma >= 5000 THEN RETURN 'Veteran';
        WHEN p_karma >= 1000 THEN RETURN 'Contributor';
        WHEN p_karma >= 500 THEN RETURN 'Regular';
        WHEN p_karma >= 100 THEN RETURN 'Member';
        ELSE RETURN 'Newcomer';
    END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to award karma on clip votes
CREATE OR REPLACE FUNCTION award_karma_on_clip_vote()
RETURNS TRIGGER AS $$
DECLARE
    v_clip_owner_id UUID;
BEGIN
    -- Get the clip owner
    SELECT user_id INTO v_clip_owner_id
    FROM clip_submissions
    WHERE twitch_clip_id = (SELECT twitch_clip_id FROM clips WHERE id = NEW.clip_id)
    LIMIT 1;
    
    -- If clip has an owner (from submissions), award karma
    IF v_clip_owner_id IS NOT NULL THEN
        IF TG_OP = 'INSERT' THEN
            -- Award karma based on vote type
            IF NEW.vote_type = 1 THEN
                PERFORM update_user_karma(v_clip_owner_id, 1, 'clip_vote', NEW.clip_id);
            ELSIF NEW.vote_type = -1 THEN
                PERFORM update_user_karma(v_clip_owner_id, -1, 'clip_vote', NEW.clip_id);
            END IF;
        ELSIF TG_OP = 'UPDATE' THEN
            -- Adjust karma if vote changed
            IF OLD.vote_type != NEW.vote_type THEN
                IF NEW.vote_type = 1 THEN
                    PERFORM update_user_karma(v_clip_owner_id, 2, 'clip_vote', NEW.clip_id);
                ELSIF NEW.vote_type = -1 THEN
                    PERFORM update_user_karma(v_clip_owner_id, -2, 'clip_vote', NEW.clip_id);
                END IF;
            END IF;
        ELSIF TG_OP = 'DELETE' THEN
            -- Remove karma when vote is deleted
            IF OLD.vote_type = 1 THEN
                PERFORM update_user_karma(v_clip_owner_id, -1, 'clip_vote', OLD.clip_id);
            ELSIF OLD.vote_type = -1 THEN
                PERFORM update_user_karma(v_clip_owner_id, 1, 'clip_vote', OLD.clip_id);
            END IF;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_karma_on_clip_vote 
AFTER INSERT OR UPDATE OR DELETE ON votes
FOR EACH ROW EXECUTE FUNCTION award_karma_on_clip_vote();

-- Trigger to award karma on comment votes
CREATE OR REPLACE FUNCTION award_karma_on_comment_vote()
RETURNS TRIGGER AS $$
DECLARE
    v_comment_owner_id UUID;
BEGIN
    -- Get the comment owner
    SELECT user_id INTO v_comment_owner_id
    FROM comments
    WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
    
    IF TG_OP = 'INSERT' THEN
        -- Award karma based on vote type
        IF NEW.vote_type = 1 THEN
            PERFORM update_user_karma(v_comment_owner_id, 1, 'comment_vote', NEW.comment_id);
        ELSIF NEW.vote_type = -1 THEN
            PERFORM update_user_karma(v_comment_owner_id, -1, 'comment_vote', NEW.comment_id);
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Adjust karma if vote changed
        IF OLD.vote_type != NEW.vote_type THEN
            IF NEW.vote_type = 1 THEN
                PERFORM update_user_karma(v_comment_owner_id, 2, 'comment_vote', NEW.comment_id);
            ELSIF NEW.vote_type = -1 THEN
                PERFORM update_user_karma(v_comment_owner_id, -2, 'comment_vote', NEW.comment_id);
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove karma when vote is deleted
        IF OLD.vote_type = 1 THEN
            PERFORM update_user_karma(v_comment_owner_id, -1, 'comment_vote', OLD.comment_id);
        ELSIF OLD.vote_type = -1 THEN
            PERFORM update_user_karma(v_comment_owner_id, 1, 'comment_vote', OLD.comment_id);
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_karma_on_comment_vote 
AFTER INSERT OR UPDATE OR DELETE ON comment_votes
FOR EACH ROW EXECUTE FUNCTION award_karma_on_comment_vote();

-- Initialize user_stats for existing users
INSERT INTO user_stats (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Leaderboard views
CREATE VIEW karma_leaderboard AS
SELECT 
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.karma_points,
    get_user_rank(u.karma_points) as rank,
    u.created_at as account_created_at
FROM users u
WHERE u.is_banned = false
ORDER BY u.karma_points DESC;

CREATE VIEW engagement_leaderboard AS
SELECT 
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    us.engagement_score,
    us.total_comments,
    us.total_votes_cast,
    us.total_clips_submitted
FROM users u
JOIN user_stats us ON u.id = us.user_id
WHERE u.is_banned = false
ORDER BY us.engagement_score DESC;
