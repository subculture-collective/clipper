/**
 * Login screen
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();

  const handleLogin = () => {
    // TODO: Implement Twitch OAuth flow
    console.log('Login with Twitch');
    // For now, just go back
    router.back();
  };

  return (
    <View className="flex-1 bg-white items-center justify-center p-6">
      <Text className="text-4xl mb-2">🎬</Text>
      <Text className="text-3xl font-bold text-gray-900 mb-2">
        Welcome to Clipper
      </Text>
      <Text className="text-base text-gray-600 text-center mb-8">
        Discover and share the best Twitch clips
      </Text>

      <TouchableOpacity
        className="w-full p-4 bg-purple-600 rounded-lg mb-3"
        onPress={handleLogin}
      >
        <Text className="text-white text-center font-semibold text-base">
          Login with Twitch
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text className="text-primary-600">
          Continue as guest
        </Text>
      </TouchableOpacity>
    </View>
  );
}
