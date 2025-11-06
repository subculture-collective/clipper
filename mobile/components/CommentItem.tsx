import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
} from 'react-native';
import { Comment } from '@/services/comments';
import { VoteButtons } from './VoteButtons';
import { CommentComposer } from './CommentComposer';

interface CommentItemProps {
    comment: Comment;
    depth?: number;
    onVote: (commentId: string, vote: 1 | -1 | 0) => void;
    onReply: (parentId: string, content: string) => void;
    onEdit?: (commentId: string, content: string) => void;
    onDelete?: (commentId: string) => void;
    onToggleReplies?: (commentId: string) => void;
    isVoting?: boolean;
    isReplying?: boolean;
    showReplies?: boolean;
    currentUserId?: string;
    maxDepth?: number;
}

export function CommentItem({
    comment,
    depth = 0,
    onVote,
    onReply,
    onEdit,
    onDelete,
    onToggleReplies,
    isVoting = false,
    isReplying = false,
    showReplies = false,
    currentUserId,
    maxDepth = 5,
}: CommentItemProps) {
    const [showReplyComposer, setShowReplyComposer] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const isOwnComment = currentUserId === comment.user_id;
    const canReply = depth < maxDepth;
    const hasReplies = (comment.reply_count ?? 0) > 0;

    // Calculate indentation
    const marginLeft = depth * 16;

    const handleUpvote = () => {
        const newVote = comment.user_vote === 1 ? 0 : 1;
        onVote(comment.id, newVote);
    };

    const handleDownvote = () => {
        const newVote = comment.user_vote === -1 ? 0 : -1;
        onVote(comment.id, newVote);
    };

    const handleReplySubmit = (content: string) => {
        onReply(comment.id, content);
        setShowReplyComposer(false);
    };

    const handleEditSubmit = (content: string) => {
        onEdit?.(comment.id, content);
        setIsEditing(false);
    };

    const formatTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (seconds < 60) return 'just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    };

    if (comment.is_removed) {
        return (
            <View
                style={{ marginLeft }}
                className="py-3 border-l-2 border-gray-200 pl-3"
            >
                <Text className="text-sm text-gray-500 italic">
                    [removed]
                    {comment.removed_reason && ` - ${comment.removed_reason}`}
                </Text>
            </View>
        );
    }

    return (
        <View
            style={{ marginLeft }}
            className={`py-3 ${depth > 0 ? 'border-l-2 border-gray-200 pl-3' : ''}`}
        >
            {/* Comment Header */}
            <View className="flex-row items-center mb-2">
                <Text className="font-semibold text-sm text-gray-900">
                    {comment.user.username}
                </Text>
                <Text className="text-xs text-gray-500 ml-2">
                    {formatTimeAgo(comment.created_at)}
                </Text>
                {comment.is_edited && (
                    <Text className="text-xs text-gray-500 ml-2">(edited)</Text>
                )}
            </View>

            {/* Comment Content */}
            {isEditing ? (
                <View className="mb-2">
                    <CommentComposer
                        onSubmit={handleEditSubmit}
                        onCancel={() => setIsEditing(false)}
                        placeholder="Edit your comment..."
                        initialValue={comment.content}
                        autoFocus
                        showCancel
                    />
                </View>
            ) : (
                <Text className="text-base text-gray-800 mb-3 leading-5">
                    {comment.content}
                </Text>
            )}

            {/* Actions Row */}
            <View className="flex-row items-center gap-4">
                <VoteButtons
                    voteScore={comment.vote_score}
                    userVote={comment.user_vote}
                    onUpvote={handleUpvote}
                    onDownvote={handleDownvote}
                    isLoading={isVoting}
                    size="small"
                />

                {canReply && (
                    <TouchableOpacity
                        onPress={() => setShowReplyComposer(!showReplyComposer)}
                        className="py-1 px-2 rounded active:bg-gray-100"
                    >
                        <Text className="text-sm font-semibold text-gray-600">
                            Reply
                        </Text>
                    </TouchableOpacity>
                )}

                {hasReplies && onToggleReplies && (
                    <TouchableOpacity
                        onPress={() => onToggleReplies(comment.id)}
                        className="py-1 px-2 rounded active:bg-gray-100"
                    >
                        <Text className="text-sm font-semibold text-primary-600">
                            {showReplies ? '▼' : '▶'} {comment.reply_count}{' '}
                            {comment.reply_count === 1 ? 'reply' : 'replies'}
                        </Text>
                    </TouchableOpacity>
                )}

                {isOwnComment && !isEditing && (
                    <TouchableOpacity
                        onPress={() => setShowActions(!showActions)}
                        className="py-1 px-2 rounded active:bg-gray-100"
                    >
                        <Text className="text-sm font-semibold text-gray-600">
                            •••
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Own Comment Actions */}
            {isOwnComment && showActions && !isEditing && (
                <View className="flex-row gap-2 mt-2">
                    <TouchableOpacity
                        onPress={() => {
                            setIsEditing(true);
                            setShowActions(false);
                        }}
                        className="py-1 px-3 bg-gray-100 rounded active:bg-gray-200"
                    >
                        <Text className="text-sm font-semibold text-gray-700">
                            Edit
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            onDelete?.(comment.id);
                            setShowActions(false);
                        }}
                        className="py-1 px-3 bg-red-50 rounded active:bg-red-100"
                    >
                        <Text className="text-sm font-semibold text-red-600">
                            Delete
                        </Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Reply Composer */}
            {showReplyComposer && (
                <View className="mt-3">
                    <CommentComposer
                        onSubmit={handleReplySubmit}
                        onCancel={() => setShowReplyComposer(false)}
                        isLoading={isReplying}
                        placeholder={`Reply to ${comment.user.username}...`}
                        autoFocus
                        showCancel
                    />
                </View>
            )}
        </View>
    );
}
