-- Add NSFW Detection System
-- Extends the moderation queue with NSFW-specific columns and creates tracking tables

-- Add NSFW detection metadata to moderation queue
ALTER TABLE moderation_queue
ADD COLUMN IF NOT EXISTS nsfw_categories JSONB,
ADD COLUMN IF NOT EXISTS nsfw_detected_at TIMESTAMP;

-- Create index for NSFW-related queries
CREATE INDEX IF NOT EXISTS idx_modqueue_nsfw_reason 
ON moderation_queue(reason) 
WHERE reason IN ('nsfw_detected', 'nsfw_nudity_explicit', 'nsfw_sexual_content', 'nsfw_offensive_content');

-- NSFW Detection Metrics Table
CREATE TABLE IF NOT EXISTS nsfw_detection_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(20) NOT NULL,
    content_id UUID NOT NULL,
    image_url TEXT NOT NULL,
    nsfw BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,2) NOT NULL,
    categories JSONB,
    reason_codes TEXT[],
    latency_ms INT NOT NULL,
    flagged_to_queue BOOLEAN DEFAULT FALSE,
    detected_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT nsfw_metrics_valid_content_type CHECK (content_type IN ('clip', 'thumbnail', 'submission', 'user')),
    CONSTRAINT nsfw_metrics_valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Indexes for NSFW metrics queries
CREATE INDEX idx_nsfw_metrics_content ON nsfw_detection_metrics(content_type, content_id);
CREATE INDEX idx_nsfw_metrics_detected_at ON nsfw_detection_metrics(detected_at DESC);
CREATE INDEX idx_nsfw_metrics_nsfw ON nsfw_detection_metrics(nsfw) WHERE nsfw = true;
CREATE INDEX idx_nsfw_metrics_latency ON nsfw_detection_metrics(latency_ms);

-- NSFW Scan Jobs Table (for tracking background scan operations)
CREATE TABLE IF NOT EXISTS nsfw_scan_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type VARCHAR(50) NOT NULL, -- 'clips', 'thumbnails', 'submissions'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    total_items INT DEFAULT 0,
    processed_items INT DEFAULT 0,
    nsfw_found INT DEFAULT 0,
    auto_flag BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT nsfw_scan_jobs_valid_status CHECK (status IN ('pending', 'running', 'completed', 'failed'))
);

-- Index for job status queries
CREATE INDEX idx_nsfw_scan_jobs_status ON nsfw_scan_jobs(status, created_at DESC);

-- Function to update NSFW scan job progress
CREATE OR REPLACE FUNCTION update_nsfw_scan_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'running' AND OLD.status = 'pending' THEN
        NEW.started_at = NOW();
    ELSIF NEW.status IN ('completed', 'failed') AND OLD.status = 'running' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_nsfw_scan_progress
    BEFORE UPDATE ON nsfw_scan_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_nsfw_scan_progress();

-- Add comment to document the NSFW detection system
COMMENT ON TABLE nsfw_detection_metrics IS 'Tracks all NSFW detection results for images and thumbnails, including latency metrics';
COMMENT ON TABLE nsfw_scan_jobs IS 'Tracks background jobs for bulk NSFW scanning of existing content';
COMMENT ON COLUMN moderation_queue.nsfw_categories IS 'JSONB object containing detailed NSFW category scores from detection API';
COMMENT ON COLUMN moderation_queue.nsfw_detected_at IS 'Timestamp when NSFW content was automatically detected';
