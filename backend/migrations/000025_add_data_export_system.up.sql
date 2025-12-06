-- Add data export system for creators to export their clip data

-- Create export_requests table to track data export jobs
CREATE TABLE IF NOT EXISTS export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_name VARCHAR(255) NOT NULL,
    format VARCHAR(10) NOT NULL CHECK (format IN ('csv', 'json')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    file_path TEXT,
    file_size_bytes BIGINT,
    error_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    email_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for efficient lookups
CREATE INDEX idx_export_requests_user_id ON export_requests(user_id);
CREATE INDEX idx_export_requests_status ON export_requests(status);
CREATE INDEX idx_export_requests_created_at ON export_requests(created_at DESC);
CREATE INDEX idx_export_requests_expires_at ON export_requests(expires_at) WHERE status = 'completed';
CREATE INDEX idx_export_requests_status_created ON export_requests(status, created_at ASC);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_export_requests_updated_at
    BEFORE UPDATE ON export_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
