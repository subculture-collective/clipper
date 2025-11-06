/**
 * 404 Not Found screen
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops! Not Found" }} />
      <View className="flex-1 bg-white items-center justify-center p-6">
        <Text className="text-6xl mb-4">🤔</Text>
        <Text className="text-2xl font-bold text-gray-900 mb-2">
          Page Not Found
        </Text>
        <Text className="text-base text-gray-600 text-center mb-6">
          This screen doesn&apos;t exist.
        </Text>
        <Link href="/" asChild>
          <TouchableOpacity className="px-6 py-3 bg-primary-500 rounded-lg">
            <Text className="text-white font-semibold">
              Go to home screen
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
}
