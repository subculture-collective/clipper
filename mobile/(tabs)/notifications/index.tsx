import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { EmptyState, LoadingState } from '@/components/EmptyState';
import { notificationsApi } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import { timeAgo } from '@/lib/formatters';
import type { Notification } from '@/types';

export default function NotificationsScreen() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    enabled: isAuthenticated,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const renderItem = useCallback(({ item }: { item: Notification }) => (
    <Pressable
      style={[styles.notificationItem, !item.is_read && styles.unread]}
      onPress={() => {
        if (!item.is_read) markReadMutation.mutate(item.id);
      }}
    >
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.notificationBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notificationTime}>{timeAgo(item.created_at)}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </Pressable>
  ), [markReadMutation]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Notifications' }} />
        <EmptyState
          icon={<Bell size={48} color={Colors.dark.textMuted} />}
          title="Sign in to see notifications"
          subtitle="Stay updated on your clips and interactions"
        />
      </View>
    );
  }

  if (isLoading) return <LoadingState />;

  const notifications = data?.data ?? [];
  const hasUnread = notifications.some(n => !n.is_read);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerRight: () => hasUnread ? (
            <Pressable onPress={() => markAllReadMutation.mutate()} hitSlop={8} style={styles.markAllBtn}>
              <CheckCheck size={18} color={Colors.dark.accent} />
            </Pressable>
          ) : null,
        }}
      />
      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.dark.accent}
            colors={[Colors.dark.accent]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Bell size={48} color={Colors.dark.textMuted} />}
            title="No notifications"
            subtitle="You're all caught up"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  list: {
    paddingTop: 4,
    paddingBottom: 20,
  },
  markAllBtn: {
    padding: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  unread: {
    backgroundColor: Colors.dark.surfaceLight,
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600',
  },
  notificationBody: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  notificationTime: {
    color: Colors.dark.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.accent,
    marginLeft: 12,
  },
});
