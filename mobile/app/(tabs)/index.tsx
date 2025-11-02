/**
 * Home/Feed screen - displays list of clips
 */

import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

// Mock data for PoC
const mockClips = [
  {
    id: '1',
    title: 'Amazing Headshot',
    creator: 'shroud',
    viewCount: 15000,
    voteScore: 342,
  },
  {
    id: '2',
    title: 'Epic Clutch',
    creator: 'xQc',
    viewCount: 25000,
    voteScore: 789,
  },
  {
    id: '3',
    title: 'Funny Reaction',
    creator: 'pokimane',
    viewCount: 18000,
    voteScore: 456,
  },
];

export default function FeedScreen() {
  const router = useRouter();

  // This will use real API in production
  const { data: clips, isLoading } = useQuery({
    queryKey: ['clips'],
    queryFn: async () => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return mockClips;
    },
  });

  const handleClipPress = (id: string) => {
    router.push(`/clip/${id}`);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={clips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleClipPress(item.id)}
            className="bg-white p-4 mb-2 border-b border-gray-200"
          >
            <Text className="text-lg font-bold text-gray-900 mb-1">
              {item.title}
            </Text>
            <View className="flex-row items-center justify-between">
              <Text className="text-sm text-gray-600">
                by {item.creator}
              </Text>
              <View className="flex-row items-center gap-3">
                <Text className="text-sm text-gray-500">
                  👁 {item.viewCount.toLocaleString()}
                </Text>
                <Text className="text-sm text-primary-600 font-semibold">
                  ⬆ {item.voteScore}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}
