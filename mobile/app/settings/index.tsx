/**
 * Settings screen
 */

import { View, Text, Switch, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    getUserSettings,
    updateUserSettings,
    exportUserData,
    requestAccountDeletion,
    cancelAccountDeletion,
    getDeletionStatus,
    type UserSettings,
} from '@/services/users';

export default function SettingsScreen() {
  const { isAuthenticated } = useAuth();
  const { isNotificationsEnabled, enableNotifications, disableNotifications } = useNotifications();
  const [notifications, setNotifications] = useState(isNotificationsEnabled);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch user settings
  const { data: userSettings, refetch: refetchSettings } = useQuery<UserSettings>({
    queryKey: ['userSettings'],
    queryFn: getUserSettings,
    enabled: isAuthenticated,
  });

  // Fetch deletion status
  const { data: deletionStatus, refetch: refetchDeletionStatus } = useQuery({
    queryKey: ['deletionStatus'],
    queryFn: getDeletionStatus,
    enabled: isAuthenticated,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: updateUserSettings,
    onSuccess: () => {
      refetchSettings();
    },
    onError: (error) => {
      console.error('Failed to update settings:', error);
      Alert.alert('Error', 'Failed to update settings. Please try again.');
    },
  });

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

  const handlePrivacySettingChange = (value: 'public' | 'private' | 'followers') => {
    updateSettingsMutation.mutate({ profile_visibility: value });
  };

  const handleKarmaVisibilityToggle = (value: boolean) => {
    updateSettingsMutation.mutate({ show_karma_publicly: value });
  };

  const handleExportData = async () => {
    try {
      setIsLoading(true);
      await exportUserData();
      Alert.alert('Success', 'Your data export has been requested. You will receive an email with a download link.');
    } catch (error) {
      console.error('Failed to export data:', error);
      Alert.alert('Error', 'Failed to export data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone. Your account will be permanently deleted in 30 days.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const result = await requestAccountDeletion();
              await refetchDeletionStatus();
              if (result.scheduled_for) {
                const deletionDate = new Date(result.scheduled_for);
                const dateStr = !isNaN(deletionDate.getTime())
                  ? deletionDate.toLocaleDateString()
                  : 'soon';
                Alert.alert(
                  'Account Deletion Scheduled',
                  `Your account will be deleted on ${dateStr}.`
                );
              } else {
                Alert.alert('Success', 'Account deletion has been scheduled.');
              }
            } catch (error) {
              console.error('Failed to request deletion:', error);
              Alert.alert('Error', 'Failed to request account deletion. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancelDeletion = async () => {
    try {
      setIsLoading(true);
      await cancelAccountDeletion();
      await refetchDeletionStatus();
      Alert.alert('Success', 'Account deletion has been cancelled.');
    } catch (error) {
      console.error('Failed to cancel deletion:', error);
      Alert.alert('Error', 'Failed to cancel deletion. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      {isAuthenticated && deletionStatus?.pending && deletionStatus?.scheduled_for && (
        <View className="bg-red-50 border-l-4 border-red-500 p-4 m-4">
          <Text className="text-base font-semibold text-red-800 mb-1">
            Account Deletion Scheduled
          </Text>
          <Text className="text-sm text-red-700">
            Your account will be deleted on {(() => {
              const date = new Date(deletionStatus.scheduled_for);
              return !isNaN(date.getTime()) ? date.toLocaleDateString() : 'soon';
            })()}
          </Text>
          <TouchableOpacity
            className="mt-2 bg-red-600 rounded-lg py-2 px-4"
            onPress={handleCancelDeletion}
            disabled={isLoading}
          >
            <Text className="text-white text-center font-semibold">
              Cancel Deletion
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View className="bg-white p-4 mb-2">
        <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Notifications
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
      </View>

      {isAuthenticated && (
        <>
          <View className="bg-white p-4 mb-2">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Privacy
            </Text>
            
            <View className="py-3 border-b border-gray-100">
              <Text className="text-base text-gray-900 mb-3">Profile Visibility</Text>
              <View>
                <TouchableOpacity
                  className={`flex-row items-center p-3 rounded-lg border ${
                    userSettings?.profile_visibility === 'public'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200'
                  }`}
                  onPress={() => handlePrivacySettingChange('public')}
                  disabled={isLoading}
                >
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900">Public</Text>
                    <Text className="text-xs text-gray-500">Anyone can view your profile</Text>
                  </View>
                  {userSettings?.profile_visibility === 'public' && (
                    <Text className="text-primary-600 text-xl">✓</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-row items-center p-3 rounded-lg border mt-2 ${
                    userSettings?.profile_visibility === 'private'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200'
                  }`}
                  onPress={() => handlePrivacySettingChange('private')}
                  disabled={isLoading}
                >
                  <View className="flex-1">
                    <Text className="text-base font-medium text-gray-900">Private</Text>
                    <Text className="text-xs text-gray-500">Only you can view your profile</Text>
                  </View>
                  {userSettings?.profile_visibility === 'private' && (
                    <Text className="text-primary-600 text-xl">✓</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row items-center justify-between py-3">
              <View className="flex-1">
                <Text className="text-base text-gray-900">Show Karma Publicly</Text>
                <Text className="text-xs text-gray-500 mt-1">
                  Display your karma score on your profile
                </Text>
              </View>
              <Switch
                value={userSettings?.show_karma_publicly ?? true}
                onValueChange={handleKarmaVisibilityToggle}
                trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
                disabled={isLoading}
              />
            </View>
          </View>

          <View className="bg-white p-4 mb-2">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Appearance
            </Text>
            
            <View className="flex-row items-center justify-between py-3">
              <Text className="text-base text-gray-900">Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#d1d5db', true: '#0ea5e9' }}
              />
            </View>
          </View>

          <View className="bg-white p-4 mb-2">
            <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
              Account Management
            </Text>
            
            <TouchableOpacity
              className="py-3 border-b border-gray-100"
              onPress={handleExportData}
              disabled={isLoading}
            >
              <Text className="text-base text-gray-900">Export My Data</Text>
              <Text className="text-xs text-gray-500 mt-1">
                Download a copy of your data
              </Text>
            </TouchableOpacity>

            {!deletionStatus?.pending && (
              <TouchableOpacity
                className="py-3"
                onPress={handleDeleteAccount}
                disabled={isLoading}
              >
                <Text className="text-base text-red-600">Delete Account</Text>
                <Text className="text-xs text-gray-500 mt-1">
                  Permanently delete your account and data
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

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

      {isLoading && (
        <View className="absolute inset-0 bg-black bg-opacity-30 items-center justify-center">
          <View className="bg-white p-6 rounded-lg">
            <ActivityIndicator size="large" color="#0ea5e9" />
            <Text className="text-gray-900 mt-2">Processing...</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
