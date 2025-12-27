/**
 * MFA service tests
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

// Mock the API module
jest.mock('../lib/api', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
        delete: jest.fn(),
    },
}));

// Mock expo-local-authentication
jest.mock('expo-local-authentication', () => ({
    hasHardwareAsync: jest.fn(),
    isEnrolledAsync: jest.fn(),
    supportedAuthenticationTypesAsync: jest.fn(),
    authenticateAsync: jest.fn(),
    AuthenticationType: {
        FINGERPRINT: 1,
        FACIAL_RECOGNITION: 2,
        IRIS: 3,
    },
}));

import { api } from '../lib/api';
import * as LocalAuthentication from 'expo-local-authentication';
import {
    getMFAStatus,
    verifyMFALogin,
    getTrustedDevices,
    revokeTrustedDevice,
    resendEmailOTP,
} from '../services/mfa';
import {
    checkBiometricCapability,
    authenticateWithBiometrics,
    getBiometricTypeLabel,
} from '../lib/biometric';

describe('MFA Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getMFAStatus', () => {
        test('should call GET /auth/mfa/status and return MFA status', async () => {
            const mockStatus = {
                enabled: true,
                enrolled_at: '2025-01-01T00:00:00Z',
                backup_codes_remaining: 8,
                trusted_devices_count: 2,
                required: false,
                in_grace_period: false,
            };

            (api.get as jest.Mock).mockResolvedValue({ data: mockStatus });

            const result = await getMFAStatus();

            expect(api.get).toHaveBeenCalledWith('/auth/mfa/status');
            expect(result).toEqual(mockStatus);
        });
    });

    describe('verifyMFALogin', () => {
        test('should verify TOTP code without trust device', async () => {
            const mockResponse = {
                message: 'MFA verification successful',
                user_id: 'user-123',
            };

            (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

            const result = await verifyMFALogin('123456');

            expect(api.post).toHaveBeenCalledWith('/auth/mfa/verify-login', {
                code: '123456',
                trust_device: undefined,
            });
            expect(result).toEqual(mockResponse);
        });

        test('should verify backup code with trust device enabled', async () => {
            const mockResponse = {
                message: 'MFA verification successful',
                user_id: 'user-123',
            };

            (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

            const result = await verifyMFALogin('ABCD1234', true);

            expect(api.post).toHaveBeenCalledWith('/auth/mfa/verify-login', {
                code: 'ABCD1234',
                trust_device: true,
            });
            expect(result).toEqual(mockResponse);
        });
    });

    describe('getTrustedDevices', () => {
        test('should fetch and return trusted devices list', async () => {
            const mockDevices = [
                {
                    id: 1,
                    device_name: 'iPhone 13',
                    fingerprint: 'abc123',
                    created_at: '2025-01-01T00:00:00Z',
                    last_used_at: '2025-01-02T00:00:00Z',
                    ip_address: '192.168.1.1',
                },
            ];

            (api.get as jest.Mock).mockResolvedValue({ data: { devices: mockDevices } });

            const result = await getTrustedDevices();

            expect(api.get).toHaveBeenCalledWith('/auth/mfa/trusted-devices');
            expect(result).toEqual(mockDevices);
        });
    });

    describe('revokeTrustedDevice', () => {
        test('should call DELETE with device ID', async () => {
            (api.delete as jest.Mock).mockResolvedValue({});

            await revokeTrustedDevice(123);

            expect(api.delete).toHaveBeenCalledWith('/auth/mfa/trusted-devices/123');
        });
    });

    describe('resendEmailOTP', () => {
        test('should call POST /auth/mfa/resend-email-otp', async () => {
            const mockResponse = { message: 'Email sent successfully' };

            (api.post as jest.Mock).mockResolvedValue({ data: mockResponse });

            const result = await resendEmailOTP();

            expect(api.post).toHaveBeenCalledWith('/auth/mfa/resend-email-otp');
            expect(result).toEqual(mockResponse);
        });
    });
});

describe('Biometric Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('checkBiometricCapability', () => {
        test('should return unavailable when hardware not present', async () => {
            (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);

            const result = await checkBiometricCapability();

            expect(result).toEqual({
                available: false,
                enrolled: false,
            });
        });

        test('should return available but not enrolled', async () => {
            (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
            (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

            const result = await checkBiometricCapability();

            expect(result).toEqual({
                available: true,
                enrolled: false,
            });
        });

        test('should detect fingerprint biometric type', async () => {
            (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
            (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
            (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
                LocalAuthentication.AuthenticationType.FINGERPRINT,
            ]);

            const result = await checkBiometricCapability();

            expect(result).toEqual({
                available: true,
                enrolled: true,
                biometricType: 'fingerprint',
            });
        });

        test('should detect facial recognition biometric type', async () => {
            (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
            (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
            (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
                LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
            ]);

            const result = await checkBiometricCapability();

            expect(result).toEqual({
                available: true,
                enrolled: true,
                biometricType: 'facial',
            });
        });
    });

    describe('authenticateWithBiometrics', () => {
        test('should return true on successful authentication', async () => {
            (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
            (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
            (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
                success: true,
            });

            const result = await authenticateWithBiometrics('Test prompt');

            expect(result).toBe(true);
            expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
                promptMessage: 'Test prompt',
                fallbackLabel: 'Use passcode',
                disableDeviceFallback: false,
                cancelLabel: 'Cancel',
            });
        });

        test('should return false on failed authentication', async () => {
            (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
            (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
            (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
                success: false,
            });

            const result = await authenticateWithBiometrics();

            expect(result).toBe(false);
        });

        test('should return false when biometrics not available', async () => {
            (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);

            const result = await authenticateWithBiometrics();

            expect(result).toBe(false);
        });
    });

    describe('getBiometricTypeLabel', () => {
        test('should return "Face ID" for facial type', () => {
            expect(getBiometricTypeLabel('facial')).toBe('Face ID');
        });

        test('should return "Touch ID" for fingerprint type', () => {
            expect(getBiometricTypeLabel('fingerprint')).toBe('Touch ID');
        });

        test('should return "Iris Scan" for iris type', () => {
            expect(getBiometricTypeLabel('iris')).toBe('Iris Scan');
        });

        test('should return "Biometric" for unknown type', () => {
            expect(getBiometricTypeLabel('unknown')).toBe('Biometric');
        });
    });
});
