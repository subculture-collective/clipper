import { useEffect, useRef, useState } from 'react';

interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
}

interface UseDesktopNotificationsReturn {
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (options: NotificationOptions) => void;
  isSupported: boolean;
}

/**
 * Hook for managing desktop notifications
 */
export function useDesktopNotifications(): UseDesktopNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const isSupported = 'Notification' in window;
  const notificationRefs = useRef<Map<string, Notification>>(new Map());
  const timeoutRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  };

  const showNotification = (options: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      return;
    }

    try {
      // Close existing notification with same tag
      if (options.tag) {
        const existing = notificationRefs.current.get(options.tag);
        existing?.close();
      }

      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        requireInteraction: false,
      });

      // Store reference
      if (options.tag) {
        notificationRefs.current.set(options.tag, notification);
      }

      // Auto-close after 5 seconds
      const timeoutId = window.setTimeout(() => {
        notification.close();
        if (options.tag) {
          notificationRefs.current.delete(options.tag);
          timeoutRefs.current.delete(options.tag);
        }
      }, 5000);

      // Store timeout reference for cleanup
      if (options.tag) {
        timeoutRefs.current.set(options.tag, timeoutId);
      }

      // Handle click to focus window
      notification.onclick = () => {
        window.clearTimeout(timeoutId);
        window.focus();
        notification.close();
        if (options.tag) {
          notificationRefs.current.delete(options.tag);
          timeoutRefs.current.delete(options.tag);
        }
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      notificationRefs.current.forEach((notification) => {
        notification.close();
      });
      notificationRefs.current.clear();
      
      // Clear all pending timeouts
      timeoutRefs.current.forEach((timeout) => {
        clearTimeout(timeout);
      });
      timeoutRefs.current.clear();
    };
  }, []);

  return {
    permission,
    requestPermission,
    showNotification,
    isSupported,
  };
}
