/**
 * Home/Feed screen - displays list of clips
 */

import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { FlashList } from '@shopify/flash-list';
import ClipListItemCard from '../../components/ClipListItemCard';
import { listClips, batchGetClipMedia, ClipMediaInfo } from '../../services/clips';
import { useMemo, useEffect, useRef } from 'react';
import { trackFeedInitialRender, trackFeedMemory } from '../../lib/performance';

export default function FeedScreen() {
    const router = useRouter();
    const renderTrackerRef = useRef<ReturnType<typeof trackFeedInitialRender> | null>(null);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['clips', { sort: 'hot', limit: 10 }],
        queryFn: () => listClips({ sort: 'hot', limit: 10 }),
    });

    // Batch fetch media URLs for all clips
    const clipIds = useMemo(() => data?.data.map(clip => clip.id) ?? [], [data?.data]);
    
    const { data: mediaData } = useQuery({
        queryKey: ['clips-media', clipIds],
        queryFn: () => batchGetClipMedia(clipIds),
        enabled: clipIds.length > 0,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    });

    // Create a map for quick lookup of media URLs
    const mediaMap = useMemo(() => {
        const map = new Map<string, ClipMediaInfo>();
        mediaData?.forEach(media => map.set(media.id, media));
        return map;
    }, [mediaData]);

    // Track feed initial render time
    useEffect(() => {
        if (!isLoading && data?.data && !renderTrackerRef.current) {
            renderTrackerRef.current = trackFeedInitialRender();
        }
    }, [isLoading, data?.data]);

    // Finish tracking when media is loaded
    useEffect(() => {
        if (renderTrackerRef.current && mediaData && data?.data) {
            renderTrackerRef.current.finish(data.data.length);
            renderTrackerRef.current = null;
        }
    }, [mediaData, data?.data]);

    // Track memory for long sessions
    useEffect(() => {
        trackFeedMemory('start');
        return () => {
            trackFeedMemory('end');
        };
    }, []);

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
            {/* @ts-ignore - FlashList type definitions may not match perfectly */}
            <FlashList
                data={data?.data ?? []}
                estimatedItemSize={300}
                renderItem={({ item }) => {
                    const media = mediaMap.get(item.id);
                    return (
                        <ClipListItemCard
                            clip={item}
                            videoUrl={media?.embed_url}
                            thumbnailUrl={media?.thumbnail_url}
                            onPress={() => handleClipPress(item.id)}
                        />
                    );
                }}
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 16 }}
            />
        </View>
    );
}
