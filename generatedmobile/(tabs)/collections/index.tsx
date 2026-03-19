import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
} from 'react-native';
import { Stack } from 'expo-router';
import { Plus, Bookmark } from 'lucide-react-native';
import Colors from '@/constants/colors';
import CollectionCard from '@/components/CollectionCard';
import ClipCard from '@/components/ClipCard';
import { useClips } from '@/providers/ClipProvider';
import { Collection } from '@/types/clip';

export default function CollectionsScreen() {
  const { collections, bookmarkedClips, vote, toggleBookmark } = useClips();

  const handleCollectionPress = useCallback((collection: Collection) => {
    console.log('Collection pressed:', collection.id);
  }, []);

  const renderHeader = useCallback(() => (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>My Collections</Text>
        <Pressable style={styles.newBtn}>
          <Plus size={16} color={Colors.dark.accent} />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      <FlatList
        data={collections}
        renderItem={({ item }) => (
          <View style={styles.collectionItem}>
            <CollectionCard collection={item} onPress={handleCollectionPress} />
          </View>
        )}
        keyExtractor={item => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.collectionsRow}
        scrollEnabled={true}
      />

      <View style={styles.bookmarksHeader}>
        <Bookmark size={18} color={Colors.dark.warning} fill={Colors.dark.warning} />
        <Text style={styles.bookmarksTitle}>Bookmarked Clips ({bookmarkedClips.length})</Text>
      </View>
    </View>
  ), [collections, bookmarkedClips.length, handleCollectionPress]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Collections' }} />
      <FlatList
        data={bookmarkedClips}
        renderItem={({ item }) => (
          <ClipCard clip={item} onVote={vote} onBookmark={toggleBookmark} />
        )}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Bookmark size={48} color={Colors.dark.textMuted} />
            <Text style={styles.emptyText}>No bookmarks yet</Text>
            <Text style={styles.emptySubtext}>Bookmark clips from the feed to save them here</Text>
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
    paddingTop: 8,
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.dark.surfaceHighlight,
    borderWidth: 1,
    borderColor: Colors.dark.accent,
  },
  newBtnText: {
    color: Colors.dark.accent,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  collectionsRow: {
    paddingLeft: 16,
    paddingRight: 6,
    paddingBottom: 16,
  },
  collectionItem: {
    width: 260,
    marginRight: 12,
  },
  bookmarksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  bookmarksTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
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
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
