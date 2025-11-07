/**
 * Notifications inbox screen
 */

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '@/contexts/NotificationContext';
import { api } from '@/lib/api';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
  source_user?: {
    username: string;
    display_name: string;
    profile_image_url?: string;
  };
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();
  const { refreshUnreadCount } = useNotifications();

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const loadNotifications = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else if (pageNum === 1) {
        setIsLoading(true);
      }

      const response = await api.get('/notifications', {
        params: {
          page: pageNum,
          limit: 20,
        },
      });

      const newNotifications = response.data.notifications || [];

      if (pageNum === 1) {
        setNotifications(newNotifications);
      } else {
        setNotifications((prev) => [...prev, ...newNotifications]);
      }

      setHasMore(response.data.has_more || false);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    loadNotifications(1, true);
    refreshUnreadCount();
  }, [loadNotifications, refreshUnreadCount]);

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadNotifications(page + 1);
    }
  };

  const handleNotificationPress = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        await api.patch(`/notifications/${notification.id}/read`);
        
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
        
        // Refresh unread count
        refreshUnreadCount();
      }

      // Navigate to the linked content
      if (notification.link) {
        router.push(notification.link as any);
      }
    } catch (error) {
      console.error('Error handling notification press:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all');
      
      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      
      // Refresh unread count
      refreshUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'reply':
        return 'chatbubble';
      case 'mention':
        return 'at';
      case 'vote_milestone':
        return 'trending-up';
      case 'badge_earned':
      case 'rank_up':
        return 'trophy';
      case 'submission_approved':
        return 'checkmark-circle';
      case 'submission_rejected':
        return 'close-circle';
      case 'favorited_clip_comment':
        return 'heart';
      default:
        return 'notifications';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      onPress={() => handleNotificationPress(item)}
      className={`flex-row items-start p-4 border-b border-gray-100 ${
        !item.is_read ? 'bg-blue-50' : 'bg-white'
      }`}
    >
      <View className="mr-3 mt-1">
        <Ionicons
          name={getNotificationIcon(item.type) as any}
          size={24}
          color={!item.is_read ? '#0ea5e9' : '#6b7280'}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-base mb-1 ${
            !item.is_read ? 'font-semibold text-gray-900' : 'text-gray-800'
          }`}
        >
          {item.title}
        </Text>
        <Text className="text-sm text-gray-600 mb-1">{item.message}</Text>
        {item.source_user && (
          <Text className="text-xs text-gray-500">
            by {item.source_user.display_name}
          </Text>
        )}
        <Text className="text-xs text-gray-400 mt-1">
          {formatTimestamp(item.created_at)}
        </Text>
      </View>
      {!item.is_read && (
        <View className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
      )}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View className="flex-1 items-center justify-center p-8">
      <Ionicons name="notifications-off-outline" size={64} color="#d1d5db" />
      <Text className="text-lg text-gray-500 mt-4 text-center">
        No notifications yet
      </Text>
      <Text className="text-sm text-gray-400 mt-2 text-center">
        You&apos;ll see notifications here when you get replies, mentions, and more
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading || page === 1) return null;
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#0ea5e9" />
      </View>
    );
  };

  if (isLoading && page === 1) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <View className="flex-1 bg-gray-50">
      {hasUnread && (
        <View className="bg-white border-b border-gray-200 p-3">
          <TouchableOpacity
            onPress={handleMarkAllAsRead}
            className="flex-row items-center justify-center"
          >
            <Ionicons name="checkmark-done" size={18} color="#0ea5e9" />
            <Text className="text-sm text-blue-500 ml-2 font-medium">
              Mark all as read
            </Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#0ea5e9"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}
