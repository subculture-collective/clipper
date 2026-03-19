import React, { useState, useCallback } from 'react';
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
import { Zap, TrendingUp, Clock3, Award } from 'lucide-react-native';
import Colors from '@/constants/colors';
import ClipCard from '@/components/ClipCard';
import { LoadingState } from '@/components/EmptyState';
import { clipsApi } from '@/lib/api';
import type { Clip } from '@/types';
import type { ClipSortBy } from '@/lib/api/clips';

const FILTERS: { key: ClipSortBy; label: string; icon: React.ReactNode }[] = [
  { key: 'hot', label: 'Hot', icon: <Zap size={14} color={Colors.dark.upvote} /> },
  { key: 'trending', label: 'Trending', icon: <TrendingUp size={14} color={Colors.dark.success} /> },
  { key: 'new', label: 'New', icon: <Clock3 size={14} color={Colors.dark.downvote} /> },
  { key: 'top', label: 'Top', icon: <Award size={14} color={Colors.dark.gold} /> },
];

export default function HomeScreen() {
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<ClipSortBy>('hot');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clips', activeFilter],
    queryFn: () => clipsApi.list({ sort: activeFilter, per_page: 20 }),
  });

  const voteMutation = useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
      clipsApi.vote(id, direction),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clips'] }),
  });

  const favoriteMutation = useMutation({
    mutationFn: (id: string) => clipsApi.favorite(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clips'] }),
  });

  const handleVote = useCallback((clipId: string, direction: 'up' | 'down') => {
    voteMutation.mutate({ id: clipId, direction });
  }, [voteMutation]);

  const handleFavorite = useCallback((clipId: string) => {
    favoriteMutation.mutate(clipId);
  }, [favoriteMutation]);

  const renderHeader = useCallback(() => (
    <View style={styles.filterBar}>
      {FILTERS.map(f => (
        <Pressable
          key={f.key}
          style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
          onPress={() => setActiveFilter(f.key)}
        >
          {f.icon}
          <Text style={[styles.filterLabel, activeFilter === f.key && styles.filterLabelActive]}>
            {f.label}
          </Text>
        </Pressable>
      ))}
    </View>
  ), [activeFilter]);

  const renderItem = useCallback(({ item }: { item: Clip }) => (
    <ClipCard clip={item} onVote={handleVote} onFavorite={handleFavorite} />
  ), [handleVote, handleFavorite]);

  if (isLoading) return <LoadingState />;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Clipper',
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 20,
            color: Colors.dark.accent,
          },
        }}
      />
      <FlatList
        data={data?.data ?? []}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
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
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  filterChipActive: {
    backgroundColor: Colors.dark.surfaceHighlight,
    borderColor: Colors.dark.accent,
  },
  filterLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterLabelActive: {
    color: Colors.dark.text,
  },
});
