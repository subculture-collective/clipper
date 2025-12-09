-- Add trust_score and trust_score_updated_at columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS trust_score INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS trust_score_updated_at TIMESTAMP;

-- Create indexes for trust score queries
CREATE INDEX IF NOT EXISTS idx_users_trust_score ON users(trust_score DESC) WHERE NOT is_banned;
CREATE INDEX IF NOT EXISTS idx_users_trust_score_updated_at ON users(trust_score_updated_at);

-- Create trust_score_history table for audit trail
CREATE TABLE IF NOT EXISTS trust_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_score INT NOT NULL,
    new_score INT NOT NULL,
    change_reason VARCHAR(100) NOT NULL, -- 'scheduled_recalc', 'submission_approved', 'report_actioned', 'manual_adjustment', etc.
    component_scores JSONB, -- Store breakdown of score components for debugging
    changed_by UUID REFERENCES users(id), -- NULL for automatic changes, admin ID for manual adjustments
    notes TEXT, -- Optional notes for manual adjustments
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for trust score history
CREATE INDEX IF NOT EXISTS idx_trust_score_history_user ON trust_score_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_score_history_reason ON trust_score_history(change_reason);
CREATE INDEX IF NOT EXISTS idx_trust_score_history_changed_by ON trust_score_history(changed_by) WHERE changed_by IS NOT NULL;

-- Function to update user trust score and log the change
CREATE OR REPLACE FUNCTION update_user_trust_score(
    p_user_id UUID,
    p_new_score INT,
    p_change_reason VARCHAR(100),
    p_component_scores JSONB DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_old_score INT;
BEGIN
    -- Get current trust score
    SELECT COALESCE(trust_score, 0) INTO v_old_score
    FROM users
    WHERE id = p_user_id;
    
    -- Only update if score has changed
    IF v_old_score != p_new_score THEN
        -- Update user's trust score
        UPDATE users 
        SET trust_score = p_new_score,
            trust_score_updated_at = NOW()
        WHERE id = p_user_id;
        
        -- Insert history record
        INSERT INTO trust_score_history (
            user_id, old_score, new_score, change_reason, 
            component_scores, changed_by, notes
        )
        VALUES (
            p_user_id, v_old_score, p_new_score, p_change_reason,
            p_component_scores, p_changed_by, p_notes
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Update existing users to have initial trust scores
UPDATE users 
SET trust_score = calculate_trust_score(id),
    trust_score_updated_at = NOW()
WHERE trust_score IS NULL;

-- Create a view for trust score leaderboard
CREATE OR REPLACE VIEW trust_score_leaderboard AS
SELECT 
    u.id,
    u.username,
    u.display_name,
    u.avatar_url,
    u.trust_score,
    u.karma_points,
    get_user_rank(u.karma_points) as rank,
    u.created_at as account_created_at,
    u.trust_score_updated_at
FROM users u
WHERE u.is_banned = false AND u.trust_score IS NOT NULL
ORDER BY u.trust_score DESC;
