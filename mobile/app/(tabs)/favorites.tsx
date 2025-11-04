/**
 * Favorites screen - displays saved clips
 */

import { View, Text } from 'react-native';

export default function FavoritesScreen() {
  return (
    <View className="flex-1 bg-white items-center justify-center p-4">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        Your Favorites
      </Text>
      <Text className="text-gray-500 text-center">
        Save clips to see them here
      </Text>
    </View>
  );
}
