/**
 * Profile screen - user profile and settings
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-white">
      <View className="items-center p-6 border-b border-gray-200">
        <View className="w-20 h-20 rounded-full bg-primary-500 items-center justify-center mb-3">
          <Text className="text-3xl text-white">👤</Text>
        </View>
        <Text className="text-xl font-bold text-gray-900">Guest User</Text>
        <Text className="text-sm text-gray-500">Not logged in</Text>
      </View>

      <View className="p-4">
        <TouchableOpacity
          className="p-4 bg-primary-500 rounded-lg mb-3"
          onPress={() => router.push('/auth/login')}
        >
          <Text className="text-white text-center font-semibold text-base">
            Login with Twitch
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="p-4 bg-gray-100 rounded-lg"
          onPress={() => router.push('/settings')}
        >
          <Text className="text-gray-900 text-center font-semibold text-base">
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
