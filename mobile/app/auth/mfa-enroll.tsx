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
    Platform,
    Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { BarCodeScanner, BarCodeScannerResult } from 'expo-barcode-scanner';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { startEnrollment, verifyEnrollment, type EnrollMFAResponse } from '@/services/mfa';
import { parseOTPAuthURI, validateOTPAuthData } from '@/lib/otpauth';

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
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [backupCodesViewed, setBackupCodesViewed] = useState(false);

    // Request camera permission
    useEffect(() => {
        (async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

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

    const handleBarCodeScanned = ({ type, data }: BarCodeScannerResult) => {
        if (!isScanning) return;

        setIsScanning(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Parse the otpauth:// URI
        const otpData = parseOTPAuthURI(data);
        
        if (!validateOTPAuthData(otpData)) {
            Alert.alert(
                'Invalid QR Code',
                'The scanned QR code is not a valid authenticator code. Please try again or enter the secret manually.',
                [{ text: 'OK', onPress: () => setIsScanning(true) }]
            );
            return;
        }

        // Verify the secret matches what we got from the server
        if (otpData && otpData.secret !== enrollmentData?.secret) {
            Alert.alert(
                'QR Code Mismatch',
                'The scanned QR code does not match the expected secret. Please scan the correct QR code.',
                [{ text: 'OK', onPress: () => setIsScanning(true) }]
            );
            return;
        }

        setCurrentStep('verify');
    };

    const handleManualEntry = () => {
        if (!manualSecret.trim()) {
            setError('Please enter the secret key');
            return;
        }

        // Basic validation - should be base32
        if (!/^[A-Z2-7]+=*$/i.test(manualSecret.trim())) {
            setError('Invalid secret key format. Please check and try again.');
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
            await verifyEnrollment(verificationCode);
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
                message: `Clipper MFA Backup Codes:\n\n${codesText}\n\nStore these codes securely. Each code can only be used once.`,
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
                >
                    <Text className="text-center text-white font-semibold text-base">
                        Get Started
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    className="py-3"
                    onPress={() => router.back()}
                >
                    <Text className="text-center text-gray-600 text-base">
                        Cancel
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );

    const renderScanStep = () => {
        if (hasPermission === null) {
            return (
                <View className="flex-1 items-center justify-center bg-gray-50">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text className="mt-4 text-gray-600">Requesting camera permission...</Text>
                </View>
            );
        }

        if (hasPermission === false) {
            return (
                <View className="flex-1 bg-gray-50 p-6">
                    <Text className="text-2xl font-bold text-gray-900 mb-4">
                        Camera Permission Required
                    </Text>
                    <Text className="text-base text-gray-700 mb-6">
                        We need camera permission to scan the QR code. Please enable camera access in your device settings, or use an alternative method below.
                    </Text>
                    <TouchableOpacity
                        className="bg-primary-600 rounded-lg py-4 mb-3"
                        onPress={() => setCurrentStep('manual')}
                    >
                        <Text className="text-center text-white font-semibold text-base">
                            Enter Code Manually
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="border border-gray-300 rounded-lg py-4 mb-3"
                        onPress={() => setCurrentStep('email-verify')}
                    >
                        <Text className="text-center text-gray-900 font-semibold text-base">
                            Verify via Email
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        className="py-3"
                        onPress={() => router.back()}
                    >
                        <Text className="text-center text-gray-600 text-base">
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        }

        if (isLoading || !enrollmentData) {
            return (
                <View className="flex-1 items-center justify-center bg-gray-50">
                    <ActivityIndicator size="large" color="#2563eb" />
                    <Text className="mt-4 text-gray-600">Preparing QR code...</Text>
                </View>
            );
        }

        return (
            <View className="flex-1 bg-black">
                <View className="flex-1">
                    {Platform.OS === 'web' ? (
                        <View className="flex-1 items-center justify-center bg-gray-900">
                            <Text className="text-white text-center mb-4">
                                QR scanning is not available on web.
                            </Text>
                            <TouchableOpacity
                                className="bg-primary-600 rounded-lg py-3 px-6"
                                onPress={() => setCurrentStep('manual')}
                            >
                                <Text className="text-center text-white font-semibold">
                                    Enter Code Manually
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <BarCodeScanner
                            onBarCodeScanned={isScanning ? handleBarCodeScanned : undefined}
                            style={{ flex: 1 }}
                            barCodeTypes={[BarCodeScanner.Constants.BarCodeType.qr]}
                        />
                    )}
                </View>

                <View className="absolute top-0 left-0 right-0 bg-black/70 p-6 pt-12">
                    <Text className="text-white text-xl font-bold mb-2">
                        Scan QR Code
                    </Text>
                    <Text className="text-white/90 text-sm">
                        Open your authenticator app and scan this QR code
                    </Text>
                </View>

                <View className="absolute bottom-0 left-0 right-0 bg-black/70 p-6">
                    <TouchableOpacity
                        className="bg-white rounded-lg py-4 mb-3"
                        onPress={() => {
                            setIsScanning(!isScanning);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }}
                        disabled={Platform.OS === 'web'}
                    >
                        <Text className="text-center text-gray-900 font-semibold text-base">
                            {isScanning ? 'Pause Scanner' : 'Start Scanner'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="bg-primary-600 rounded-lg py-4 mb-3"
                        onPress={() => setCurrentStep('manual')}
                    >
                        <Text className="text-center text-white font-semibold text-base">
                            Enter Code Manually
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="border border-white rounded-lg py-4 mb-3"
                        onPress={() => setCurrentStep('email-verify')}
                    >
                        <Text className="text-center text-white font-semibold text-base">
                            Verify via Email
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="py-3"
                        onPress={() => {
                            setCurrentStep('intro');
                            setEnrollmentData(null);
                        }}
                    >
                        <Text className="text-center text-white text-base">
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
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

                <View className="bg-white rounded-lg p-4 mb-4">
                    {enrollmentData?.backup_codes.map((code, index) => (
                        <View
                            key={index}
                            className={`py-2 ${index < enrollmentData.backup_codes.length - 1 ? 'border-b border-gray-100' : ''}`}
                        >
                            <Text className="text-base font-mono text-gray-900">
                                {code}
                            </Text>
                        </View>
                    ))}
                </View>

                <View className="flex-row gap-3 mb-6">
                    <TouchableOpacity
                        className="flex-1 bg-gray-100 rounded-lg py-3"
                        onPress={handleCopyBackupCodes}
                    >
                        <Text className="text-center text-gray-900 font-medium">
                            Copy Codes
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        className="flex-1 bg-gray-100 rounded-lg py-3"
                        onPress={handleShareBackupCodes}
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

                <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <Text className="text-sm font-medium text-blue-900 mb-1">
                        ℹ️ How it works
                    </Text>
                    <Text className="text-sm text-blue-800">
                        We&apos;ll send a verification code to your email. After confirming your email, you can proceed with manual setup of your authenticator app.
                    </Text>
                </View>

                {error && (
                    <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <Text className="text-red-800 text-sm">{error}</Text>
                    </View>
                )}

                <TouchableOpacity
                    className="bg-primary-600 rounded-lg py-4 mb-3"
                    onPress={async () => {
                        try {
                            setIsLoading(true);
                            // In a real implementation, this would call an API to send email OTP
                            // For now, we'll skip to manual entry
                            Alert.alert(
                                'Email Sent',
                                'A verification code has been sent to your email. For this demo, you can proceed directly to manual setup.',
                                [
                                    {
                                        text: 'Continue to Manual Setup',
                                        onPress: () => setCurrentStep('manual'),
                                    },
                                ]
                            );
                        } catch (err: any) {
                            setError(err.message || 'Failed to send email');
                        } finally {
                            setIsLoading(false);
                        }
                    }}
                    disabled={isLoading}
                    style={{ opacity: isLoading ? 0.5 : 1 }}
                >
                    {isLoading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text className="text-center text-white font-semibold text-base">
                            Send Verification Email
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    className="py-3"
                    onPress={() => setCurrentStep('scan')}
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
