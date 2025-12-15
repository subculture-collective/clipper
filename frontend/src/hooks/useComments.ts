import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  Comment,
  CommentFeedResponse,
  CommentSortOption,
  CreateCommentPayload,
  UpdateCommentPayload,
  CommentVotePayload,
  ReportCommentPayload,
} from '@/types/comment';
import * as commentApi from '@/lib/comment-api';

const ITEMS_PER_PAGE = 10;

// Hook to fetch comments with infinite scroll
export const useComments = (clipId: string, sort: CommentSortOption = 'best') => {
  return useInfiniteQuery({
    queryKey: ['comments', clipId, sort],
    queryFn: ({ pageParam = 1 }) =>
      commentApi.fetchComments({
        clipId,
        sort,
        pageParam,
        limit: ITEMS_PER_PAGE,
      }),
    getNextPageParam: (lastPage) => {
      return lastPage.has_more ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
    enabled: !!clipId,
  });
};

// Hook to create a new comment
export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCommentPayload) => {
      return commentApi.createComment(payload);
    },
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['comments', variables.clip_id] });

      // Snapshot the previous value
      const previousComments = queryClient.getQueriesData({ 
        queryKey: ['comments', variables.clip_id] 
      });

      // Optimistically update by incrementing child_count on parent if this is a reply
      if (variables.parent_id) {
        queryClient.setQueriesData({ queryKey: ['comments', variables.clip_id] }, (old: unknown) => {
          if (!old || typeof old !== 'object') return old;

          const updateComment = (comment: Comment): Comment => {
            // If this is the parent comment, increment child_count
            if (comment.id === variables.parent_id) {
              return {
                ...comment,
                child_count: comment.child_count + 1,
              };
            }

            // Recursively update nested replies
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: comment.replies.map(updateComment),
              };
            }

            return comment;
          };

          // Handle paginated data structure
          if ('pages' in old && Array.isArray(old.pages)) {
            return {
              ...old,
              pages: old.pages.map((page: CommentFeedResponse) => ({
                ...page,
                comments: page.comments.map(updateComment),
              })),
            };
          } else if ('comments' in old && Array.isArray(old.comments)) {
            return {
              ...old,
              comments: old.comments.map(updateComment),
            };
          }

          return old;
        });
      }

      return { previousComments };
    },
    onError: (_err, variables, context) => {
      // Revert on error
      if (context?.previousComments) {
        context.previousComments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSuccess: (_data, variables) => {
      // Invalidate comments query to refetch
      queryClient.invalidateQueries({ queryKey: ['comments', variables.clip_id] });
    },
  });
};

// Hook to update a comment
export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      payload,
    }: {
      commentId: string;
      payload: UpdateCommentPayload;
    }) => {
      return commentApi.updateComment(commentId, payload);
    },
    onSuccess: () => {
      // Invalidate all comment queries
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
};

// Hook to delete a comment
export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      return commentApi.deleteComment(commentId);
    },
    onSuccess: () => {
      // Invalidate all comment queries
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
};

// Hook to vote on a comment
export const useCommentVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CommentVotePayload) => {
      return commentApi.voteOnComment(payload);
    },
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['comments'] });

      // Snapshot previous values
      const previousComments = queryClient.getQueriesData({ queryKey: ['comments'] });

      // Optimistically update comment vote
      queryClient.setQueriesData({ queryKey: ['comments'] }, (old: unknown) => {
        if (!old || typeof old !== 'object') return old;

        const updateComment = (comment: Comment): Comment => {
          if (comment.id === variables.comment_id) {
            const currentVote = comment.user_vote;
            let newScore = comment.vote_score;
            let newVote: 1 | -1 | null = variables.vote_type;

            // Calculate new score
            if (currentVote === variables.vote_type) {
              // Remove vote
              newScore -= variables.vote_type;
              newVote = null;
            } else if (currentVote) {
              // Change vote
              newScore = newScore - currentVote + variables.vote_type;
            } else {
              // New vote
              newScore += variables.vote_type;
            }

            return {
              ...comment,
              vote_score: newScore,
              user_vote: newVote,
            };
          }

          // Recursively update nested replies
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: comment.replies.map(updateComment),
            };
          }

          return comment;
        };

        // Handle both paginated and non-paginated data
        if ('pages' in old && Array.isArray(old.pages)) {
          return {
            ...old,
            pages: old.pages.map((page: CommentFeedResponse) => ({
              ...page,
              comments: page.comments.map(updateComment),
            })),
          };
        } else if ('comments' in old && Array.isArray(old.comments)) {
          return {
            ...old,
            comments: old.comments.map(updateComment),
          };
        }

        return old;
      });

      return { previousComments };
    },
    onError: (_err, _variables, context) => {
      // Revert on error
      if (context?.previousComments) {
        context.previousComments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
  });
};

// Hook to report a comment
export const useReportComment = () => {
  return useMutation({
    mutationFn: async (payload: ReportCommentPayload) => {
      return commentApi.reportComment(payload);
    },
  });
};
