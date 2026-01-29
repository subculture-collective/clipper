import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Lock, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Container, SEO } from '@/components';
import { Avatar } from '@/components/ui';
import { ReplyTree, ReplyComposer } from '@/components/forum';
import { forumApi } from '@/lib/forum-api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { formatTimestamp } from '@/lib/utils';

export function ThreadDetail() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showMobileComposer, setShowMobileComposer] = useState(false);

  // Handle mobile drawer keyboard and scroll
  useEffect(() => {
    if (showMobileComposer) {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setShowMobileComposer(false);
        }
      };

      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [showMobileComposer]);

  // Fetch thread with replies
  const { data, isLoading, error } = useQuery({
    queryKey: ['forum-thread', threadId],
    queryFn: () => forumApi.getThread(threadId!),
    enabled: !!threadId,
  });

  // Create reply mutation
  const createReplyMutation = useMutation({
    mutationFn: (content: string) =>
      forumApi.createReply(threadId!, {
        content,
        parent_reply_id: replyingTo || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-thread', threadId] });
      setReplyingTo(null);
      setShowMobileComposer(false);
      showToast('Reply posted successfully', 'success');
    },
    onError: () => {
      showToast('Failed to post reply', 'error');
    },
  });

  // Update reply mutation
  const updateReplyMutation = useMutation({
    mutationFn: ({ replyId, content }: { replyId: string; content: string }) =>
      forumApi.updateReply(replyId, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-thread', threadId] });
      showToast('Reply updated successfully', 'success');
    },
    onError: () => {
      showToast('Failed to update reply', 'error');
    },
  });

  // Delete reply mutation
  const deleteReplyMutation = useMutation({
    mutationFn: (replyId: string) => forumApi.deleteReply(replyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-thread', threadId] });
      showToast('Reply deleted successfully', 'success');
    },
    onError: () => {
      showToast('Failed to delete reply', 'error');
    },
  });

  const handleReply = (replyId: string | null = null) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setReplyingTo(replyId);
    if (isMobile) {
      setShowMobileComposer(true);
    }
  };

  const handleSubmitReply = async (content: string) => {
    await createReplyMutation.mutateAsync(content);
  };

  const handleEditReply = (replyId: string, content: string) => {
    updateReplyMutation.mutate({ replyId, content });
  };

  const handleDeleteReply = (replyId: string) => {
    deleteReplyMutation.mutate(replyId);
  };

  if (isLoading) {
    return (
      <Container className="py-6">
        <div className="max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-700 rounded w-1/2" />
            <div className="h-32 bg-gray-700 rounded" />
          </div>
        </div>
      </Container>
    );
  }

  if (error || !data) {
    return (
      <Container className="py-6">
        <div className="max-w-3xl mx-auto">
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-red-400">Failed to load thread</p>
          </div>
        </div>
      </Container>
    );
  }

  const { thread, replies } = data;
  const timestamp = formatTimestamp(thread.created_at);

  return (
    <>
      <SEO title={thread.title} description={thread.content.substring(0, 160)} />
      <Container className="py-6">
        <div className="max-w-3xl mx-auto">
          {/* Back button */}
          <Link
            to="/forum"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Forum</span>
          </Link>

          {/* Thread Header */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-6 mb-6">
            {/* Status badges */}
            <div className="flex items-center gap-2 mb-3">
              {thread.pinned && (
                <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-semibold rounded">
                  Pinned
                </span>
              )}
              {thread.locked && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-600 text-gray-300 text-xs font-semibold rounded">
                  <Lock className="w-3 h-3" />
                  Locked
                </span>
              )}
            </div>

            <h1 className="text-3xl font-bold text-white mb-4">{thread.title}</h1>

            {/* Author info */}
            <div className="flex items-center gap-3 mb-4">
              <Avatar
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${thread.username}`}
                alt={thread.username}
                size="md"
              />
              <div>
                <p className="font-semibold text-white">{thread.username}</p>
                <p className="text-sm text-gray-500" title={timestamp.title}>
                  {timestamp.display}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="prose prose-invert prose-sm max-w-none mb-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {thread.content}
              </ReactMarkdown>
            </div>

            {/* Tags */}
            {thread.tags && thread.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {thread.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-gray-400 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                <span>{thread.reply_count} replies</span>
              </div>
              <div>
                <span>{thread.view_count} views</span>
              </div>
            </div>
          </div>

          {/* Reply to thread button */}
          {user && !thread.locked && (
            <div className="mb-6">
              <button
                onClick={() => handleReply(null)}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Reply to Thread
              </button>
            </div>
          )}

          {/* Reply composer (desktop) */}
          {!isMobile && replyingTo !== null && user && !thread.locked && (
            <div className="mb-6">
              <ReplyComposer
                onSubmit={handleSubmitReply}
                onCancel={() => setReplyingTo(null)}
              />
            </div>
          )}

          {/* Replies */}
          {replies && replies.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Replies ({thread.reply_count})
              </h2>
              <ReplyTree
                replies={replies}
                threadId={threadId!}
                currentUserId={user?.id}
                onReply={handleReply}
                onEdit={handleEditReply}
                onDelete={handleDeleteReply}
              />
            </div>
          )}

          {/* Empty state */}
          {(!replies || replies.length === 0) && (
            <div className="text-center py-12 bg-gray-900 rounded-lg border border-gray-700">
              <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-lg mb-2">No replies yet</p>
              <p className="text-gray-500 text-sm">
                Be the first to respond to this thread!
              </p>
            </div>
          )}

          {/* Locked message */}
          {thread.locked && (
            <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg text-center">
              <Lock className="w-6 h-6 text-gray-500 mx-auto mb-2" />
              <p className="text-gray-400">This thread is locked and cannot receive new replies.</p>
            </div>
          )}
        </div>
      </Container>

      {/* Mobile reply composer drawer */}
      {isMobile && showMobileComposer && user && !thread.locked && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          onClick={() => setShowMobileComposer(false)}
        >
          <div
            className="bg-gray-900 w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <ReplyComposer
              onSubmit={handleSubmitReply}
              onCancel={() => setShowMobileComposer(false)}
              isMobile={true}
            />
          </div>
        </div>
      )}
    </>
  );
}
