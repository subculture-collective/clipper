/**
 * MFA Challenge screen - Handles TOTP, Email OTP, and Backup Code verification
 */

import { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { verifyMFALogin } from '@/services/mfa';
import { getCurrentUser } from '@/services/auth';
import { checkBiometricCapability, authenticateWithBiometrics, getBiometricTypeLabel } from '@/lib/biometric';

type ChallengeMode = 'totp' | 'email' | 'backup';

export default function MFAChallengeScreen() {
    const router = useRouter();
    const { setUser } = useAuth();
    const params = useLocalSearchParams<{ mode?: string }>();

    const [mode, setMode] = useState<ChallengeMode>(
        (params.mode as ChallengeMode) || 'totp'
    );
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [trustDevice, setTrustDevice] = useState(false);
    const [timer, setTimer] = useState(30);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [biometricAvailable, setBiometricAvailable] = useState(false);
    const [biometricType, setBiometricType] = useState<string>('Biometric');
    const [error, setError] = useState<string | null>(null);

    // Check biometric availability on mount
    useEffect(() => {
        checkBiometricSupport();
    }, []);

    // TOTP timer countdown
    useEffect(() => {
        if (mode === 'totp') {
            const interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) return 30;
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [mode]);

    // Resend cooldown timer
    useEffect(() => {
        if (resendCooldown > 0) {
            const timeout = setTimeout(() => {
                setResendCooldown(prev => prev - 1);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [resendCooldown]);

    const checkBiometricSupport = async () => {
        try {
            const capability = await checkBiometricCapability();
            setBiometricAvailable(capability.available && capability.enrolled);
            if (capability.biometricType) {
                setBiometricType(getBiometricTypeLabel(capability.biometricType));
            }
        } catch (error) {
            console.error('Error checking biometric support:', error);
            setBiometricAvailable(false);
        }
    };

    const handleBiometricAuth = async () => {
        try {
            const success = await authenticateWithBiometrics(
                'Authenticate to access your MFA code',
                'Use passcode'
            );

            if (success) {
                // Biometric auth is only a convenience gate
                // User still needs to enter TOTP or it can auto-fill if stored
                Alert.alert(
                    'Biometric Verified',
                    'Please enter your MFA code to continue'
                );
            }
        } catch (error) {
            console.error('Biometric auth error:', error);
            Alert.alert('Error', 'Biometric authentication failed');
        }
    };

    const handleVerifyCode = async () => {
        if (!code.trim()) {
            setError('Please enter a code');
            return;
        }

        // Validate code format based on mode
        if (mode === 'totp' && code.length !== 6) {
            setError('TOTP code must be 6 digits');
            return;
        }

        if (mode === 'backup' && code.length !== 8) {
            setError('Backup code must be 8 characters');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Verify MFA code with backend
            await verifyMFALogin(code, trustDevice);

            // Get current user info after successful MFA verification
            const user = await getCurrentUser();
            setUser(user);

            // Navigate to main app
            router.replace('/(tabs)');
        } catch (err) {
            console.error('MFA verification error:', err);

            if (err instanceof Error) {
                const message = err.message.toLowerCase();

                // Handle specific error types
                if (message.includes('invalid')) {
                    setError('Invalid code. Please try again.');
                } else if (message.includes('expired')) {
                    setError('Code has expired. Please generate a new one.');
                } else if (message.includes('too many')) {
                    setError(
                        'Too many failed attempts. Your account has been temporarily locked.'
                    );
                } else if (message.includes('rate limit')) {
                    setError('Too many attempts. Please wait before trying again.');
                } else {
                    setError(
                        err.message || 'Verification failed. Please try again.'
                    );
                }
            } else {
                setError('Verification failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendEmail = async () => {
        if (resendCooldown > 0) return;

        setResendCooldown(60); // 60 second cooldown
        Alert.alert('Email Sent', 'A new verification code has been sent to your email.');
    };

    const handleSwitchMode = (newMode: ChallengeMode) => {
        setMode(newMode);
        setCode('');
        setError(null);
    };

    const handleCancel = () => {
        Alert.alert(
            'Cancel Verification',
            'Are you sure you want to cancel? You will be logged out.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes',
                    style: 'destructive',
                    onPress: () => router.replace('/auth/login'),
                },
            ]
        );
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <ScrollView
                contentContainerClassName="flex-grow justify-center p-6"
                keyboardShouldPersistTaps="handled"
            >
                <View className="max-w-md w-full mx-auto">
                    {/* Header */}
                    <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">
                        Two-Factor Authentication
                    </Text>
                    <Text className="text-base text-gray-600 mb-8 text-center">
                        {mode === 'totp' &&
                            'Enter the 6-digit code from your authenticator app'}
                        {mode === 'email' &&
                            'Enter the code sent to your email address'}
                        {mode === 'backup' && 'Enter one of your backup codes'}
                    </Text>

                    {/* Mode Tabs */}
                    <View className="flex-row mb-6 bg-gray-100 rounded-lg p-1">
                        <TouchableOpacity
                            className={`flex-1 py-2 px-3 rounded-md ${
                                mode === 'totp' ? 'bg-white shadow-sm' : ''
                            }`}
                            onPress={() => handleSwitchMode('totp')}
                        >
                            <Text
                                className={`text-center text-sm font-medium ${
                                    mode === 'totp'
                                        ? 'text-primary-600'
                                        : 'text-gray-600'
                                }`}
                            >
                                Authenticator
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 py-2 px-3 rounded-md ${
                                mode === 'email' ? 'bg-white shadow-sm' : ''
                            }`}
                            onPress={() => handleSwitchMode('email')}
                        >
                            <Text
                                className={`text-center text-sm font-medium ${
                                    mode === 'email'
                                        ? 'text-primary-600'
                                        : 'text-gray-600'
                                }`}
                            >
                                Email
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className={`flex-1 py-2 px-3 rounded-md ${
                                mode === 'backup' ? 'bg-white shadow-sm' : ''
                            }`}
                            onPress={() => handleSwitchMode('backup')}
                        >
                            <Text
                                className={`text-center text-sm font-medium ${
                                    mode === 'backup'
                                        ? 'text-primary-600'
                                        : 'text-gray-600'
                                }`}
                            >
                                Backup Code
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* TOTP Timer */}
                    {mode === 'totp' && (
                        <View className="mb-4 items-center">
                            <Text className="text-sm text-gray-600">
                                Code refreshes in: {timer}s
                            </Text>
                        </View>
                    )}

                    {/* Code Input */}
                    <View className="mb-4">
                        <TextInput
                            className="w-full p-4 border border-gray-300 rounded-lg text-lg text-center tracking-wider bg-white"
                            placeholder={
                                mode === 'backup' ? '••••••••' : '000000'
                            }
                            value={code}
                            onChangeText={text => {
                                setCode(text);
                                setError(null);
                            }}
                            keyboardType={
                                mode === 'backup' ? 'default' : 'number-pad'
                            }
                            maxLength={mode === 'backup' ? 8 : 6}
                            autoComplete="one-time-code"
                            textContentType="oneTimeCode"
                            autoFocus
                            secureTextEntry={mode === 'backup'}
                            editable={!isLoading}
                        />
                    </View>

                    {/* Error Message */}
                    {error && (
                        <View className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <Text className="text-red-800 text-sm">{error}</Text>
                        </View>
                    )}

                    {/* Biometric Auth Button */}
                    {biometricAvailable && mode === 'totp' && (
                        <TouchableOpacity
                            className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                            onPress={handleBiometricAuth}
                            disabled={isLoading}
                        >
                            <Text className="text-center text-primary-600 font-medium">
                                🔐 Use {biometricType}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Email Resend Button */}
                    {mode === 'email' && (
                        <TouchableOpacity
                            className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                            onPress={handleResendEmail}
                            disabled={resendCooldown > 0 || isLoading}
                        >
                            <Text
                                className={`text-center font-medium ${
                                    resendCooldown > 0
                                        ? 'text-gray-400'
                                        : 'text-primary-600'
                                }`}
                            >
                                {resendCooldown > 0
                                    ? `Resend in ${resendCooldown}s`
                                    : 'Resend Code'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Trust Device Toggle */}
                    <View className="mb-6 flex-row items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <View className="flex-1 mr-3">
                            <Text className="text-sm font-medium text-gray-900 mb-1">
                                Remember this device
                            </Text>
                            <Text className="text-xs text-gray-600">
                                Skip MFA for 30 days on this device
                            </Text>
                        </View>
                        <Switch
                            value={trustDevice}
                            onValueChange={setTrustDevice}
                            disabled={isLoading}
                        />
                    </View>

                    {/* Verify Button */}
                    <TouchableOpacity
                        className={`w-full p-4 rounded-lg mb-3 ${
                            isLoading || !code.trim()
                                ? 'bg-gray-300'
                                : 'bg-primary-600'
                        }`}
                        onPress={handleVerifyCode}
                        disabled={isLoading || !code.trim()}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <Text className="text-white text-center font-semibold text-base">
                                Verify Code
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Cancel Button */}
                    <TouchableOpacity
                        onPress={handleCancel}
                        disabled={isLoading}
                        className="py-2"
                    >
                        <Text className="text-center text-gray-600">Cancel</Text>
                    </TouchableOpacity>

                    {/* Help Text */}
                    <View className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <Text className="text-sm text-blue-900 mb-2 font-medium">
                            Having trouble?
                        </Text>
                        <Text className="text-xs text-blue-800">
                            {mode === 'totp' &&
                                'Make sure your device time is synchronized. If you lost access to your authenticator app, use a backup code.'}
                            {mode === 'email' &&
                                "Check your spam folder if you don't see the email. The code expires in 10 minutes."}
                            {mode === 'backup' &&
                                'Each backup code can only be used once. Make sure to save your remaining codes in a secure location.'}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
