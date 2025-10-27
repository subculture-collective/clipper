import { useInfiniteQuery, useMutation, useQueryClient, } from '@tanstack/react-query';
import * as commentApi from '@/lib/comment-api';
const ITEMS_PER_PAGE = 10;
// Hook to fetch comments with infinite scroll
export const useComments = (clipId, sort = 'best') => {
    return useInfiniteQuery({
        queryKey: ['comments', clipId, sort],
        queryFn: ({ pageParam = 1 }) => commentApi.fetchComments({
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
        mutationFn: async (payload) => {
            return commentApi.createComment(payload);
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
        mutationFn: async ({ commentId, payload, }) => {
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
        mutationFn: async (commentId) => {
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
        mutationFn: async (payload) => {
            return commentApi.voteOnComment(payload);
        },
        onMutate: async (variables) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: ['comments'] });
            // Snapshot previous values
            const previousComments = queryClient.getQueriesData({ queryKey: ['comments'] });
            // Optimistically update comment vote
            queryClient.setQueriesData({ queryKey: ['comments'] }, (old) => {
                if (!old || typeof old !== 'object')
                    return old;
                const updateComment = (comment) => {
                    if (comment.id === variables.comment_id) {
                        const currentVote = comment.user_vote;
                        let newScore = comment.vote_score;
                        let newVote = variables.vote_type;
                        // Calculate new score
                        if (currentVote === variables.vote_type) {
                            // Remove vote
                            newScore -= variables.vote_type;
                            newVote = null;
                        }
                        else if (currentVote) {
                            // Change vote
                            newScore = newScore - currentVote + variables.vote_type;
                        }
                        else {
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
                        pages: old.pages.map((page) => ({
                            ...page,
                            comments: page.comments.map(updateComment),
                        })),
                    };
                }
                else if ('comments' in old && Array.isArray(old.comments)) {
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
        mutationFn: async (payload) => {
            return commentApi.reportComment(payload);
        },
    });
};
