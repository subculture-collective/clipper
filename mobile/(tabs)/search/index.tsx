import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
} from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Hash, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GameCard from '@/components/GameCard';
import ClipCard from '@/components/ClipCard';
import { EmptyState, LoadingState } from '@/components/EmptyState';
import { searchApi, gamesApi, tagsApi, clipsApi } from '@/lib/api';
import type { Game, Clip, Tag } from '@/types';

export default function SearchScreen() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const { data: games } = useQuery({
    queryKey: ['games', 'trending'],
    queryFn: () => gamesApi.getTrending(),
  });

  const { data: tags } = useQuery({
    queryKey: ['tags', 'trending'],
    queryFn: () => tagsApi.getTrending(),
  });

  const hasActiveFilters = query.length > 0 || selectedGame !== null;

  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ['search', query, selectedGame?.id, selectedTag],
    queryFn: () => searchApi.search(query || selectedTag || '', {
      ...(selectedGame ? { game_id: selectedGame.id } : {}),
    }),
    enabled: hasActiveFilters || !!selectedTag,
  });

  const { data: allClips } = useQuery({
    queryKey: ['clips', 'all'],
    queryFn: () => clipsApi.list({ per_page: 20 }),
    enabled: !hasActiveFilters && !selectedTag,
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

  const handleGamePress = useCallback((game: Game) => {
    setSelectedGame(prev => prev?.id === game.id ? null : game);
  }, []);

  const handleTagPress = useCallback((tag: string) => {
    setSelectedTag(prev => prev === tag ? null : tag);
    setQuery(prev => {
      if (prev.includes(tag)) return prev.replace(tag, '').trim();
      return tag;
    });
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSelectedGame(null);
    setSelectedTag(null);
  }, []);

  const displayClips = hasActiveFilters || selectedTag
    ? searchResults?.clips ?? []
    : allClips?.data ?? [];

  const renderHeader = useCallback(() => (
    <View>
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.dark.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clips, streamers, games..."
            placeholderTextColor={Colors.dark.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {hasActiveFilters && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={18} color={Colors.dark.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {games && games.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Games</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gamesRow}
          >
            {games.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onPress={handleGamePress}
                selected={selectedGame?.id === game.id}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {tags && tags.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trending Tags</Text>
          <View style={styles.tagsWrap}>
            {tags.map(tag => (
              <Pressable
                key={tag.slug}
                style={[styles.tag, selectedTag === tag.slug && styles.tagActive]}
                onPress={() => handleTagPress(tag.slug)}
              >
                <Hash size={12} color={selectedTag === tag.slug ? Colors.dark.accent : Colors.dark.textMuted} />
                <Text style={[styles.tagText, selectedTag === tag.slug && styles.tagTextActive]}>{tag.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.resultsHeader}>
        <Text style={styles.sectionTitle}>
          {hasActiveFilters ? `Results (${displayClips.length})` : 'All Clips'}
        </Text>
      </View>
    </View>
  ), [query, selectedGame, selectedTag, hasActiveFilters, displayClips.length, handleGamePress, handleTagPress, clearSearch, games, tags]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Explore' }} />
      <FlatList
        data={displayClips}
        renderItem={({ item }) => (
          <ClipCard clip={item} onVote={handleVote} onFavorite={handleFavorite} />
        )}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isSearching ? <LoadingState /> : (
            <EmptyState
              icon={<Search size={48} color={Colors.dark.textMuted} />}
              title="No clips found"
              subtitle="Try different search terms or filters"
            />
          )
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
    paddingBottom: 20,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 15,
    height: '100%',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  gamesRow: {
    paddingLeft: 16,
    paddingRight: 6,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tagActive: {
    backgroundColor: Colors.dark.surfaceHighlight,
    borderColor: Colors.dark.accent,
  },
  tagText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tagTextActive: {
    color: Colors.dark.accent,
  },
  resultsHeader: {
    marginTop: 4,
    marginBottom: 4,
  },
});
