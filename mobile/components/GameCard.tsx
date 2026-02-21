import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import type { Game } from '@/types';

interface GameCardProps {
  game: Game;
  onPress: (game: Game) => void;
  selected?: boolean;
}

export default React.memo(function GameCard({ game, onPress, selected }: GameCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
        selected && styles.selected,
      ]}
      onPress={() => onPress(game)}
    >
      {game.cover_url ? (
        <Image source={{ uri: game.cover_url }} style={styles.cover} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      <View style={styles.overlay} />
      <Text style={styles.name} numberOfLines={2}>{game.name}</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 100,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 10,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  selected: {
    borderWidth: 2,
    borderColor: Colors.dark.accent,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    backgroundColor: Colors.dark.surfaceLight,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  name: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
