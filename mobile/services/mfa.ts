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
