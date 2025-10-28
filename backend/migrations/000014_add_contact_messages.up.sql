-- Create contact_messages table to track user contact form submissions
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Nullable for logged-out users
    email VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('abuse', 'account', 'billing', 'feedback')),
    subject VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
    ip_address VARCHAR(45), -- For abuse prevention (IPv4 or IPv6)
    user_agent TEXT, -- For abuse prevention
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for quick lookups
CREATE INDEX idx_contact_messages_user_id ON contact_messages(user_id);

-- Create index on category for filtering
CREATE INDEX idx_contact_messages_category ON contact_messages(category);

-- Create index on status for filtering
CREATE INDEX idx_contact_messages_status ON contact_messages(status);

-- Create index on created_at for ordering
CREATE INDEX idx_contact_messages_created_at ON contact_messages(created_at DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_contact_messages_updated_at
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_contact_messages_updated_at();
