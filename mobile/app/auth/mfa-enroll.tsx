/**
 * MFA Enrollment screen - Handles TOTP enrollment via QR code or manual entry
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    ScrollView,
    Switch,
    TextInput,
    Share,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { startEnrollment, verifyEnrollment, type EnrollMFAResponse } from '@/services/mfa';

type EnrollmentStep = 'intro' | 'scan' | 'manual' | 'email-verify' | 'verify' | 'backup-codes' | 'complete';

export default function MFAEnrollScreen() {
    const router = useRouter();

    // Step management
    const [currentStep, setCurrentStep] = useState<EnrollmentStep>('intro');
    
    // Enrollment data
    const [enrollmentData, setEnrollmentData] = useState<EnrollMFAResponse | null>(null);
    const [manualSecret, setManualSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [trustDevice, setTrustDevice] = useState(false);
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [backupCodesViewed, setBackupCodesViewed] = useState(false);

    const handleStartEnrollment = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const data = await startEnrollment();
            setEnrollmentData(data);
        } catch (err: any) {
            console.error('Failed to start enrollment:', err);
            setError(err.message || 'Failed to start enrollment. Please try again.');
            Alert.alert(
                'Enrollment Failed',
                'Could not start MFA enrollment. Please try again.',
                [
                    {
                        text: 'Cancel',
                        onPress: () => router.back(),
                        style: 'cancel',
                    },
                    {
                        text: 'Retry',
                        onPress: () => handleStartEnrollment(),
                    },
                ]
            );
        } finally {
            setIsLoading(false);
        }
    }, [router]);

    // Start enrollment when entering scan or manual step
    useEffect(() => {
        if ((currentStep === 'scan' || currentStep === 'manual') && !enrollmentData) {
            handleStartEnrollment();
        }
    }, [currentStep, enrollmentData, handleStartEnrollment]);

    // The QR code enrollment flow does not involve scanning with the device camera.
    // Instead, the app displays the QR code (from enrollmentData.qr_code_url)
    // and the user scans it with their authenticator app (Google Authenticator, Authy, etc.).
    // The user then enters the TOTP code from their authenticator app to verify enrollment.

    const handleManualEntry = () => {
        const trimmedSecret = manualSecret.trim();

        if (!trimmedSecret) {
            setError('Please enter the secret key');
            return;
        }

        // Basic validation - should be base32 (case-sensitive, uppercase)
        if (!/^[A-Z2-7]+=*$/.test(trimmedSecret)) {
            setError('Invalid secret key format. Please check and try again.');
            return;
        }

        // Ensure the manually entered secret matches the server-provided secret
        if (!enrollmentData || !enrollmentData.secret) {
            setError('Unable to validate the secret key. Please try again.');
            return;
        }

        if (trimmedSecret !== enrollmentData.secret.trim()) {
            setError('The secret key you entered does not match the one provided. Please double-check and try again.');
            return;
        }

        setCurrentStep('verify');
    };

    const handleVerifyEnrollment = async () => {
        if (verificationCode.length !== 6) {
            setError('Please enter a 6-digit code');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await verifyEnrollment(verificationCode, trustDevice);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setCurrentStep('backup-codes');
        } catch (err: any) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('Failed to verify enrollment:', err);
            
            if (err.response?.status === 400) {
                setError('Invalid code. Please check your authenticator app and try again.');
            } else {
                setError(err.message || 'Failed to verify code. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyBackupCodes = async () => {
        if (!enrollmentData?.backup_codes) return;

        const codesText = enrollmentData.backup_codes.join('\n');
        await Clipboard.setStringAsync(codesText);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Copied', 'Backup codes copied to clipboard');
    };

    const handleShareBackupCodes = async () => {
        if (!enrollmentData?.backup_codes) return;

        const codesText = enrollmentData.backup_codes.join('\n');
        try {
            await Share.share({
                message: `MFA Backup Codes:\n\n${codesText}\n\nStore these codes securely. Each code can only be used once.`,
            });
        } catch (error) {
            console.error('Error sharing backup codes:', error);
        }
    };

    const handleComplete = () => {
        if (!backupCodesViewed) {
            Alert.alert(
                'Important',
                'Have you saved your backup codes? You will not be able to view them again.',
                [
                    {
                        text: 'Not Yet',
                        style: 'cancel',
                    },
                    {
                        text: 'Yes, Continue',
                        onPress: () => {
                            setBackupCodesViewed(true);
                            router.back();
                        },
                    },
                ]
            );
        } else {
            router.back();
        }
    };

    const renderIntroStep = () => (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-6">
                <Text className="text-2xl font-bold text-gray-900 mb-4">
                    Enable Two-Factor Authentication
                </Text>
                
                <Text className="text-base text-gray-700 mb-4">
                    Two-factor authentication (2FA) adds an extra layer of security to your account by requiring a code from your phone in addition to your password.
                </Text>

                <View className="bg-white rounded-lg p-4 mb-4">
                    <Text className="text-lg font-semibold text-gray-900 mb-3">
                        What you&apos;ll need:
                    </Text>
                    <View className="space-y-2">
                        <View className="flex-row items-start mb-2">
                            <Text className="text-primary-600 mr-2">•</Text>
                            <Text className="flex-1 text-gray-700">
                                An authenticator app (Google Authenticator, Authy, 1Password, etc.)
                            </Text>
                        </View>
                        <View className="flex-row items-start mb-2">
                            <Text className="text-primary-600 mr-2">•</Text>
                            <Text className="flex-1 text-gray-700">
                                Your phone&apos;s camera to scan a QR code (or you can enter a code manually)
                            </Text>
                        </View>
                        <View className="flex-row items-start">
                            <Text className="text-primary-600 mr-2">•</Text>
                            <Text className="flex-1 text-gray-700">
                                A secure place to store your backup codes
                            </Text>
                        </View>
                    </View>
                </View>

                <View className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <Text className="text-sm font-medium text-amber-900 mb-1">
                        ⚠️ Important
                    </Text>
                    <Text className="text-sm text-amber-800">
                        Keep your backup codes in a safe place. If you lose access to your authenticator app, you&apos;ll need these codes to regain access to your account.
                    </Text>
                </View>

                <TouchableOpacity
                    className="bg-primary-600 rounded-lg py-4 mb-3"
                    onPress={() => setCurrentStep('scan')}
                    accessible={true}
                    accessibilityLabel="Get started with two-factor authentication setup"
                    accessibilityRole="button"
                    accessibilityHint="Starts the MFA enrollment process"
                >
                    <Text className="text-center text-white font-semibold text-base">
                        Get Started
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="py-3"
                    onPress={() => router.back()}
                    accessible={true}
                    accessibilityLabel="Cancel enrollment"
                    accessibilityRole="button"
                >
                    <Text className="text-center text-gray-600 text-base">
                        Cancel
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderScanStep = () => {
        if (isLoading || !enrollmentData) {
            return (
                <View className="flex-1 items-center justify-center bg-gray-50">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text className="mt-4 text-gray-600">Preparing QR code...</Text>
                </View>
            );
        }

        return (
            <ScrollView className="flex-1 bg-gray-50">
                <View className="p-6">
                    <Text className="text-2xl font-bold text-gray-900 mb-4">
                        Scan QR Code
                    </Text>

                    <Text className="text-base text-gray-700 mb-6">
                        Open your authenticator app (Google Authenticator, Authy, 1Password, etc.) and scan this QR code to add your account.
                    </Text>

                    {/* Display the QR code from the server */}
                    <View className="items-center mb-6">
                        <View className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                            {enrollmentData.qr_code_url ? (
                                <Image
                                    source={{ uri: enrollmentData.qr_code_url }}
                                    style={{ width: 250, height: 250 }}
                                    resizeMode="contain"
                                    accessible={true}
                                    accessibilityLabel="QR code for two-factor authentication setup"
                                />
                            ) : (
                                <View 
                                    style={{ width: 250, height: 250 }} 
                                    className="items-center justify-center bg-gray-100"
                                >
                                    <Text className="text-gray-500">QR Code unavailable</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <Text className="text-sm font-medium text-blue-900 mb-1">
                            💡 Tip
                        </Text>
                        <Text className="text-sm text-blue-800">
                            After scanning, your authenticator app will display a 6-digit code that changes every 30 seconds. You&apos;ll need to enter one of these codes in the next step.
                        </Text>
                    </View>

                    {error && (
                        <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <Text className="text-red-800 text-sm">{error}</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        className="bg-primary-600 rounded-lg py-4 mb-3"
                        onPress={() => setCurrentStep('verify')}
                        accessible={true}
                        accessibilityLabel="Continue to verification"
                        accessibilityRole="button"
                        accessibilityHint="Proceed to enter the verification code from your authenticator app"
                    >
                        <Text className="text-center text-white font-semibold text-base">
                            I&apos;ve Scanned the Code
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-white border border-gray-300 rounded-lg py-4 mb-3"
                        onPress={() => setCurrentStep('manual')}
                        accessible={true}
                        accessibilityLabel="Enter code manually"
                        accessibilityRole="button"
                        accessibilityHint="Opens manual secret key entry screen"
                    >
                        <Text className="text-center text-gray-900 font-semibold text-base">
                            Can&apos;t Scan? Enter Manually
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="border border-gray-300 rounded-lg py-4 mb-3"
                        onPress={() => setCurrentStep('email-verify')}
                        accessible={true}
                        accessibilityLabel="Verify via email"
                        accessibilityRole="button"
                        accessibilityHint="Verify your identity via email before setup"
                    >
                        <Text className="text-center text-gray-900 font-semibold text-base">
                            Verify via Email
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="py-3"
                        onPress={() => {
                            setCurrentStep('intro');
                            setEnrollmentData(null);
                        }}
                        accessible={true}
                        accessibilityLabel="Cancel enrollment"
                        accessibilityRole="button"
                    >
                        <Text className="text-center text-gray-600 text-base">
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    };

    const renderManualStep = () => {
        if (isLoading || !enrollmentData) {
            return (
                <View className="flex-1 items-center justify-center bg-gray-50">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text className="mt-4 text-gray-600">Preparing enrollment...</Text>
                </View>
            );
        }

        return (
            <ScrollView className="flex-1 bg-gray-50">
                <View className="p-6">
                    <Text className="text-2xl font-bold text-gray-900 mb-4">
                        Manual Entry
                    </Text>

                    <Text className="text-base text-gray-700 mb-4">
                        Enter this code in your authenticator app:
                    </Text>

                    <View className="bg-white rounded-lg p-4 mb-4">
                        <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-sm font-medium text-gray-500">
                                Secret Key:
                            </Text>
                            <TouchableOpacity
                                onPress={async () => {
                                    await Clipboard.setStringAsync(enrollmentData.secret);
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    Alert.alert('Copied', 'Secret key copied to clipboard');
                                }}
                            >
                                <Text className="text-primary-600 font-medium">Copy</Text>
                            </TouchableOpacity>
                        </View>
                        <Text className="text-lg font-mono text-gray-900 bg-gray-50 p-3 rounded">
                            {enrollmentData.secret}
                        </Text>
                    </View>

                    <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <Text className="text-sm font-medium text-blue-900 mb-1">
                            💡 Tip
                        </Text>
                        <Text className="text-sm text-blue-800">
                            In your authenticator app, look for &quot;Add account&quot; or &quot;+&quot; and choose &quot;Enter a setup key&quot; or &quot;Manual entry&quot;. Then paste or type this code.
                        </Text>
                    </View>

                    {error && (
                        <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <Text className="text-red-800 text-sm">{error}</Text>
                        </View>
                    )}

                    <Text className="text-base text-gray-700 mb-2">
                        Confirm you&apos;ve added the code:
                    </Text>

                    <TextInput
                        className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base mb-4"
                        placeholder="Enter the secret key to confirm"
                        value={manualSecret}
                        onChangeText={(text) => {
                            setManualSecret(text);
                            setError(null);
                        }}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        autoFocus
                    />

                    <TouchableOpacity
                        className="bg-primary-600 rounded-lg py-4 mb-3"
                        onPress={handleManualEntry}
                        disabled={!manualSecret.trim()}
                        style={{
                            opacity: !manualSecret.trim() ? 0.5 : 1,
                        }}
                    >
                        <Text className="text-center text-white font-semibold text-base">
                            Continue
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="py-3"
                        onPress={() => setCurrentStep('scan')}
                    >
                        <Text className="text-center text-gray-600 text-base">
                            Scan QR Code Instead
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    };

    const renderVerifyStep = () => (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-6">
                <Text className="text-2xl font-bold text-gray-900 mb-4">
                    Verify Setup
                </Text>

                <Text className="text-base text-gray-700 mb-6">
                    Enter the 6-digit code from your authenticator app to verify the setup:
                </Text>

                {error && (
                    <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <Text className="text-red-800 text-sm">{error}</Text>
                    </View>
                )}

                <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-4 py-4 text-2xl text-center font-mono mb-6"
                    placeholder="000000"
                    value={verificationCode}
                    onChangeText={(text) => {
                        setVerificationCode(text.replace(/[^0-9]/g, ''));
                        setError(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                    accessible={true}
                    accessibilityLabel="Verification code input"
                    accessibilityHint="Enter the 6-digit code from your authenticator app"
                />

                <View className="bg-white rounded-lg p-4 mb-6">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                            <Text className="text-base text-gray-900 mb-1">
                                Trust This Device
                            </Text>
                            <Text className="text-xs text-gray-500">
                                Skip MFA verification for 30 days on this device
                            </Text>
                        </View>
                        <Switch
                            value={trustDevice}
                            onValueChange={setTrustDevice}
                            trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
                            accessible={true}
                            accessibilityLabel="Trust this device"
                            accessibilityRole="switch"
                            accessibilityState={{ checked: trustDevice }}
                            accessibilityHint="When enabled, you won't need to enter MFA codes on this device for 30 days"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    className="bg-primary-600 rounded-lg py-4 mb-3"
                    onPress={handleVerifyEnrollment}
                    disabled={verificationCode.length !== 6 || isLoading}
                    style={{
                        opacity: verificationCode.length !== 6 || isLoading ? 0.5 : 1,
                    }}
                    accessible={true}
                    accessibilityLabel="Verify and enable two-factor authentication"
                    accessibilityRole="button"
                    accessibilityState={{ 
                        disabled: verificationCode.length !== 6 || isLoading,
                        busy: isLoading 
                    }}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-center text-white font-semibold text-base">
                            Verify & Enable 2FA
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    className="py-3"
                    onPress={() => {
                        setCurrentStep('scan');
                        setVerificationCode('');
                        setError(null);
                    }}
                    accessible={true}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <Text className="text-center text-gray-600 text-base">
                        Back
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderBackupCodesStep = () => (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-6">
                <Text className="text-2xl font-bold text-gray-900 mb-4">
                    Save Your Backup Codes
                </Text>

                <View className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <Text className="text-sm font-medium text-amber-900 mb-1">
                        ⚠️ Important
                    </Text>
                    <Text className="text-sm text-amber-800">
                        Save these codes in a secure location. Each code can only be used once. You&apos;ll need them if you lose access to your authenticator app.
                    </Text>
                </View>

                <View 
                    className="bg-white rounded-lg p-4 mb-4"
                    accessible={true}
                    accessibilityLabel={enrollmentData?.backup_codes ? `Backup codes. ${enrollmentData.backup_codes.length} codes displayed` : 'Backup codes'}
                    accessibilityHint="Each code can only be used once. Copy or share these codes to save them securely"
                >
                    {enrollmentData?.backup_codes.map((code, index) => (
                        <View
                            key={index}
                            className={`py-2 ${index < enrollmentData.backup_codes.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                            <Text 
                                className="text-base font-mono text-gray-900"
                                accessible={true}
                                accessibilityLabel={`Backup code ${index + 1}: ${code.split('').join(' ')}`}
                            >
                                {code}
                            </Text>
                        </View>
                    ))}
                </View>

                <View className="flex-row gap-3 mb-6">
                    <TouchableOpacity
                        className="flex-1 bg-gray-100 rounded-lg py-3"
                        onPress={handleCopyBackupCodes}
                        accessible={true}
                        accessibilityLabel="Copy backup codes to clipboard"
                        accessibilityRole="button"
                        accessibilityHint="Copies all backup codes to your clipboard"
                    >
                        <Text className="text-center text-gray-900 font-medium">
                            Copy Codes
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-1 bg-gray-100 rounded-lg py-3"
                        onPress={handleShareBackupCodes}
                        accessible={true}
                        accessibilityLabel="Share backup codes"
                        accessibilityRole="button"
                        accessibilityHint="Opens share sheet to save codes to a secure location"
                    >
                        <Text className="text-center text-gray-900 font-medium">
                            Share Codes
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    className="bg-primary-600 rounded-lg py-4"
                    onPress={() => {
                        setBackupCodesViewed(true);
                        handleComplete();
                    }}
                    accessible={true}
                    accessibilityLabel="Confirm that backup codes have been saved"
                    accessibilityRole="button"
                    accessibilityHint="Completes the MFA enrollment process"
                >
                    <Text className="text-center text-white font-semibold text-base">
                        I&apos;ve Saved My Codes
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderEmailVerifyStep = () => (
        <ScrollView className="flex-1 bg-gray-50">
            <View className="p-6">
                <Text className="text-2xl font-bold text-gray-900 mb-4">
                    Email Verification
                </Text>

                <Text className="text-base text-gray-700 mb-4">
                    As an alternative to scanning the QR code, you can verify your identity via email before setting up your authenticator app.
                </Text>

                <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <Text className="text-sm font-medium text-blue-900 mb-1">
                        ℹ️ How it works
                    </Text>
                    <Text className="text-sm text-blue-800">
                        We&apos;ll send a verification code to your email. After confirming your email, you can proceed with manual setup of your authenticator app.
                    </Text>
                </View>

                <View className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <Text className="text-sm font-medium text-amber-900 mb-1">
                        ⚠️ Note
                    </Text>
                    <Text className="text-sm text-amber-800">
                        Email verification during enrollment is currently in development. For now, you can proceed directly to manual setup.
                    </Text>
                </View>

                {error && (
                    <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <Text className="text-red-800 text-sm">{error}</Text>
                    </View>
                )}

                <TouchableOpacity
                    className="bg-primary-600 rounded-lg py-4 mb-3"
                    onPress={() => {
                        // Email OTP is not yet available in the backend
                        // Users can use authenticator app (TOTP) via manual setup
                        setCurrentStep('manual');
                    }}
                    disabled={isLoading}
                    style={{ opacity: isLoading ? 0.5 : 1 }}
                    accessible={true}
                    accessibilityLabel="Continue to manual setup"
                    accessibilityRole="button"
                >
                    <Text className="text-center text-white font-semibold text-base">
                        Continue to Manual Setup
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="py-3"
                    onPress={() => setCurrentStep('scan')}
                    accessible={true}
                    accessibilityLabel="Back to QR scan"
                    accessibilityRole="button"
                >
                    <Text className="text-center text-gray-600 text-base">
                        Back to QR Scan
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    return (
        <View className="flex-1">
            {currentStep === 'intro' && renderIntroStep()}
            {currentStep === 'scan' && renderScanStep()}
            {currentStep === 'manual' && renderManualStep()}
            {currentStep === 'email-verify' && renderEmailVerifyStep()}
            {currentStep === 'verify' && renderVerifyStep()}
            {currentStep === 'backup-codes' && renderBackupCodesStep()}
        </View>
    );
}
