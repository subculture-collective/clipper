import React, { useCallback, useRef, useState } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { LoadingState } from '@/components/EmptyState';
import { clipsApi } from '@/lib/api';
import { formatNumber, formatDuration, timeAgo } from '@/lib/formatters';
import type { Comment } from '@/types';

function CommentItem({ comment, depth = 0 }: { comment: Comment; depth?: number }) {
  return (
    <View style={[styles.commentItem, { marginLeft: depth * 16 }]}>
      {comment.user?.avatar_url && (
        <Image source={{ uri: comment.user.avatar_url }} style={styles.commentAvatar} />
      )}
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>{comment.user?.display_name ?? 'Unknown'}</Text>
          <Text style={styles.commentTime}>{timeAgo(comment.created_at)}</Text>
        </View>
        <Text style={styles.commentText}>{comment.content}</Text>
        <View style={styles.commentActions}>
          <View style={styles.commentVoteBtn}>
            <ChevronUp size={14} color={Colors.dark.textMuted} />
            <Text style={styles.commentVotes}>{comment.vote_score}</Text>
          </View>
          {comment.reply_count > 0 && (
            <Text style={styles.replyCount}>{comment.reply_count} replies</Text>
          )}
        </View>
        {comment.replies?.map(reply => (
          <CommentItem key={reply.id} comment={reply} depth={1} />
        ))}
      </View>
    </View>
  );
}

export default function ClipDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const upvoteScale = useRef(new Animated.Value(1)).current;
  const downvoteScale = useRef(new Animated.Value(1)).current;

  const { data: clip, isLoading } = useQuery({
    queryKey: ['clip', id],
    queryFn: () => clipsApi.getById(id ?? ''),
    enabled: !!id,
  });

  const { data: commentsData } = useQuery({
    queryKey: ['clip-comments', id],
    queryFn: () => clipsApi.getComments(id ?? ''),
    enabled: !!id,
  });

  const voteMutation = useMutation({
    mutationFn: (direction: 'up' | 'down') => clipsApi.vote(id!, direction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clip', id] });
      queryClient.invalidateQueries({ queryKey: ['clips'] });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: () => clip?.is_favorited ? clipsApi.unfavorite(id!) : clipsApi.favorite(id!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clip', id] }),
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => clipsApi.createComment(id!, content),
    onSuccess: () => {
      setCommentText('');
      queryClient.invalidateQueries({ queryKey: ['clip-comments', id] });
    },
  });

  const handleVote = useCallback((direction: 'up' | 'down') => {
    if (!clip) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const scale = direction === 'up' ? upvoteScale : downvoteScale;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 80 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 80 }),
    ]).start();
    voteMutation.mutate(direction);
  }, [clip, voteMutation, upvoteScale, downvoteScale]);

  const handleBookmark = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    favoriteMutation.mutate();
  }, [favoriteMutation]);

  const handleSendComment = useCallback(() => {
    const trimmed = commentText.trim();
    if (trimmed) commentMutation.mutate(trimmed);
  }, [commentText, commentMutation]);

  if (isLoading) return <LoadingState />;

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

  const comments = commentsData?.data ?? [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <Stack.Screen
        options={{
          title: clip.streamer?.display_name ?? clip.broadcaster_name,
          headerStyle: { backgroundColor: Colors.dark.background },
          headerTintColor: Colors.dark.text,
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.videoContainer}>
          {clip.thumbnail_url && (
            <Image source={{ uri: clip.thumbnail_url }} style={styles.videoThumb} contentFit="cover" />
          )}
          <View style={styles.videoOverlay}>
            <Pressable style={styles.bigPlayBtn}>
              <Play size={32} color="#fff" fill="#fff" />
            </Pressable>
          </View>
          {clip.duration != null && (
            <View style={styles.durationBadge}>
              <Clock size={10} color="#fff" />
              <Text style={styles.durationText}>{formatDuration(clip.duration)}</Text>
            </View>
          )}
        </View>

        <View style={styles.clipInfo}>
          <Text style={styles.clipTitle}>{clip.title}</Text>

          <View style={styles.metaRow}>
            <Pressable
              style={styles.streamerInfo}
              onPress={() => clip.streamer && router.push(`/profile/${clip.streamer.id}` as any)}
            >
              {clip.streamer?.avatar_url && (
                <Image source={{ uri: clip.streamer.avatar_url }} style={styles.streamerAvatar} />
              )}
              <View>
                <Text style={styles.streamerName}>
                  {clip.streamer?.display_name ?? clip.broadcaster_name}
                </Text>
                {clip.game_name && <Text style={styles.gameName}>{clip.game_name}</Text>}
              </View>
              {clip.streamer?.is_live && (
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
              <Text style={styles.statText}>{formatNumber(clip.view_count)} views</Text>
            </View>
            <Text style={styles.statDot}>·</Text>
            <Text style={styles.statText}>{timeAgo(clip.created_at)}</Text>
          </View>

          <View style={styles.actionsBar}>
            <View style={styles.voteBar}>
              <Pressable onPress={() => handleVote('up')} style={styles.voteBtn}>
                <Animated.View style={{ transform: [{ scale: upvoteScale }] }}>
                  <ArrowBigUp
                    size={24}
                    color={clip.user_vote === 'up' ? Colors.dark.upvote : Colors.dark.textSecondary}
                    fill={clip.user_vote === 'up' ? Colors.dark.upvote : 'none'}
                  />
                </Animated.View>
              </Pressable>
              <Text style={[
                styles.voteCount,
                clip.user_vote === 'up' && { color: Colors.dark.upvote },
                clip.user_vote === 'down' && { color: Colors.dark.downvote },
              ]}>
                {formatNumber(clip.vote_score)}
              </Text>
              <Pressable onPress={() => handleVote('down')} style={styles.voteBtn}>
                <Animated.View style={{ transform: [{ scale: downvoteScale }] }}>
                  <ArrowBigDown
                    size={24}
                    color={clip.user_vote === 'down' ? Colors.dark.downvote : Colors.dark.textSecondary}
                    fill={clip.user_vote === 'down' ? Colors.dark.downvote : 'none'}
                  />
                </Animated.View>
              </Pressable>
            </View>

            <View style={styles.actionButtons}>
              <Pressable onPress={handleBookmark} style={styles.actionBtn}>
                <Bookmark
                  size={20}
                  color={clip.is_favorited ? Colors.dark.warning : Colors.dark.textSecondary}
                  fill={clip.is_favorited ? Colors.dark.warning : 'none'}
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
            <Text style={styles.commentsTitle}>Comments ({clip.comment_count})</Text>
          </View>
          {comments.map(comment => (
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
        />
        <Pressable
          style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
          disabled={!commentText.trim()}
          onPress={handleSendComment}
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
    fontWeight: '600',
  },
  backBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.dark.accent,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
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
    fontWeight: '600',
  },
  clipInfo: {
    padding: 16,
    gap: 12,
  },
  clipTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '800',
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
    fontWeight: '800',
    minWidth: 36,
    textAlign: 'center',
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
    fontWeight: '500',
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '600',
  },
  replyCount: {
    color: Colors.dark.textMuted,
    fontSize: 12,
    fontWeight: '600',
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
