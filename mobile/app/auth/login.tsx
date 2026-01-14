/**
 * Login screen
 */

import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import {
    initiateOAuthFlow,
    exchangeCodeForTokens,
    getCurrentUser,
} from '../../services/auth';
import { getMFAStatus } from '../../services/mfa';

export default function LoginScreen() {
    const router = useRouter();
    const { setUser } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async () => {
        setIsLoading(true);
        try {
            // Step 1: Initiate OAuth flow and get authorization code
            const { code, state, codeVerifier } = await initiateOAuthFlow();

            // Step 2: Exchange code for tokens via backend
            await exchangeCodeForTokens(code, state, codeVerifier);

            // Step 3: Check if MFA is required
            try {
                const mfaStatus = await getMFAStatus();
                
                if (mfaStatus.enabled) {
                    // MFA is enabled, navigate to challenge screen
                    router.replace('/auth/mfa-challenge');
                    return;
                }
                
                // If MFA is required but not enabled (admin/moderator in grace period),
                // the backend will enforce this on protected endpoints
            } catch (mfaError) {
                // Log the error for debugging
                console.error('Failed to check MFA status:', mfaError);
                
                // If MFA check fails and the error suggests MFA is required,
                // navigate to challenge screen to be safe
                if (mfaError instanceof Error) {
                    const errorMsg = mfaError.message.toLowerCase();
                    if (errorMsg.includes('mfa') || errorMsg.includes('authentication required')) {
                        console.warn('MFA may be required, navigating to challenge screen');
                        router.replace('/auth/mfa-challenge');
                        return;
                    }
                }
                
                // For other errors (network issues, etc.), log but continue
                // The backend will enforce MFA on protected endpoints if needed
                console.warn('Could not verify MFA status, continuing with login');
            }

            // Step 4: Get user info (tokens are now in cookies managed by backend)
            const user = await getCurrentUser();
            setUser(user);

            // Step 5: Navigate to the main app
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert(
                'Login Failed',
                error instanceof Error
                    ? error.message
                    : 'Failed to login. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-white items-center justify-center p-6">
            <Text className="text-4xl mb-2">🎬</Text>
            <Text className="text-3xl font-bold text-gray-900 mb-2">
                Welcome to clpr
            </Text>
            <Text className="text-base text-gray-600 text-center mb-8">
                Discover and share the best Twitch clips
            </Text>

            <TouchableOpacity
                className="w-full p-4 bg-purple-600 rounded-lg mb-3"
                onPress={handleLogin}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text className="text-white text-center font-semibold text-base">
                        Login with Twitch
                    </Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.back()} disabled={isLoading}>
                <Text className="text-primary-600">Continue as guest</Text>
            </TouchableOpacity>
        </View>
    );
}
