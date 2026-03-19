import React, { useMemo, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Bookmark,
  Share2,
  Play,
  Eye,
  Clock,
  Send,
  ChevronUp,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useClips } from '@/providers/ClipProvider';
import { MOCK_COMMENTS } from '@/mocks/clips';
import { Comment } from '@/types/clip';

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

function CommentItem({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  return (
    <View style={[styles.commentItem, { marginLeft: depth * 16 }]}>
      <Image source={{ uri: comment.avatarUrl }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{comment.username}</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        <View style={styles.commentActions}>
          <Pressable style={styles.commentVoteBtn}>
            <ChevronUp size={14} color={Colors.dark.textMuted} />
            <Text style={styles.commentVotes}>{comment.votes}</Text>
          </Pressable>
          <Pressable>
            <Text style={styles.replyBtn}>Reply</Text>
          </Pressable>
        </View>
        {comment.replies.map(reply => (
          <CommentItem key={reply.id} comment={reply} depth={1} />
        ))}
      </View>
    </View>
  );
}

export default function ClipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getClipById, vote, toggleBookmark } = useClips();
  const [commentText, setCommentText] = useState<string>('');
  const upvoteScale = useRef(new Animated.Value(1)).current;
  const downvoteScale = useRef(new Animated.Value(1)).current;

  const clip = useMemo(() => getClipById(id ?? ''), [getClipById, id]);

  const handleVote = useCallback((direction: 'up' | 'down') => {
    if (!clip) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const scale = direction === 'up' ? upvoteScale : downvoteScale;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 80 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 80 }),
    ]).start();
    vote(clip.id, direction);
  }, [clip, vote, upvoteScale, downvoteScale]);

  const handleBookmark = useCallback(() => {
    if (!clip) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleBookmark(clip.id);
  }, [clip, toggleBookmark]);

  if (!clip) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Clip' }} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Clip not found</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: clip.streamer.displayName,
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.videoContainer}>
          <Image source={{ uri: clip.thumbnailUrl }} style={styles.videoThumb} contentFit="cover" />
          <View style={styles.videoOverlay}>
            <Pressable style={styles.bigPlayBtn}>
              <Play size={32} color="#fff" fill="#fff" />
            </Pressable>
          </View>
          <View style={styles.durationBadge}>
            <Clock size={10} color="#fff" />
            <Text style={styles.durationText}>{formatDuration(clip.duration)}</Text>
          </View>
        </View>

        <View style={styles.clipInfo}>
          <Text style={styles.clipTitle}>{clip.title}</Text>

          <View style={styles.metaRow}>
            <Pressable style={styles.streamerInfo}>
              <Image source={{ uri: clip.streamer.avatarUrl }} style={styles.streamerAvatar} />
              <View>
                <Text style={styles.streamerName}>{clip.streamer.displayName}</Text>
                <Text style={styles.gameName}>{clip.game.name}</Text>
              </View>
              {clip.streamer.isLive && (
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Eye size={14} color={Colors.dark.textMuted} />
              <Text style={styles.statText}>{formatNumber(clip.viewCount)} views</Text>
            </View>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statText}>{timeAgo(clip.createdAt)}</Text>
          </View>

          <View style={styles.actionsBar}>
            <View style={styles.voteBar}>
              <Pressable onPress={() => handleVote('up')} style={styles.voteBtn} testID="detail-upvote">
                <Animated.View style={{ transform: [{ scale: upvoteScale }] }}>
                  <ArrowBigUp
                    size={24}
                    color={clip.userVote === 'up' ? Colors.dark.upvote : Colors.dark.textSecondary}
                    fill={clip.userVote === 'up' ? Colors.dark.upvote : 'none'}
                  />
                </Animated.View>
              </Pressable>
              <Text style={[
                styles.voteCount,
                clip.userVote === 'up' && { color: Colors.dark.upvote },
                clip.userVote === 'down' && { color: Colors.dark.downvote },
              ]}>
                {formatNumber(clip.votes)}
              </Text>
              <Pressable onPress={() => handleVote('down')} style={styles.voteBtn} testID="detail-downvote">
                <Animated.View style={{ transform: [{ scale: downvoteScale }] }}>
                  <ArrowBigDown
                    size={24}
                    color={clip.userVote === 'down' ? Colors.dark.downvote : Colors.dark.textSecondary}
                    fill={clip.userVote === 'down' ? Colors.dark.downvote : 'none'}
                  />
                </Animated.View>
              </Pressable>
            </View>

            <View style={styles.actionButtons}>
              <Pressable onPress={handleBookmark} style={styles.actionBtn}>
                <Bookmark
                  size={20}
                  color={clip.isBookmarked ? Colors.dark.warning : Colors.dark.textSecondary}
                  fill={clip.isBookmarked ? Colors.dark.warning : 'none'}
                />
                <Text style={styles.actionLabel}>Save</Text>
              </Pressable>
              <Pressable style={styles.actionBtn}>
                <Share2 size={20} color={Colors.dark.textSecondary} />
                <Text style={styles.actionLabel}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <MessageSquare size={18} color={Colors.dark.accent} />
            <Text style={styles.commentsTitle}>Comments ({MOCK_COMMENTS.length})</Text>
          </View>
          {MOCK_COMMENTS.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.commentInputBar}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor={Colors.dark.textMuted}
          value={commentText}
          onChangeText={setCommentText}
          multiline
          testID="comment-input"
        />
        <Pressable
          style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
          disabled={!commentText.trim()}
        >
          <Send size={18} color={commentText.trim() ? Colors.dark.accent : Colors.dark.textMuted} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  notFound: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  notFoundText: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.dark.accent,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600' as const,
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    position: 'relative',
    backgroundColor: '#000',
  },
  videoThumb: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigPlayBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600' as const,
  },
  clipInfo: {
    padding: 16,
    gap: 12,
  },
  clipTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  streamerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.dark.accent,
  },
  streamerName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  gameName: {
    color: Colors.dark.accent,
    fontSize: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark.live,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
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
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    color: Colors.dark.textMuted,
    fontSize: 13,
  },
  statDot: {
    color: Colors.dark.textMuted,
    fontSize: 13,
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  voteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  voteBtn: {
    padding: 6,
  },
  voteCount: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '800' as const,
    minWidth: 36,
    textAlign: 'center' as const,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 2,
  },
  actionLabel: {
    color: Colors.dark.textSecondary,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  commentsSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  commentsTitle: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUsername: {
    color: Colors.dark.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  commentTime: {
    color: Colors.dark.textMuted,
    fontSize: 11,
  },
  commentText: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  commentVoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentVotes: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  replyBtn: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 16,
    backgroundColor: Colors.dark.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    gap: 10,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.dark.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: Colors.dark.text,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    padding: 10,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
