import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Bookmark,
  Play,
  Eye,
  Clock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { formatNumber, formatDuration, timeAgo } from '@/lib/formatters';
import type { Clip } from '@/types';

interface ClipCardProps {
  clip: Clip;
  onVote: (clipId: string, direction: 'up' | 'down') => void;
  onFavorite: (clipId: string) => void;
}

export default React.memo(function ClipCard({ clip, onVote, onFavorite }: ClipCardProps) {
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  }, [scaleAnim]);

  const handlePress = useCallback(() => {
    router.push(`/clip/${clip.id}` as any);
  }, [router, clip.id]);

  const handleVote = useCallback((direction: 'up' | 'down') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onVote(clip.id, direction);
  }, [clip.id, onVote]);

  const handleFavorite = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFavorite(clip.id);
  }, [clip.id, onFavorite]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.thumbnailContainer}>
          {clip.thumbnail_url ? (
            <Image
              source={{ uri: clip.thumbnail_url }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]} />
          )}
          <View style={styles.thumbnailOverlay}>
            <View style={styles.playButton}>
              <Play size={20} color="#fff" fill="#fff" />
            </View>
          </View>
          {clip.duration != null && (
            <View style={styles.durationBadge}>
              <Clock size={10} color="#fff" />
              <Text style={styles.durationText}>{formatDuration(clip.duration)}</Text>
            </View>
          )}
          <View style={styles.viewsBadge}>
            <Eye size={10} color="#fff" />
            <Text style={styles.viewsText}>{formatNumber(clip.view_count)}</Text>
          </View>
          {clip.streamer?.is_live && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.voteColumn}>
            <Pressable onPress={() => handleVote('up')} hitSlop={8}>
              <ArrowBigUp
                size={22}
                color={clip.user_vote === 'up' ? Colors.dark.upvote : Colors.dark.textMuted}
                fill={clip.user_vote === 'up' ? Colors.dark.upvote : 'none'}
              />
            </Pressable>
            <Text style={[
              styles.voteCount,
              clip.user_vote === 'up' && styles.voteCountUp,
              clip.user_vote === 'down' && styles.voteCountDown,
            ]}>
              {formatNumber(clip.vote_score)}
            </Text>
            <Pressable onPress={() => handleVote('down')} hitSlop={8}>
              <ArrowBigDown
                size={22}
                color={clip.user_vote === 'down' ? Colors.dark.downvote : Colors.dark.textMuted}
                fill={clip.user_vote === 'down' ? Colors.dark.downvote : 'none'}
              />
            </Pressable>
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>{clip.title}</Text>
            <View style={styles.meta}>
              {clip.streamer?.avatar_url && (
                <Image source={{ uri: clip.streamer.avatar_url }} style={styles.avatar} />
              )}
              <Text style={styles.streamerName}>
                {clip.streamer?.display_name ?? clip.broadcaster_name}
              </Text>
              {clip.game_name && (
                <>
                  <View style={styles.dot} />
                  <Text style={styles.gameName}>{clip.game_name}</Text>
                </>
              )}
              <View style={styles.dot} />
              <Text style={styles.timeAgo}>{timeAgo(clip.created_at)}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={handleFavorite} hitSlop={8} style={styles.actionBtn}>
              <Bookmark
                size={18}
                color={clip.is_favorited ? Colors.dark.warning : Colors.dark.textMuted}
                fill={clip.is_favorited ? Colors.dark.warning : 'none'}
              />
            </Pressable>
            <View style={styles.actionBtn}>
              <MessageSquare size={16} color={Colors.dark.textMuted} />
              <Text style={styles.commentCount}>{clip.comment_count}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  thumbnailContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    backgroundColor: Colors.dark.surfaceLight,
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  viewsBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: Colors.dark.live,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
  },
  voteColumn: {
    alignItems: 'center',
    gap: 2,
  },
  voteCount: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  voteCountUp: {
    color: Colors.dark.upvote,
  },
  voteCountDown: {
    color: Colors.dark.downvote,
  },
  info: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  streamerName: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  gameName: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
  },
  timeAgo: {
    color: Colors.dark.textMuted,
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.dark.textMuted,
  },
  actions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 2,
  },
  commentCount: {
    color: Colors.dark.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
});
