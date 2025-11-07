/**
 * Notification Context - Manages notification state and push notification setup
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import {
  initializePushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getBadgeCount,
  setBadgeCount,
  type NotificationData,
} from '@/services/notifications';
import { useAuth } from './AuthContext';

type NotificationContextType = {
  unreadCount: number;
  isNotificationsEnabled: boolean;
  pushToken: string | null;
  refreshUnreadCount: () => Promise<void>;
  enableNotifications: () => Promise<boolean>;
  disableNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

const PUSH_TOKEN_KEY = 'push_token';
const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  // Load notification preferences
  useEffect(() => {
    loadNotificationPreferences();
  }, []);

  // Initialize push notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && isNotificationsEnabled) {
      setupPushNotifications();
    }
  }, [isAuthenticated, isNotificationsEnabled]);

  // Set up notification listeners
  useEffect(() => {
    // Listen for notifications received while app is in foreground
    const receivedSubscription = addNotificationReceivedListener(
      (notification) => {
        console.log('Notification received:', notification);
        // Refresh unread count when notification is received
        refreshUnreadCount();
      }
    );

    // Listen for notification taps
    const responseSubscription = addNotificationResponseListener((response) => {
      handleNotificationResponse(response);
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, []);

  const loadNotificationPreferences = async () => {
    try {
      const [savedToken, enabled] = await Promise.all([
        SecureStore.getItemAsync(PUSH_TOKEN_KEY),
        SecureStore.getItemAsync(NOTIFICATIONS_ENABLED_KEY),
      ]);

      if (savedToken) {
        setPushToken(savedToken);
      }

      if (enabled !== null) {
        setIsNotificationsEnabled(enabled === 'true');
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const setupPushNotifications = async () => {
    try {
      const token = await initializePushNotifications();
      if (token) {
        setPushToken(token);
        await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  };

  const handleNotificationResponse = (
    response: Notifications.NotificationResponse
  ) => {
    const data = response.notification.request.content
      .data as NotificationData;

    // Navigate based on notification type and data
    if (data.link) {
      router.push(data.link as any);
    } else if (data.clipId) {
      router.push(`/clip/${data.clipId}` as any);
    } else if (data.userId) {
      router.push(`/profile/${data.userId}` as any);
    } else {
      // Default to notifications screen
      router.push('/notifications' as any);
    }
  };

  const refreshUnreadCount = useCallback(async () => {
    try {
      // TODO: Fetch from API
      // const response = await api.get('/notifications/count');
      // setUnreadCount(response.data.count);
      
      // For now, use badge count
      const count = await getBadgeCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  }, []);

  const enableNotifications = async (): Promise<boolean> => {
    try {
      const token = await initializePushNotifications();
      if (token) {
        setPushToken(token);
        setIsNotificationsEnabled(true);
        await Promise.all([
          SecureStore.setItemAsync(PUSH_TOKEN_KEY, token),
          SecureStore.setItemAsync(NOTIFICATIONS_ENABLED_KEY, 'true'),
        ]);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error enabling notifications:', error);
      return false;
    }
  };

  const disableNotifications = async () => {
    try {
      // TODO: Unregister token with backend if we have one
      // if (pushToken) {
      //   await unregisterDeviceToken(pushToken);
      // }

      setPushToken(null);
      setIsNotificationsEnabled(false);
      await Promise.all([
        SecureStore.deleteItemAsync(PUSH_TOKEN_KEY),
        SecureStore.setItemAsync(NOTIFICATIONS_ENABLED_KEY, 'false'),
      ]);
    } catch (error) {
      console.error('Error disabling notifications:', error);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        isNotificationsEnabled,
        pushToken,
        refreshUnreadCount,
        enableNotifications,
        disableNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
}
