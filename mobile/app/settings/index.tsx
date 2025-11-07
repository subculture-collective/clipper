/**
 * Settings screen
 */

import { View, Text, Switch, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';

export default function SettingsScreen() {
  const { isNotificationsEnabled, enableNotifications, disableNotifications } = useNotifications();
  const [notifications, setNotifications] = useState(isNotificationsEnabled);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setNotifications(isNotificationsEnabled);
  }, [isNotificationsEnabled]);

  const handleNotificationToggle = async (value: boolean) => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      if (value) {
        const success = await enableNotifications();
        if (success) {
          setNotifications(true);
          Alert.alert(
            'Notifications Enabled',
            'You will now receive push notifications for replies, mentions, and more.'
          );
        } else {
          Alert.alert(
            'Permission Denied',
            'Please enable notifications in your device settings to receive push notifications.'
          );
        }
      } else {
        await disableNotifications();
        setNotifications(false);
        Alert.alert(
          'Notifications Disabled',
          'You will no longer receive push notifications.'
        );
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
      Alert.alert(
        'Error',
        'Failed to update notification settings. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 mb-2">
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Preferences
        </Text>
        
        <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
          <View className="flex-1">
            <Text className="text-base text-gray-900">Push Notifications</Text>
            <Text className="text-xs text-gray-500 mt-1">
              Get notified about replies, mentions, and approvals
            </Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={handleNotificationToggle}
            trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
            disabled={isLoading}
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
