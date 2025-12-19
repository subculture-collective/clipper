-- Forum voting system migration
-- Implements upvote/downvote system with reputation mechanics

-- Create forum_votes table
CREATE TABLE IF NOT EXISTS forum_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reply_id UUID NOT NULL REFERENCES forum_replies(id) ON DELETE CASCADE,
    vote_value SMALLINT NOT NULL CHECK (vote_value IN (-1, 0, 1)), -- 1=upvote, -1=downvote, 0=neutral
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, reply_id)
);

-- Indexes for vote queries
CREATE INDEX idx_forum_votes_reply ON forum_votes(reply_id) WHERE vote_value != 0;
CREATE INDEX idx_forum_votes_user ON forum_votes(user_id);
CREATE INDEX idx_forum_votes_created ON forum_votes(created_at DESC);

-- Materialized view for vote aggregation (for performance)
CREATE MATERIALIZED VIEW forum_vote_counts AS
SELECT 
    reply_id,
    SUM(CASE WHEN vote_value = 1 THEN 1 ELSE 0 END)::INT as upvote_count,
    SUM(CASE WHEN vote_value = -1 THEN 1 ELSE 0 END)::INT as downvote_count,
    SUM(vote_value)::INT as net_votes
FROM forum_votes
WHERE vote_value != 0
GROUP BY reply_id;

-- Index on materialized view
CREATE UNIQUE INDEX idx_forum_vote_counts_reply ON forum_vote_counts(reply_id);

-- User reputation tracking table
CREATE TABLE IF NOT EXISTS user_reputation (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_votes INT DEFAULT 0,
    threads_created INT DEFAULT 0,
    replies_created INT DEFAULT 0,
    reputation_score INT DEFAULT 0,
    reputation_badge VARCHAR(50) DEFAULT 'new', -- new, contributor, expert, moderator
    last_updated TIMESTAMP DEFAULT NOW()
);

-- Index for reputation queries
CREATE INDEX idx_user_reputation_score ON user_reputation(reputation_score DESC);
CREATE INDEX idx_user_reputation_badge ON user_reputation(reputation_badge);

-- Add spam/quality tracking fields to forum_replies
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS flagged_as_spam BOOLEAN DEFAULT FALSE;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT FALSE;

-- Index for spam detection queries
CREATE INDEX idx_forum_replies_spam ON forum_replies(flagged_as_spam, hidden) WHERE is_deleted = FALSE;

-- Function to update reputation score for a user
CREATE OR REPLACE FUNCTION update_reputation_score(p_user_id UUID) RETURNS INT AS $$
DECLARE
    v_upvotes INT;
    v_downvotes INT;
    v_threads INT;
    v_replies INT;
    v_score INT;
    v_badge VARCHAR(50);
BEGIN
    -- Count votes received on user's replies
    SELECT 
        COALESCE(SUM(CASE WHEN fv.vote_value = 1 THEN 1 ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN fv.vote_value = -1 THEN 1 ELSE 0 END), 0)
    INTO v_upvotes, v_downvotes
    FROM forum_votes fv
    INNER JOIN forum_replies fr ON fv.reply_id = fr.id
    WHERE fr.user_id = p_user_id AND fr.is_deleted = FALSE;
    
    -- Count contributions
    SELECT COUNT(*) INTO v_threads FROM forum_threads WHERE user_id = p_user_id AND is_deleted = FALSE;
    SELECT COUNT(*) INTO v_replies FROM forum_replies WHERE user_id = p_user_id AND is_deleted = FALSE;
    
    -- Calculate score: upvotes*5 - downvotes*2 + threads*10 + replies*2
    v_score := (v_upvotes * 5) - (v_downvotes * 2) + (v_threads * 10) + (v_replies * 2);
    v_score := GREATEST(0, v_score); -- No negative scores
    
    -- Determine badge based on score thresholds
    IF v_score >= 250 THEN
        v_badge := 'expert';
    ELSIF v_score >= 50 THEN
        v_badge := 'contributor';
    ELSE
        v_badge := 'new';
    END IF;
    
    -- Upsert reputation record
    INSERT INTO user_reputation (
        user_id, 
        reputation_score, 
        reputation_badge, 
        total_votes, 
        threads_created, 
        replies_created, 
        last_updated
    )
    VALUES (
        p_user_id,
        v_score,
        v_badge,
        v_upvotes - v_downvotes,
        v_threads,
        v_replies,
        NOW()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        reputation_score = EXCLUDED.reputation_score,
        reputation_badge = EXCLUDED.reputation_badge,
        total_votes = EXCLUDED.total_votes,
        threads_created = EXCLUDED.threads_created,
        replies_created = EXCLUDED.replies_created,
        last_updated = EXCLUDED.last_updated;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh vote counts materialized view incrementally (single reply)
CREATE OR REPLACE FUNCTION refresh_reply_vote_count(p_reply_id UUID) RETURNS VOID AS $$
BEGIN
    -- Delete existing count for this reply
    DELETE FROM forum_vote_counts WHERE reply_id = p_reply_id;
    
    -- Reinsert updated count
    INSERT INTO forum_vote_counts (reply_id, upvote_count, downvote_count, net_votes)
    SELECT 
        p_reply_id,
        SUM(CASE WHEN vote_value = 1 THEN 1 ELSE 0 END)::INT,
        SUM(CASE WHEN vote_value = -1 THEN 1 ELSE 0 END)::INT,
        SUM(vote_value)::INT
    FROM forum_votes
    WHERE reply_id = p_reply_id AND vote_value != 0
    GROUP BY reply_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update vote counts when votes change
CREATE OR REPLACE FUNCTION trigger_update_vote_counts() RETURNS TRIGGER AS $$
BEGIN
    -- For INSERT/UPDATE, refresh the new reply's counts
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        PERFORM refresh_reply_vote_count(NEW.reply_id);
    END IF;
    
    -- For DELETE or UPDATE that changes reply_id, refresh old reply's counts
    IF TG_OP IN ('DELETE', 'UPDATE') THEN
        IF TG_OP = 'DELETE' OR OLD.reply_id != NEW.reply_id THEN
            PERFORM refresh_reply_vote_count(OLD.reply_id);
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_forum_votes_update_counts
AFTER INSERT OR UPDATE OR DELETE ON forum_votes
FOR EACH ROW
EXECUTE FUNCTION trigger_update_vote_counts();

-- Initialize reputation for existing users with forum activity
INSERT INTO user_reputation (user_id, reputation_score, reputation_badge, total_votes, threads_created, replies_created)
SELECT 
    u.id,
    0,
    'new',
    0,
    COALESCE(t.thread_count, 0),
    COALESCE(r.reply_count, 0)
FROM users u
LEFT JOIN (
    SELECT user_id, COUNT(*) as thread_count 
    FROM forum_threads 
    WHERE is_deleted = FALSE 
    GROUP BY user_id
) t ON u.id = t.user_id
LEFT JOIN (
    SELECT user_id, COUNT(*) as reply_count 
    FROM forum_replies 
    WHERE is_deleted = FALSE 
    GROUP BY user_id
) r ON u.id = r.user_id
WHERE EXISTS (
    SELECT 1 FROM forum_threads WHERE user_id = u.id
    UNION
    SELECT 1 FROM forum_replies WHERE user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Update all user reputations based on initial data
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT DISTINCT user_id FROM user_reputation
    LOOP
        PERFORM update_reputation_score(user_record.user_id);
    END LOOP;
END $$;
