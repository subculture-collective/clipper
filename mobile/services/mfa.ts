/**
 * MFA service - Handles MFA challenge and verification
 */

import { api } from '../lib/api';

export type MFAChallengeType = 'totp' | 'email' | 'backup';

export interface MFAStatus {
    enabled: boolean;
    enrolled_at?: string;
    backup_codes_remaining: number;
    trusted_devices_count: number;
    required: boolean;
    required_at?: string;
    grace_period_end?: string;
    in_grace_period: boolean;
}

export interface VerifyMFARequest {
    code: string;
    trust_device?: boolean;
}

export interface VerifyMFAResponse {
    message: string;
    user_id: string;
}

export interface TrustedDevice {
    id: number;
    device_name: string;
    fingerprint: string;
    created_at: string;
    last_used_at: string;
    ip_address?: string;
}

export interface EnrollMFAResponse {
    secret: string;           // Base32 encoded secret for manual entry
    qr_code_url: string;      // Data URL for QR code image
    backup_codes: string[];   // Plain text backup codes (shown once)
}

export interface VerifyEnrollmentRequest {
    code: string;
}

/**
 * Get MFA status for the current user
 */
export async function getMFAStatus(): Promise<MFAStatus> {
    const response = await api.get<MFAStatus>('/auth/mfa/status');
    return response.data;
}

/**
 * Verify MFA code during login challenge
 */
export async function verifyMFALogin(
    code: string,
    trustDevice?: boolean
): Promise<VerifyMFAResponse> {
    const response = await api.post<VerifyMFAResponse>(
        '/auth/mfa/verify-login',
        {
            code,
            trust_device: trustDevice,
        }
    );
    return response.data;
}

/**
 * Get trusted devices for the current user
 */
export async function getTrustedDevices(): Promise<TrustedDevice[]> {
    const response = await api.get<{ devices: TrustedDevice[] }>(
        '/auth/mfa/trusted-devices'
    );
    return response.data.devices;
}

/**
 * Revoke a trusted device
 */
export async function revokeTrustedDevice(deviceId: number): Promise<void> {
    await api.delete(`/auth/mfa/trusted-devices/${deviceId}`);
}

/**
 * Request a new email OTP to be sent
 * Note: This endpoint needs to be implemented on the backend
 */
export async function resendEmailOTP(): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
        '/auth/mfa/resend-email-otp'
    );
    return response.data;
}

/**
 * Start MFA enrollment - generates TOTP secret and backup codes
 */
export async function startEnrollment(): Promise<EnrollMFAResponse> {
    const response = await api.post<EnrollMFAResponse>('/auth/mfa/enroll');
    return response.data;
}

/**
 * Verify enrollment code and enable MFA
 */
export async function verifyEnrollment(
    code: string,
    trustDevice?: boolean
): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
        '/auth/mfa/verify-enrollment',
        { code, trust_device: trustDevice }
    );
    return response.data;
}

/**
 * Regenerate backup codes (requires MFA code)
 */
export async function regenerateBackupCodes(code: string): Promise<{ backup_codes: string[] }> {
    const response = await api.post<{ backup_codes: string[] }>(
        '/auth/mfa/regenerate-backup-codes',
        { code }
    );
    return response.data;
}
