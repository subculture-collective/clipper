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

// Mock data for development
const MOCK_COMMENTS: Comment[] = Array.from({ length: 20 }, (_, i) => ({
  id: `comment-${i + 1}`,
  clip_id: 'clip-1',
  user_id: `user-${i % 5}`,
  username: `User${i % 5}`,
  user_avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=User${i % 5}`,
  user_karma: Math.floor(Math.random() * 10000),
  user_role: i === 0 ? 'admin' : i === 1 ? 'moderator' : 'user',
  parent_id: i > 5 && i % 3 === 0 ? `comment-${Math.floor(i / 2)}` : null,
  content: `This is comment #${i + 1}. This is some **markdown** content with *formatting* and [links](https://example.com).`,
  vote_score: Math.floor(Math.random() * 100) - 20,
  created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  is_deleted: false,
  is_removed: false,
  depth: i > 5 && i % 3 === 0 ? 1 : 0,
  child_count: i < 10 ? Math.floor(Math.random() * 3) : 0,
  user_vote: i % 4 === 0 ? 1 : i % 7 === 0 ? -1 : null,
  replies: [],
}));

const ITEMS_PER_PAGE = 10;

// Build nested comment tree
const buildCommentTree = (comments: Comment[]): Comment[] => {
  const commentMap = new Map<string, Comment>();
  const rootComments: Comment[] = [];

  // First pass: create map of all comments
  comments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  // Second pass: build tree structure
  comments.forEach((comment) => {
    const commentNode = commentMap.get(comment.id);
    if (!commentNode) return;

    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(commentNode);
      }
    } else {
      rootComments.push(commentNode);
    }
  });

  return rootComments;
};

// Fetch comments for a clip
const fetchComments = async ({
  clipId,
  sort = 'best',
  pageParam = 1,
}: {
  clipId: string;
  sort?: CommentSortOption;
  pageParam?: number;
}): Promise<CommentFeedResponse> => {
  // TODO: Replace with real API call
  // const response = await apiClient.get(`/clips/${clipId}/comments`, {
  //   params: {
  //     sort,
  //     page: pageParam,
  //     limit: ITEMS_PER_PAGE,
  //   },
  // });
  // return response.data;

  // Mock implementation with delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  const filteredComments = MOCK_COMMENTS.filter((c) => c.clip_id === clipId);
  
  // Sort comments
  const sortedComments = [...filteredComments];
  switch (sort) {
    case 'new':
      sortedComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      break;
    case 'old':
      sortedComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      break;
    case 'controversial':
      sortedComments.sort((a, b) => Math.abs(b.vote_score) - Math.abs(a.vote_score));
      break;
    case 'best':
    default:
      sortedComments.sort((a, b) => b.vote_score - a.vote_score);
      break;
  }

  const start = (pageParam - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const paginatedComments = sortedComments.slice(start, end);

  return {
    comments: buildCommentTree(paginatedComments),
    total: filteredComments.length,
    page: pageParam,
    limit: ITEMS_PER_PAGE,
    has_more: end < filteredComments.length,
  };
};

// Hook to fetch comments with infinite scroll
export const useComments = (clipId: string, sort: CommentSortOption = 'best') => {
  return useInfiniteQuery({
    queryKey: ['comments', clipId, sort],
    queryFn: ({ pageParam = 1 }) => fetchComments({ clipId, sort, pageParam }),
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
      // TODO: Replace with real API call
      // const response = await apiClient.post('/comments', payload);
      // return response.data;

      // Mock implementation
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        clip_id: payload.clip_id,
        user_id: 'current-user',
        username: 'CurrentUser',
        user_avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CurrentUser',
        user_karma: 1234,
        user_role: 'user',
        parent_id: payload.parent_id || null,
        content: payload.content,
        vote_score: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: false,
        is_removed: false,
        depth: payload.parent_id ? 1 : 0,
        child_count: 0,
        user_vote: 1,
        replies: [],
      };

      return newComment;
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
      // TODO: Replace with real API call
      // const response = await apiClient.put(`/comments/${commentId}`, payload);
      // return response.data;

      // Mock implementation
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { ...payload, id: commentId };
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
      // TODO: Replace with real API call
      // const response = await apiClient.delete(`/comments/${commentId}`);
      // return response.data;

      // Mock implementation
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { id: commentId };
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
      // TODO: Replace with real API call
      // const response = await apiClient.post('/comments/vote', payload);
      // return response.data;

      // Mock implementation
      await new Promise((resolve) => setTimeout(resolve, 200));
      return payload;
    },
    onMutate: async (variables) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['comments'] });

      // Snapshot previous values
      const previousComments = queryClient.getQueriesData({ queryKey: ['comments'] });

      // Optimistically update comment vote
      queryClient.setQueriesData({ queryKey: ['comments'] }, (old: unknown) => {
        if (!old) return old;

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
        if (old.pages) {
          return {
            ...old,
            pages: old.pages.map((page: CommentFeedResponse) => ({
              ...page,
              comments: page.comments.map(updateComment),
            })),
          };
        } else if (old.comments) {
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
      // TODO: Replace with real API call
      // const response = await apiClient.post('/comments/report', payload);
      // return response.data;

      // Mock implementation
      await new Promise((resolve) => setTimeout(resolve, 500));
      return payload;
    },
  });
};
