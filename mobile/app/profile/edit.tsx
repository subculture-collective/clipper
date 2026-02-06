/**
 * Edit Profile screen
 */

import { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { updateProfile } from '@/services/users';
import { getCurrentUser } from '@/services/auth';
import { trackEvent, SettingsEvents } from '@/lib/analytics';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, setUser } = useAuth();
    const [displayName, setDisplayName] = useState(user?.display_name || '');
    const [bio, setBio] = useState(user?.bio || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!displayName.trim()) {
            Alert.alert('Error', 'Display name is required');
            return;
        }

        if (displayName.length > 100) {
            Alert.alert('Error', 'Display name must be 100 characters or less');
            return;
        }

        if (bio.length > 500) {
            Alert.alert('Error', 'Bio must be 500 characters or less');
            return;
        }

        setIsLoading(true);
        try {
            await updateProfile({
                display_name: displayName.trim(),
                bio: bio.trim() || undefined,
            });

            trackEvent(SettingsEvents.PROFILE_EDITED, {
                has_bio: !!bio.trim(),
                display_name_changed: displayName.trim() !== user?.display_name,
            });

            // Refresh user data
            try {
                const updatedUser = await getCurrentUser();
                setUser(updatedUser);
                Alert.alert('Success', 'Profile updated successfully', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } catch (refreshError) {
                console.error('Profile updated, but failed to refresh user data:', refreshError);
                Alert.alert(
                    'Profile Updated',
                    'Your profile was updated, but we could not refresh your data. Please reload the app to see the latest information.',
                    [{ text: 'OK', onPress: () => router.back() }]
                );
            }
        } catch (error) {
            console.error('Failed to update profile:', error);
            Alert.alert(
                'Error',
                'Failed to update profile. Please try again.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-white"
        >
            <ScrollView className="flex-1">
                <View className="p-4">
                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Display Name *
                        </Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Enter your display name"
                            maxLength={100}
                            editable={!isLoading}
                        />
                        <Text className="text-xs text-gray-500 mt-1">
                            {displayName.length}/100 characters
                        </Text>
                    </View>

                    <View className="mb-6">
                        <Text className="text-sm font-semibold text-gray-700 mb-2">
                            Bio
                        </Text>
                        <TextInput
                            className="border border-gray-300 rounded-lg px-4 py-3 text-base text-gray-900"
                            value={bio}
                            onChangeText={setBio}
                            placeholder="Tell us about yourself"
                            multiline
                            numberOfLines={4}
                            maxLength={500}
                            textAlignVertical="top"
                            editable={!isLoading}
                        />
                        <Text className="text-xs text-gray-500 mt-1">
                            {bio.length}/500 characters
                        </Text>
                    </View>

                    <View className="flex-row gap-3">
                        <TouchableOpacity
                            className="flex-1 bg-gray-200 rounded-lg py-3"
                            onPress={() => router.back()}
                            disabled={isLoading}
                        >
                            <Text className="text-gray-900 text-center font-semibold">
                                Cancel
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            className="flex-1 bg-primary-500 rounded-lg py-3"
                            onPress={handleSave}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text className="text-white text-center font-semibold">
                                    Save Changes
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}
