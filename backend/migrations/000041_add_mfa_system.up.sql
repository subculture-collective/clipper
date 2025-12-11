-- Multi-Factor Authentication System

-- Table for storing user MFA configurations
CREATE TABLE user_mfa (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    secret VARCHAR(255) NOT NULL, -- Encrypted TOTP secret (Base32)
    enabled BOOLEAN DEFAULT FALSE,
    enrolled_at TIMESTAMP,
    backup_codes TEXT[], -- Array of hashed backup codes
    backup_codes_generated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_mfa_user_id ON user_mfa(user_id);
CREATE INDEX idx_user_mfa_enabled ON user_mfa(enabled);

-- Table for trusted devices (remember me functionality)
CREATE TABLE mfa_trusted_devices (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL, -- Hash of user agent + other identifying info
    device_name VARCHAR(255), -- e.g., "Chrome on macOS"
    ip_address INET,
    user_agent TEXT,
    trusted_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL, -- 30 days from trusted_at
    last_used_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX idx_mfa_trusted_devices_user_id ON mfa_trusted_devices(user_id);
CREATE INDEX idx_mfa_trusted_devices_expires_at ON mfa_trusted_devices(expires_at);
CREATE INDEX idx_mfa_trusted_devices_fingerprint ON mfa_trusted_devices(device_fingerprint);

-- Table for MFA audit logs
CREATE TABLE mfa_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g., 'mfa_enabled', 'mfa_login_success', 'mfa_login_failed'
    success BOOLEAN DEFAULT TRUE,
    ip_address INET,
    user_agent TEXT,
    details TEXT, -- Additional context (JSON)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_mfa_audit_logs_user_id ON mfa_audit_logs(user_id);
CREATE INDEX idx_mfa_audit_logs_created_at ON mfa_audit_logs(created_at DESC);
CREATE INDEX idx_mfa_audit_logs_action ON mfa_audit_logs(action);
CREATE INDEX idx_mfa_audit_logs_success ON mfa_audit_logs(success);

-- Trigger for user_mfa.updated_at
CREATE TRIGGER update_user_mfa_updated_at 
    BEFORE UPDATE ON user_mfa
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
