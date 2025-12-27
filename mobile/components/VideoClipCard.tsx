/**
 * Video Clip Card Component
 * Displays a video clip with thumbnail, metadata, and playback controls
 */

import { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Pressable,
    Dimensions,
} from 'react-native';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

interface VideoClipCardProps {
    id: string;
    title: string;
    creator: string;
    viewCount: number;
    voteScore: number;
    videoUrl?: string;
    thumbnailUrl?: string;
    onPress: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_HEIGHT = SCREEN_WIDTH * 0.5625; // 16:9 aspect ratio

export default function VideoClipCard({
    id,
    title,
    creator,
    viewCount,
    voteScore,
    videoUrl,
    thumbnailUrl,
    onPress,
}: VideoClipCardProps) {
    const player = useVideoPlayer(videoUrl ?? '', player => {
        // Configure player
        player.loop = true;
        // Do not autoplay; user taps to play
    });
    const { isPlaying } = useEvent(player, 'playingChange', {
        isPlaying: player.playing,
    });

    const [showControls] = useState(true);

    const togglePlayback = () => {
        if (player.playing) {
            player.pause();
        } else {
            player.play();
        }
    };

    return (
        <View className='bg-white mb-3 shadow-sm'>
            {/* Video Player */}
            <Pressable
                onPress={togglePlayback}
                className='relative'
                style={{ height: VIDEO_HEIGHT }}
            >
                {videoUrl ?
                    <>
                        {/* Show thumbnail when not playing */}
                        {!isPlaying && thumbnailUrl && (
                            <Image
                                source={{ uri: thumbnailUrl }}
                                style={{ width: '100%', height: '100%', position: 'absolute' }}
                                contentFit='cover'
                                cachePolicy='memory-disk'
                                priority='high'
                                transition={200}
                            />
                        )}
                        {/* Only render VideoView when playing or when no thumbnail available */}
                        {(isPlaying || !thumbnailUrl) && (
                            <VideoView
                                player={player}
                                style={{ width: '100%', height: '100%' }}
                                contentFit='cover'
                                allowsPictureInPicture
                            />
                        )}
                    </>
                :   thumbnailUrl ?
                    <Image
                        source={{ uri: thumbnailUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit='cover'
                        cachePolicy='memory-disk'
                        priority='normal'
                        transition={200}
                    />
                :   <View className='w-full h-full bg-gray-200 items-center justify-center'>
                        <Ionicons
                            name='videocam-outline'
                            size={32}
                            color='#6b7280'
                        />
                    </View>
                }

                {/* Play/Pause Overlay */}
                {showControls && videoUrl && (
                    <View className='absolute inset-0 items-center justify-center bg-black/20'>
                        <View className='bg-black/60 rounded-full p-4'>
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={40}
                                color='white'
                            />
                        </View>
                    </View>
                )}

                {/* View Count Badge */}
                <View className='absolute top-3 right-3 bg-black/70 px-2 py-1 rounded flex-row items-center gap-1'>
                    <Ionicons name='eye-outline' size={14} color='white' />
                    <Text className='text-white text-xs font-medium'>
                        {viewCount >= 1000 ?
                            `${(viewCount / 1000).toFixed(1)}K`
                        :   viewCount}
                    </Text>
                </View>
            </Pressable>

            {/* Metadata Section */}
            <TouchableOpacity
                onPress={onPress}
                className='p-4'
                activeOpacity={0.7}
            >
                <Text className='text-lg font-bold text-gray-900 mb-2'>
                    {title}
                </Text>

                <View className='flex-row items-center justify-between'>
                    <View className='flex-row items-center gap-2'>
                        <View className='w-8 h-8 rounded-full bg-primary-100 items-center justify-center'>
                            <Text className='text-primary-700 font-semibold text-sm'>
                                {creator.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text className='text-sm text-gray-600 font-medium'>
                            {creator}
                        </Text>
                    </View>

                    {/* Vote Score */}
                    <View className='flex-row items-center gap-1 bg-primary-50 px-3 py-1.5 rounded-full'>
                        <Ionicons name='arrow-up' size={16} color='#0284c7' />
                        <Text className='text-primary-700 font-bold text-sm'>
                            {voteScore >= 1000 ?
                                `${(voteScore / 1000).toFixed(1)}K`
                            :   voteScore}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        </View>
    );
}
