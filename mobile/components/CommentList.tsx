import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Alert,
} from 'react-native';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    listComments,
    createComment,
    voteOnComment,
    updateComment,
    deleteComment,
    Comment,
} from '@/services/comments';
import { CommentItem } from './CommentItem';
import { CommentComposer } from './CommentComposer';

interface CommentListProps {
    clipId: string;
    currentUserId?: string;
}

type SortOption = 'best' | 'new' | 'top';

export function CommentList({ clipId, currentUserId }: CommentListProps) {
    const [sortBy, setSortBy] = useState<SortOption>('best');
    const [expandedComments, setExpandedComments] = useState<Set<string>>(
        new Set()
    );
    const [votingComments, setVotingComments] = useState<Set<string>>(
        new Set()
    );

    const queryClient = useQueryClient();

    // Query for top-level comments
    const {
        data: commentsData,
        isLoading,
        isError,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery({
        queryKey: ['comments', clipId, sortBy],
        queryFn: async ({ pageParam = 0 }) => {
            const result = await listComments(clipId, {
                sort: sortBy,
                cursor: pageParam,
            });
            return result;
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
            return lastPage.has_more ? lastPage.next_cursor : undefined;
        },
    });

    // Mutation for creating comments
    const createCommentMutation = useMutation({
        mutationFn: ({
            content,
            parentId,
        }: {
            content: string;
            parentId?: string;
        }) => createComment(clipId, { content, parent_comment_id: parentId }),
        onMutate: async ({ content, parentId }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({
                queryKey: ['comments', clipId, sortBy],
            });

            // Snapshot previous value
            const previousComments = queryClient.getQueryData([
                'comments',
                clipId,
                sortBy,
            ]);

            // Optimistically update with temporary comment
            const tempComment: Comment = {
                id: `temp-${Date.now()}`,
                clip_id: clipId,
                user_id: currentUserId || '',
                user: {
                    id: currentUserId || '',
                    username: 'You',
                },
                parent_comment_id: parentId,
                content,
                vote_score: 0,
                user_vote: null,
                reply_count: 0,
                is_edited: false,
                is_removed: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // Add optimistic comment to the list
            queryClient.setQueryData(['comments', clipId, sortBy], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: [
                        {
                            ...old.pages[0],
                            comments: [tempComment, ...old.pages[0].comments],
                        },
                        ...old.pages.slice(1),
                    ],
                };
            });

            return { previousComments };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousComments) {
                queryClient.setQueryData(
                    ['comments', clipId, sortBy],
                    context.previousComments
                );
            }
        },
        onSuccess: () => {
            // Refetch to get the real comment with ID
            queryClient.invalidateQueries({
                queryKey: ['comments', clipId, sortBy],
            });
        },
    });

    // Mutation for voting
    const voteMutation = useMutation({
        mutationFn: ({
            commentId,
            vote,
        }: {
            commentId: string;
            vote: 1 | -1 | 0;
        }) => voteOnComment(commentId, vote),
        onMutate: async ({ commentId, vote }) => {
            setVotingComments((prev) => new Set(prev).add(commentId));

            // Cancel outgoing refetches
            await queryClient.cancelQueries({
                queryKey: ['comments', clipId, sortBy],
            });

            const previousComments = queryClient.getQueryData([
                'comments',
                clipId,
                sortBy,
            ]);

            // Optimistically update vote
            queryClient.setQueryData(['comments', clipId, sortBy], (old: any) => {
                if (!old) return old;

                const updateComment = (comment: Comment): Comment => {
                    if (comment.id !== commentId) return comment;

                    const oldVote = comment.user_vote || 0;
                    const scoreDiff = vote - oldVote;

                    return {
                        ...comment,
                        vote_score: comment.vote_score + scoreDiff,
                        user_vote: vote === 0 ? null : vote,
                    };
                };

                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        comments: page.comments.map(updateComment),
                    })),
                };
            });

            return { previousComments };
        },
        onError: (err, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(
                    ['comments', clipId, sortBy],
                    context.previousComments
                );
            }
        },
        onSettled: (data, error, variables) => {
            setVotingComments((prev) => {
                const next = new Set(prev);
                next.delete(variables.commentId);
                return next;
            });
        },
    });

    // Mutation for updating comments
    const updateCommentMutation = useMutation({
        mutationFn: ({
            commentId,
            content,
        }: {
            commentId: string;
            content: string;
        }) => updateComment(commentId, { content }),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['comments', clipId, sortBy],
            });
        },
    });

    // Mutation for deleting comments
    const deleteCommentMutation = useMutation({
        mutationFn: (commentId: string) => deleteComment(commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ['comments', clipId, sortBy],
            });
        },
    });

    const handleToggleReplies = useCallback((commentId: string) => {
        setExpandedComments((prev) => {
            const next = new Set(prev);
            if (next.has(commentId)) {
                next.delete(commentId);
            } else {
                next.add(commentId);
            }
            return next;
        });
    }, []);

    const handleVote = useCallback(
        (commentId: string, vote: 1 | -1 | 0) => {
            voteMutation.mutate({ commentId, vote });
        },
        [voteMutation]
    );

    const handleReply = useCallback(
        (parentId: string, content: string) => {
            createCommentMutation.mutate({ content, parentId });
        },
        [createCommentMutation]
    );

    const handleEdit = useCallback(
        (commentId: string, content: string) => {
            updateCommentMutation.mutate({ commentId, content });
        },
        [updateCommentMutation]
    );

    const handleDelete = useCallback(
        (commentId: string) => {
            Alert.alert(
                'Delete Comment',
                'Are you sure you want to delete this comment?',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deleteCommentMutation.mutate(commentId),
                    },
                ]
            );
        },
        [deleteCommentMutation]
    );

    const handleCreateTopLevelComment = useCallback(
        (content: string) => {
            createCommentMutation.mutate({ content });
        },
        [createCommentMutation]
    );

    const allComments = commentsData?.pages.flatMap((page) => page.comments) || [];

    // Render nested comment tree
    const renderCommentTree = (
        comment: Comment,
        depth: number = 0
    ): React.ReactNode[] => {
        const nodes: React.ReactNode[] = [];

        nodes.push(
            <CommentItem
                key={comment.id}
                comment={comment}
                depth={depth}
                onVote={handleVote}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleReplies={handleToggleReplies}
                isVoting={votingComments.has(comment.id)}
                isReplying={createCommentMutation.isPending}
                showReplies={expandedComments.has(comment.id)}
                currentUserId={currentUserId}
            />
        );

        // Render replies if expanded
        if (expandedComments.has(comment.id)) {
            const replies = allComments.filter(
                (c) => c.parent_comment_id === comment.id
            );
            replies.forEach((reply) => {
                nodes.push(...renderCommentTree(reply, depth + 1));
            });
        }

        return nodes;
    };

    const topLevelComments = allComments.filter((c) => !c.parent_comment_id);

    if (isLoading) {
        return (
            <View className="flex-1 items-center justify-center py-8">
                <ActivityIndicator size="large" color="#0ea5e9" />
            </View>
        );
    }

    if (isError) {
        return (
            <View className="flex-1 items-center justify-center py-8">
                <Text className="text-red-600 mb-2">
                    Failed to load comments
                </Text>
                <TouchableOpacity
                    onPress={() => refetch()}
                    className="px-4 py-2 bg-primary-600 rounded-lg"
                >
                    <Text className="text-white font-semibold">Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View className="flex-1">
            {/* Sort Options */}
            <View className="flex-row border-b border-gray-200 mb-3">
                {(['best', 'new', 'top'] as SortOption[]).map((option) => (
                    <TouchableOpacity
                        key={option}
                        onPress={() => setSortBy(option)}
                        className={`px-4 py-2 ${
                            sortBy === option ? 'border-b-2 border-primary-600' : ''
                        }`}
                    >
                        <Text
                            className={`font-semibold capitalize ${
                                sortBy === option
                                    ? 'text-primary-600'
                                    : 'text-gray-600'
                            }`}
                        >
                            {option}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Comment Composer */}
            <CommentComposer
                onSubmit={handleCreateTopLevelComment}
                isLoading={createCommentMutation.isPending}
                placeholder="Write a comment..."
            />

            {/* Comments List */}
            {topLevelComments.length === 0 ? (
                <View className="items-center py-8">
                    <Text className="text-gray-500">
                        No comments yet. Be the first!
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={topLevelComments}
                    renderItem={({ item }) => (
                        <View key={item.id}>{renderCommentTree(item)}</View>
                    )}
                    keyExtractor={(item) => item.id}
                    refreshControl={
                        <RefreshControl
                            refreshing={false}
                            onRefresh={() => refetch()}
                        />
                    }
                    ListFooterComponent={
                        hasNextPage ? (
                            <View className="py-4">
                                {isFetchingNextPage ? (
                                    <ActivityIndicator
                                        size="small"
                                        color="#0ea5e9"
                                    />
                                ) : (
                                    <TouchableOpacity
                                        onPress={() => fetchNextPage()}
                                        className="py-2 px-4 bg-gray-100 rounded-lg self-center"
                                    >
                                        <Text className="font-semibold text-gray-700">
                                            Load More
                                        </Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        ) : null
                    }
                />
            )}
        </View>
    );
}
