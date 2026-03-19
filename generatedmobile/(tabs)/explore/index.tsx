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
import { Search, Hash, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import GameCard from '@/components/GameCard';
import ClipCard from '@/components/ClipCard';
import { useClips } from '@/providers/ClipProvider';
import { GAMES, TRENDING_TAGS } from '@/mocks/clips';
import { Game } from '@/types/clip';

export default function ExploreScreen() {
  const { clips, vote, toggleBookmark } = useClips();
  const [query, setQuery] = useState<string>('');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const filteredClips = useMemo(() => {
    let result = [...clips];
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        c =>
          c.title.toLowerCase().includes(q) ||
          c.streamer.displayName.toLowerCase().includes(q) ||
          c.game.name.toLowerCase().includes(q)
      );
    }
    if (selectedGame) {
      result = result.filter(c => c.game.id === selectedGame.id);
    }
    return result;
  }, [clips, query, selectedGame]);

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

  const hasActiveFilters = query.length > 0 || selectedGame !== null;

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
            testID="search-input"
          />
          {hasActiveFilters && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <X size={18} color={Colors.dark.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Games</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gamesRow}
        >
          {GAMES.map(game => (
            <View key={game.id} style={selectedGame?.id === game.id ? styles.gameSelected : undefined}>
              <GameCard game={game} onPress={handleGamePress} />
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trending Tags</Text>
        <View style={styles.tagsWrap}>
          {TRENDING_TAGS.map(tag => (
            <Pressable
              key={tag}
              style={[styles.tag, selectedTag === tag && styles.tagActive]}
              onPress={() => handleTagPress(tag)}
            >
              <Hash size={12} color={selectedTag === tag ? Colors.dark.accent : Colors.dark.textMuted} />
              <Text style={[styles.tagText, selectedTag === tag && styles.tagTextActive]}>{tag}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={styles.sectionTitle}>
          {hasActiveFilters ? `Results (${filteredClips.length})` : 'All Clips'}
        </Text>
      </View>
    </View>
  ), [query, selectedGame, selectedTag, hasActiveFilters, filteredClips.length, handleGamePress, handleTagPress, clearSearch]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Explore' }} />
      <FlatList
        data={filteredClips}
        renderItem={({ item }) => (
          <ClipCard clip={item} onVote={vote} onBookmark={toggleBookmark} />
        )}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Search size={48} color={Colors.dark.textMuted} />
            <Text style={styles.emptyText}>No clips found</Text>
            <Text style={styles.emptySubtext}>Try different search terms or filters</Text>
          </View>
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
    fontWeight: '700' as const,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  gamesRow: {
    paddingLeft: 16,
    paddingRight: 6,
  },
  gameSelected: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
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
    fontWeight: '600' as const,
  },
  tagTextActive: {
    color: Colors.dark.accent,
  },
  resultsHeader: {
    marginTop: 4,
    marginBottom: 4,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  emptySubtext: {
    color: Colors.dark.textMuted,
    fontSize: 14,
  },
});
