/**
 * User profile detail screen
 * Shows profile information for a specific user
 */

import {
    View,
    Text,
    ScrollView,
    ActivityIndicator,
    Image,
    TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// TODO: Import actual user API service
// import { getUser } from '@/services/users';

interface User {
    id: string;
    username: string;
    display_name: string;
    profile_image_url?: string;
    reputation_score?: number;
    bio?: string;
}

// Placeholder function - replace with actual API call
async function getUser(id: string): Promise<User> {
    // This should be replaced with actual API call
    return {
        id,
        username: `user_${id}`,
        display_name: `User ${id}`,
        reputation_score: 100,
    };
}

export default function UserProfileScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const primaryColor = Colors[colorScheme ?? 'light'].primary;

    const { data: user, isLoading } = useQuery({
        queryKey: ['user', id],
        queryFn: () => getUser(String(id)),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <View className='flex-1 items-center justify-center bg-white'>
                <ActivityIndicator size='large' color={primaryColor} />
            </View>
        );
    }

    if (!user) {
        return (
            <View className='flex-1 items-center justify-center bg-white p-4'>
                <Text className='text-xl font-bold text-gray-900 mb-2'>
                    User not found
                </Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className='text-primary-600'>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView className='flex-1 bg-white'>
            <View className='items-center p-6 border-b border-gray-200'>
                {user.profile_image_url ? (
                    <Image
                        source={{ uri: user.profile_image_url }}
                        className='w-24 h-24 rounded-full mb-3'
                    />
                ) : (
                    <View className='w-24 h-24 rounded-full bg-primary-500 items-center justify-center mb-3'>
                        <Text className='text-4xl text-white'>
                            {user.display_name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                <Text className='text-2xl font-bold text-gray-900'>
                    {user.display_name}
                </Text>
                <Text className='text-base text-gray-500 mb-2'>
                    @{user.username}
                </Text>
                {user.reputation_score && user.reputation_score > 0 && (
                    <View className='bg-primary-50 px-3 py-1 rounded-full'>
                        <Text className='text-sm text-primary-700 font-semibold'>
                            ⭐ {user.reputation_score} reputation
                        </Text>
                    </View>
                )}
            </View>

            {user.bio && (
                <View className='p-4 border-b border-gray-200'>
                    <Text className='text-base text-gray-700'>{user.bio}</Text>
                </View>
            )}

            <View className='p-4'>
                <Text className='text-lg font-bold text-gray-900 mb-3'>
                    Activity
                </Text>
                <View className='items-center py-8'>
                    <Text className='text-gray-500'>
                        User activity coming soon
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}
