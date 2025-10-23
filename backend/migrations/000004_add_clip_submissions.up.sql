-- Clip submissions table for user-submitted clips with moderation
CREATE TABLE clip_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    twitch_clip_id VARCHAR(100) NOT NULL,
    twitch_clip_url TEXT NOT NULL,
    title VARCHAR(255),
    custom_title VARCHAR(255),
    tags TEXT[], -- Array of tag suggestions
    is_nsfw BOOLEAN DEFAULT false,
    submission_reason TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    -- Metadata from Twitch (cached for review)
    creator_name VARCHAR(100),
    creator_id VARCHAR(50),
    broadcaster_name VARCHAR(100),
    broadcaster_id VARCHAR(50),
    game_id VARCHAR(50),
    game_name VARCHAR(100),
    thumbnail_url TEXT,
    duration FLOAT,
    view_count INT DEFAULT 0
);

CREATE INDEX idx_submissions_user ON clip_submissions(user_id);
CREATE INDEX idx_submissions_status ON clip_submissions(status);
CREATE INDEX idx_submissions_created ON clip_submissions(created_at DESC);
CREATE INDEX idx_submissions_twitch_id ON clip_submissions(twitch_clip_id);

-- Submission statistics view for user profiles
CREATE OR REPLACE VIEW submission_stats AS
SELECT 
    user_id,
    COUNT(*) as total_submissions,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
    CASE 
        WHEN COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')) > 0 
        THEN ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'approved') / 
             COUNT(*) FILTER (WHERE status IN ('approved', 'rejected')), 2)
        ELSE 0 
    END as approval_rate
FROM clip_submissions
GROUP BY user_id;
