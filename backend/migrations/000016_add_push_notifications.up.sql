-- Add device token fields to users table for push notifications
ALTER TABLE users 
    ADD COLUMN device_token TEXT,
    ADD COLUMN device_platform TEXT CHECK (device_platform IN ('ios', 'android', 'web'));

-- Create index on device_token for faster lookups
CREATE INDEX idx_users_device_token ON users(device_token) WHERE device_token IS NOT NULL;
