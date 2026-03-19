import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Animated,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Zap, TrendingUp, Clock3, Award } from 'lucide-react-native';
import Colors from '@/constants/colors';
import ClipCard from '@/components/ClipCard';
import { useClips } from '@/providers/ClipProvider';

type FeedFilter = 'hot' | 'trending' | 'new' | 'top';

const FILTERS: { key: FeedFilter; label: string; icon: React.ReactNode }[] = [
  { key: 'hot', label: 'Hot', icon: <Zap size={14} color={Colors.dark.upvote} /> },
  { key: 'trending', label: 'Trending', icon: <TrendingUp size={14} color={Colors.dark.success} /> },
  { key: 'new', label: 'New', icon: <Clock3 size={14} color={Colors.dark.downvote} /> },
  { key: 'top', label: 'Top', icon: <Award size={14} color={Colors.dark.gold} /> },
];

export default function HomeScreen() {
  const { clips, vote, toggleBookmark } = useClips();
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('hot');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const sortedClips = React.useMemo(() => {
    const sorted = [...clips];
    switch (activeFilter) {
      case 'hot':
        return sorted.sort((a, b) => (b.votes * 0.7 + b.viewCount * 0.3) - (a.votes * 0.7 + a.viewCount * 0.3));
      case 'trending':
        return sorted.sort((a, b) => b.viewCount - a.viewCount);
      case 'new':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'top':
        return sorted.sort((a, b) => b.votes - a.votes);
      default:
        return sorted;
    }
  }, [clips, activeFilter]);

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

  const renderItem = useCallback(({ item }: { item: typeof clips[0] }) => (
    <ClipCard clip={item} onVote={vote} onBookmark={toggleBookmark} />
  ), [vote, toggleBookmark]);

  const keyExtractor = useCallback((item: typeof clips[0]) => item.id, []);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Clipper',
          headerTitleStyle: {
            fontWeight: '800' as const,
            fontSize: 20,
            color: Colors.dark.accent,
          },
        }}
      />
      <Animated.FlatList
        data={sortedClips}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
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
    fontWeight: '600' as const,
  },
  filterLabelActive: {
    color: Colors.dark.text,
  },
});
