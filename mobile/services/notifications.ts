/**
 * Notification service - Handles push notifications registration and management
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from '@/lib/api';
import { EXPO_PROJECT_ID } from '@/constants/config';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export type NotificationData = {
  type?: string;
  link?: string;
  clipId?: string;
  userId?: string;
  commentId?: string;
};

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Push notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Failed to get push notification permissions');
    return false;
  }

  return true;
}

/**
 * Get Expo push token
 */
export async function getExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return null;
    }

    // Validate project ID is configured
    if (!EXPO_PROJECT_ID || EXPO_PROJECT_ID.trim() === '') {
      console.warn('EXPO_PROJECT_ID is not configured. Push notifications will not work.');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: EXPO_PROJECT_ID,
    });

    return token.data;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceToken(token: string): Promise<void> {
  try {
    await api.post('/notifications/register', {
      device_token: token,
      device_platform: Platform.OS,
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    throw error;
  }
}

/**
 * Unregister device token from backend
 */
export async function unregisterDeviceToken(token: string): Promise<void> {
  try {
    await api.delete('/notifications/unregister', {
      data: {
        device_token: token,
      },
    });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    throw error;
  }
}

/**
 * Initialize push notifications
 * Returns the push token if successful
 */
export async function initializePushNotifications(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      return null;
    }

    const token = await getExpoPushToken();
    if (!token) {
      return null;
    }

    await registerDeviceToken(token);
    return token;
  } catch (error) {
    console.error('Error initializing push notifications:', error);
    return null;
  }
}

/**
 * Add notification received listener
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add notification response listener (when user taps notification)
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear badge
 */
export async function clearBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0);
}

/**
 * Dismiss all notifications
 */
export async function dismissAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}
