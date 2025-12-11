-- Add account type fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'member';
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type_updated_at TIMESTAMP;

-- Create index on account_type for efficient filtering
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- Create account_type_conversions table for audit trail
CREATE TABLE IF NOT EXISTS account_type_conversions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    old_type VARCHAR(50) NOT NULL,
    new_type VARCHAR(50) NOT NULL,
    reason TEXT,
    converted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    converted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indices for account_type_conversions
CREATE INDEX IF NOT EXISTS idx_account_type_conversions_user_id ON account_type_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_account_type_conversions_converted_at ON account_type_conversions(converted_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_type_conversions_new_type ON account_type_conversions(new_type);

-- Update existing users to have default account_type
UPDATE users SET account_type = 'member' WHERE account_type IS NULL;

-- Make account_type NOT NULL after setting defaults
ALTER TABLE users ALTER COLUMN account_type SET NOT NULL;

-- Add comment explaining valid account types
COMMENT ON COLUMN users.account_type IS 'User account type: member (default), broadcaster, moderator, admin';
COMMENT ON TABLE account_type_conversions IS 'Audit trail of account type changes for compliance and analytics';
