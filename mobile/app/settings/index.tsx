/**
 * Settings screen
 */

import { View, Text, Switch, TouchableOpacity } from 'react-native';
import { useState } from 'react';

export default function SettingsScreen() {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 mb-2">
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Preferences
        </Text>
        
        <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
          <Text className="text-base text-gray-900">Push Notifications</Text>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
          />
        </View>

        <View className="flex-row items-center justify-between py-3">
          <Text className="text-base text-gray-900">Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
          />
        </View>
      </View>

      <View className="bg-white p-4">
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
          About
        </Text>
        
        <TouchableOpacity className="py-3 border-b border-gray-100">
          <Text className="text-base text-gray-900">Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity className="py-3 border-b border-gray-100">
          <Text className="text-base text-gray-900">Terms of Service</Text>
        </TouchableOpacity>

        <TouchableOpacity className="py-3">
          <Text className="text-base text-gray-900">About Clipper</Text>
        </TouchableOpacity>
      </View>

      <View className="p-4">
        <Text className="text-xs text-gray-500 text-center">
          Version 0.0.1
        </Text>
      </View>
    </View>
  );
}
