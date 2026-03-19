import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bookmark } from 'lucide-react-native';
import Colors from '@/constants/colors';
import ClipCard from '@/components/ClipCard';
import { EmptyState, LoadingState } from '@/components/EmptyState';
import { clipsApi, usersApi } from '@/lib/api';
import { useAuth } from '@/providers/AuthProvider';
import type { Clip } from '@/types';

export default function FavoritesScreen() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['favorites', user?.id],
    queryFn: () => usersApi.getFavorites(user!.id),
    enabled: isAuthenticated,
  });

  const voteMutation = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      clipsApi.vote(id, direction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const unfavoriteMutation = useMutation({
    mutationFn: (id: string) => clipsApi.unfavorite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['favorites'] }),
  });

  const handleVote = useCallback((clipId: string, direction: 'up' | 'down') => {
    voteMutation.mutate({ id: clipId, direction });
  }, [voteMutation]);

  const handleFavorite = useCallback((clipId: string) => {
    unfavoriteMutation.mutate(clipId);
  }, [unfavoriteMutation]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Favorites' }} />
        <EmptyState
          icon={<Bookmark size={48} color={Colors.dark.textMuted} />}
          title="Sign in to see favorites"
          subtitle="Save your favorite clips for easy access"
        />
      </View>
    );
  }

  if (isLoading) return <LoadingState />;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Favorites' }} />
      <FlatList
        data={data?.data ?? []}
        renderItem={({ item }) => (
          <ClipCard clip={item} onVote={handleVote} onFavorite={handleFavorite} />
        )}
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
            icon={<Bookmark size={48} color={Colors.dark.textMuted} />}
            title="No favorites yet"
            subtitle="Bookmark clips from the feed to save them here"
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
    paddingTop: 8,
    paddingBottom: 20,
  },
});
