import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Lock, Film } from 'lucide-react-native';
import Colors from '@/constants/colors';
import type { Collection } from '@/types';

interface CollectionCardProps {
  collection: Collection;
  onPress: (collection: Collection) => void;
}

export default React.memo(function CollectionCard({ collection, onPress }: CollectionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress(collection)}
    >
      {collection.thumbnail_url ? (
        <Image source={{ uri: collection.thumbnail_url }} style={styles.thumbnail} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
      )}
      <View style={styles.thumbnailOverlay} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>{collection.title}</Text>
          {collection.visibility === 'private' && <Lock size={14} color={Colors.dark.textMuted} />}
        </View>
        {collection.description && (
          <Text style={styles.description} numberOfLines={1}>{collection.description}</Text>
        )}
        <View style={styles.footer}>
          <Film size={12} color={Colors.dark.accent} />
          <Text style={styles.clipCount}>{collection.clip_count} clips</Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  thumbnail: {
    width: '100%',
    height: 120,
  },
  thumbnailPlaceholder: {
    backgroundColor: Colors.dark.surfaceLight,
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  content: {
    padding: 12,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  description: {
    color: Colors.dark.textSecondary,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  clipCount: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontWeight: '600',
  },
});
