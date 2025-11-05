/**
 * Profile screen - user profile and settings
 */

import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { logoutUser } from '@/services/auth';

export default function ProfileScreen() {
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                    setIsLoggingOut(true);
                    try {
                        await logoutUser();
                        await logout();
                    } catch (error) {
                        console.error('Logout error:', error);
                        // Still clear local auth even if server call fails
                        await logout();
                    } finally {
                        setIsLoggingOut(false);
                    }
                },
            },
        ]);
    };

    return (
        <View className="flex-1 bg-white">
            <View className="items-center p-6 border-b border-gray-200">
                {isAuthenticated && user ? (
                    <>
                        {user.profile_image_url ? (
                            <Image
                                source={{ uri: user.profile_image_url }}
                                className="w-20 h-20 rounded-full mb-3"
                            />
                        ) : (
                            <View className="w-20 h-20 rounded-full bg-primary-500 items-center justify-center mb-3">
                                <Text className="text-3xl text-white">
                                    {user.display_name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        <Text className="text-xl font-bold text-gray-900">
                            {user.display_name}
                        </Text>
                        <Text className="text-sm text-gray-500">
                            @{user.username}
                        </Text>
                        {user.reputation_score > 0 && (
                            <Text className="text-xs text-primary-600 mt-1">
                                Reputation: {user.reputation_score}
                            </Text>
                        )}
                    </>
                ) : (
                    <>
                        <View className="w-20 h-20 rounded-full bg-primary-500 items-center justify-center mb-3">
                            <Text className="text-3xl text-white">👤</Text>
                        </View>
                        <Text className="text-xl font-bold text-gray-900">
                            Guest User
                        </Text>
                        <Text className="text-sm text-gray-500">
                            Not logged in
                        </Text>
                    </>
                )}
            </View>

            <View className="p-4">
                {isAuthenticated ? (
                    <>
                        <TouchableOpacity
                            className="p-4 bg-gray-100 rounded-lg mb-3"
                            onPress={() => router.push('/settings')}
                            disabled={isLoggingOut}
                        >
                            <Text className="text-gray-900 text-center font-semibold text-base">
                                Settings
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            className="p-4 bg-red-500 rounded-lg"
                            onPress={handleLogout}
                            disabled={isLoggingOut}
                        >
                            {isLoggingOut ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white text-center font-semibold text-base">
                                    Logout
                                </Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity
                            className="p-4 bg-primary-500 rounded-lg mb-3"
                            onPress={() => router.push('/auth/login')}
                        >
                            <Text className="text-white text-center font-semibold text-base">
                                Login with Twitch
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="p-4 bg-gray-100 rounded-lg"
                            onPress={() => router.push('/settings')}
                        >
                            <Text className="text-gray-900 text-center font-semibold text-base">
                                Settings
                            </Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
}
