-- Forum threads table
CREATE TABLE forum_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    locked BOOLEAN DEFAULT FALSE,
    pinned BOOLEAN DEFAULT FALSE,
    flag_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    view_count INT DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_forum_threads_user ON forum_threads(user_id);
CREATE INDEX idx_forum_threads_created ON forum_threads(created_at DESC);
CREATE INDEX idx_forum_threads_pinned ON forum_threads(pinned DESC, created_at DESC);
CREATE INDEX idx_forum_threads_deleted ON forum_threads(is_deleted) WHERE is_deleted = FALSE;

-- Forum replies table
CREATE TABLE forum_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_forum_replies_thread ON forum_replies(thread_id, created_at);
CREATE INDEX idx_forum_replies_user ON forum_replies(user_id);
CREATE INDEX idx_forum_replies_parent ON forum_replies(parent_reply_id);

-- Moderation actions table for forum audit trail
CREATE TABLE moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    action_type VARCHAR(50) NOT NULL, -- lock_thread, unlock_thread, pin_thread, unpin_thread, delete_thread, ban_user, unban_user
    target_type VARCHAR(50) NOT NULL, -- thread, reply, user
    target_id UUID NOT NULL,
    reason TEXT,
    metadata JSONB, -- Additional context
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moderation_actions_moderator ON moderation_actions(moderator_id);
CREATE INDEX idx_moderation_actions_target ON moderation_actions(target_type, target_id);
CREATE INDEX idx_moderation_actions_created ON moderation_actions(created_at DESC);
CREATE INDEX idx_moderation_actions_type ON moderation_actions(action_type);

-- User bans table
CREATE TABLE user_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    banned_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    expires_at TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_bans_user ON user_bans(user_id);
CREATE INDEX idx_user_bans_active ON user_bans(active) WHERE active = TRUE;
CREATE INDEX idx_user_bans_expires ON user_bans(expires_at) WHERE expires_at IS NOT NULL;

-- Content flags table for reporting
CREATE TABLE content_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type VARCHAR(50) NOT NULL, -- thread, reply
    target_id UUID NOT NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_content_flags_target ON content_flags(target_type, target_id);
CREATE INDEX idx_content_flags_status ON content_flags(status);
CREATE INDEX idx_content_flags_user ON content_flags(user_id);
CREATE INDEX idx_content_flags_created ON content_flags(created_at DESC);

-- Add function to update thread reply count
CREATE OR REPLACE FUNCTION update_thread_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forum_threads 
        SET reply_count = reply_count + 1, updated_at = NOW()
        WHERE id = NEW.thread_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE forum_threads 
        SET reply_count = GREATEST(0, reply_count - 1), updated_at = NOW()
        WHERE id = OLD.thread_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_thread_reply_count
AFTER INSERT OR DELETE ON forum_replies
FOR EACH ROW
EXECUTE FUNCTION update_thread_reply_count();

-- Add function to update thread flag count
CREATE OR REPLACE FUNCTION update_thread_flag_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.target_type = 'thread' THEN
        UPDATE forum_threads 
        SET flag_count = flag_count + 1
        WHERE id = NEW.target_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_thread_flag_count
AFTER INSERT ON content_flags
FOR EACH ROW
EXECUTE FUNCTION update_thread_flag_count();
