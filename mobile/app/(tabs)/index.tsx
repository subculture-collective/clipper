/**
 * Home/Feed screen - displays list of clips
 */

import { View, FlatList, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import ClipListItemCard from '@/components/ClipListItemCard';
import { listClips } from '@/services/clips';

export default function FeedScreen() {
    const router = useRouter();

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['clips', { sort: 'hot', limit: 10 }],
        queryFn: () => listClips({ sort: 'hot', limit: 10 }),
    });

    const handleClipPress = (id: string) => {
        router.push(`/clip/${id}`);
    };

    if (isLoading) {
        return (
            <View className='flex-1 items-center justify-center bg-white'>
                <ActivityIndicator size='large' color='#0ea5e9' />
            </View>
        );
    }

    if (isError) {
        return (
            <View className='flex-1 items-center justify-center bg-white p-6'>
                <Text className='text-gray-800 font-medium mb-2'>
                    Could not load clips
                </Text>
                <Text className='text-gray-500 mb-4 text-center'>
                    Check your API URL or network connection.
                </Text>
                <Text className='text-primary-600' onPress={() => refetch()}>
                    Tap to retry
                </Text>
            </View>
        );
    }

    return (
        <View className='flex-1 bg-gray-100'>
            <FlatList
                data={data?.data ?? []}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <ClipListItemCard
                        clip={item}
                        onPress={() => handleClipPress(item.id)}
                    />
                )}
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}
