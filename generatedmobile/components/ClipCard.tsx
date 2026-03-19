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
import { Clip } from '@/types/clip';

interface ClipCardProps {
  clip: Clip;
  onVote: (clipId: string, direction: 'up' | 'down') => void;
  onBookmark: (clipId: string) => void;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default React.memo(function ClipCard({ clip, onVote, onBookmark }: ClipCardProps) {
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

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onBookmark(clip.id);
  }, [clip.id, onBookmark]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={`clip-card-${clip.id}`}
      >
        <View style={styles.thumbnailContainer}>
          <Image
            source={{ uri: clip.thumbnailUrl }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
          />
          <View style={styles.thumbnailOverlay}>
            <View style={styles.playButton}>
              <Play size={20} color="#fff" fill="#fff" />
            </View>
          </View>
          <View style={styles.durationBadge}>
            <Clock size={10} color="#fff" />
            <Text style={styles.durationText}>{formatDuration(clip.duration)}</Text>
          </View>
          <View style={styles.viewsBadge}>
            <Eye size={10} color="#fff" />
            <Text style={styles.viewsText}>{formatNumber(clip.viewCount)}</Text>
          </View>
          {clip.streamer.isLive && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <View style={styles.voteColumn}>
            <Pressable onPress={() => handleVote('up')} hitSlop={8} testID={`upvote-${clip.id}`}>
              <ArrowBigUp
                size={22}
                color={clip.userVote === 'up' ? Colors.dark.upvote : Colors.dark.textMuted}
                fill={clip.userVote === 'up' ? Colors.dark.upvote : 'none'}
              />
            </Pressable>
            <Text style={[
              styles.voteCount,
              clip.userVote === 'up' && styles.voteCountUp,
              clip.userVote === 'down' && styles.voteCountDown,
            ]}>
              {formatNumber(clip.votes)}
            </Text>
            <Pressable onPress={() => handleVote('down')} hitSlop={8} testID={`downvote-${clip.id}`}>
              <ArrowBigDown
                size={22}
                color={clip.userVote === 'down' ? Colors.dark.downvote : Colors.dark.textMuted}
                fill={clip.userVote === 'down' ? Colors.dark.downvote : 'none'}
              />
            </Pressable>
          </View>

          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={2}>{clip.title}</Text>
            <View style={styles.meta}>
              <Image source={{ uri: clip.streamer.avatarUrl }} style={styles.avatar} />
              <Text style={styles.streamerName}>{clip.streamer.displayName}</Text>
              <View style={styles.dot} />
              <Text style={styles.gameName}>{clip.game.name}</Text>
              <View style={styles.dot} />
              <Text style={styles.timeAgo}>{timeAgo(clip.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable onPress={handleBookmark} hitSlop={8} style={styles.actionBtn}>
              <Bookmark
                size={18}
                color={clip.isBookmarked ? Colors.dark.warning : Colors.dark.textMuted}
                fill={clip.isBookmarked ? Colors.dark.warning : 'none'}
              />
            </Pressable>
            <Pressable style={styles.actionBtn}>
              <MessageSquare size={16} color={Colors.dark.textMuted} />
              <Text style={styles.commentCount}>{clip.commentCount}</Text>
            </Pressable>
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '800' as const,
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
    fontWeight: '700' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
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
    fontWeight: '600' as const,
  },
});
