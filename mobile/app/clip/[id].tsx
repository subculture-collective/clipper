/**
 * Clip detail screen
 */

import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getClip } from '../../services/clips';
import EnhancedVideoPlayer from '../../components/EnhancedVideoPlayer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_WIDTH * (9 / 16);

export default function ClipDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();

    const { data: clip, isLoading } = useQuery({
        queryKey: ['clip', id],
        queryFn: () => getClip(String(id)),
        enabled: !!id,
    });

    if (isLoading) {
        return (
            <View className='flex-1 items-center justify-center bg-white'>
                <ActivityIndicator size='large' color='#0ea5e9' />
            </View>
        );
    }

    if (!clip) {
        return (
            <View className='flex-1 items-center justify-center bg-white p-4'>
                <Text className='text-xl font-bold text-gray-900 mb-2'>
                    Clip not found
                </Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text className='text-primary-600'>Go back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView className='flex-1 bg-white'>
            {/* Video Player */}
            <View
                style={{
                    width: '100%',
                    height: VIDEO_HEIGHT,
                    backgroundColor: '#111827',
                }}
            >
                <EnhancedVideoPlayer
                    videoUrl={clip.embed_url || ''}
                    videoId={clip.id}
                    videoTitle={clip.title}
                    allowsPictureInPicture={true}
                    allowsBackgroundPlayback={false}
                    contentFit='contain'
                    autoPlay={true}
                    style={{ width: '100%', height: '100%' }}
                />
            </View>

            {/* Clip Info */}
            <View className='p-4'>
                <Text className='text-2xl font-bold text-gray-900 mb-2'>
                    {clip.title}
                </Text>

                <View className='flex-row items-center justify-between mb-4'>
                    <Text className='text-base text-gray-600'>
                        by {clip.creator_name || clip.broadcaster_name}
                    </Text>
                    <Text className='text-sm text-gray-500'>
                        👁 {clip.view_count?.toLocaleString?.() || 0} views
                    </Text>
                </View>

                {/* Vote Buttons */}
                <View className='flex-row gap-3 mb-4'>
                    <TouchableOpacity className='flex-1 flex-row items-center justify-center p-3 bg-primary-50 rounded-lg'>
                        <Text className='text-2xl mr-2'>⬆</Text>
                        <Text className='font-semibold text-primary-700'>
                            {clip.vote_score}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity className='flex-1 flex-row items-center justify-center p-3 bg-gray-100 rounded-lg'>
                        <Text className='text-2xl'>⬇</Text>
                    </TouchableOpacity>
                </View>

                {/* Description */}
                {false && (
                    <View className='mb-4'>
                        <Text className='text-base text-gray-700 leading-6'>
                            {/* TODO: add description if available */}
                        </Text>
                    </View>
                )}

                {/* Comments Section */}
                <View className='border-t border-gray-200 pt-4'>
                    <Text className='text-lg font-bold text-gray-900 mb-3'>
                        Comments
                    </Text>
                    <View className='items-center py-8'>
                        <Text className='text-gray-500'>
                            No comments yet. Be the first!
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}
