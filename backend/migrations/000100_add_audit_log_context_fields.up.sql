-- Add context fields to moderation_audit_logs for comprehensive audit tracking

-- Add IP address, user agent, and channel fields
ALTER TABLE moderation_audit_logs
ADD COLUMN ip_address INET,
ADD COLUMN user_agent TEXT,
ADD COLUMN channel_id UUID;

-- Create indexes for filtering
CREATE INDEX idx_audit_logs_channel ON moderation_audit_logs(channel_id) WHERE channel_id IS NOT NULL;
CREATE INDEX idx_audit_logs_ip_address ON moderation_audit_logs(ip_address) WHERE ip_address IS NOT NULL;

-- Add comment to explain the fields
COMMENT ON COLUMN moderation_audit_logs.ip_address IS 'IP address from which the action was performed';
COMMENT ON COLUMN moderation_audit_logs.user_agent IS 'User agent string from the client that performed the action';
COMMENT ON COLUMN moderation_audit_logs.channel_id IS 'Optional channel context for chat/moderation actions';
