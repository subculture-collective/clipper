/**
 * Biometric authentication utilities for MFA
 */

import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricCapability {
    available: boolean;
    enrolled: boolean;
    biometricType?: 'fingerprint' | 'facial' | 'iris' | 'unknown';
}

/**
 * Check if biometric authentication is available and enrolled
 */
export async function checkBiometricCapability(): Promise<BiometricCapability> {
    try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        if (!compatible) {
            return { available: false, enrolled: false };
        }

        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (!enrolled) {
            return { available: true, enrolled: false };
        }

        // Get supported authentication types
        const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
        let biometricType: BiometricCapability['biometricType'] = 'unknown';

        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
            biometricType = 'facial';
        } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
            biometricType = 'fingerprint';
        } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
            biometricType = 'iris';
        }

        return {
            available: true,
            enrolled: true,
            biometricType,
        };
    } catch (error) {
        console.error('Error checking biometric capability:', error);
        return { available: false, enrolled: false };
    }
}

/**
 * Authenticate using biometrics
 * @param promptMessage Message to show in the biometric prompt
 * @param fallbackLabel Label for fallback option
 * @returns true if authentication was successful
 */
export async function authenticateWithBiometrics(
    promptMessage: string = 'Authenticate to continue',
    fallbackLabel: string = 'Use passcode'
): Promise<boolean> {
    try {
        const capability = await checkBiometricCapability();
        
        if (!capability.available || !capability.enrolled) {
            return false;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage,
            fallbackLabel,
            disableDeviceFallback: false,
            cancelLabel: 'Cancel',
        });

        return result.success;
    } catch (error) {
        console.error('Biometric authentication error:', error);
        return false;
    }
}

/**
 * Get a user-friendly description of the biometric type
 */
export function getBiometricTypeLabel(type?: BiometricCapability['biometricType']): string {
    switch (type) {
        case 'facial':
            return 'Face ID';
        case 'fingerprint':
            return 'Touch ID';
        case 'iris':
            return 'Iris Scan';
        default:
            return 'Biometric';
    }
}
