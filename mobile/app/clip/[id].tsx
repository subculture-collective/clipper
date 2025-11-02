/**
 * Clip detail screen
 */

import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

// Mock data for PoC
const mockClipData: Record<string, any> = {
  '1': {
    id: '1',
    title: 'Amazing Headshot',
    creator: 'shroud',
    viewCount: 15000,
    voteScore: 342,
    description: 'Insane precision headshot through smoke',
    duration: 30,
  },
  '2': {
    id: '2',
    title: 'Epic Clutch',
    creator: 'xQc',
    viewCount: 25000,
    voteScore: 789,
    description: '1v5 clutch to win the round',
    duration: 45,
  },
  '3': {
    id: '3',
    title: 'Funny Reaction',
    creator: 'pokimane',
    viewCount: 18000,
    voteScore: 456,
    description: 'Hilarious reaction to surprise attack',
    duration: 20,
  },
};

export default function ClipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: clip, isLoading } = useQuery({
    queryKey: ['clip', id],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      return mockClipData[id || '1'];
    },
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  if (!clip) {
    return (
      <View className="flex-1 items-center justify-center bg-white p-4">
        <Text className="text-xl font-bold text-gray-900 mb-2">
          Clip not found
        </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-primary-600">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Video Player Placeholder */}
      <View className="aspect-video bg-gray-900 items-center justify-center">
        <Text className="text-white text-lg">🎬 Video Player</Text>
        <Text className="text-gray-400 text-sm mt-2">{clip.duration}s</Text>
      </View>

      {/* Clip Info */}
      <View className="p-4">
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          {clip.title}
        </Text>
        
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-base text-gray-600">
            by {clip.creator}
          </Text>
          <Text className="text-sm text-gray-500">
            👁 {clip.viewCount.toLocaleString()} views
          </Text>
        </View>

        {/* Vote Buttons */}
        <View className="flex-row gap-3 mb-4">
          <TouchableOpacity className="flex-1 flex-row items-center justify-center p-3 bg-primary-50 rounded-lg">
            <Text className="text-2xl mr-2">⬆</Text>
            <Text className="font-semibold text-primary-700">
              {clip.voteScore}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 flex-row items-center justify-center p-3 bg-gray-100 rounded-lg">
            <Text className="text-2xl">⬇</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        {clip.description && (
          <View className="mb-4">
            <Text className="text-base text-gray-700 leading-6">
              {clip.description}
            </Text>
          </View>
        )}

        {/* Comments Section */}
        <View className="border-t border-gray-200 pt-4">
          <Text className="text-lg font-bold text-gray-900 mb-3">
            Comments
          </Text>
          <View className="items-center py-8">
            <Text className="text-gray-500">
              No comments yet. Be the first!
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
