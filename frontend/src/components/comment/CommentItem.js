import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, Badge } from '@/components/ui';
import { CommentVoteButtons } from './CommentVoteButtons';
import { CommentActions } from './CommentActions';
import { CommentForm } from './CommentForm';
export const CommentItem = ({ comment, clipId, currentUserId, isAdmin = false, depth = 0, maxDepth = 10, className, }) => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const [showReplyForm, setShowReplyForm] = React.useState(false);
    const [isEditing, setIsEditing] = React.useState(false);
    const isAuthor = currentUserId === comment.user_id;
    const hasReplies = comment.replies && comment.replies.length > 0;
    const shouldShowContinueThread = depth >= maxDepth && hasReplies;
    const handleReply = () => {
        setShowReplyForm(true);
        setIsCollapsed(false);
    };
    const handleEdit = () => {
        setIsEditing(true);
    };
    const handleCancelReply = () => {
        setShowReplyForm(false);
    };
    const handleCancelEdit = () => {
        setIsEditing(false);
    };
    const handleEditSuccess = () => {
        setIsEditing(false);
    };
    const handleReplySuccess = () => {
        setShowReplyForm(false);
    };
    // Render deleted/removed state
    if (comment.is_deleted || comment.is_removed) {
        return (_jsxs("div", { className: cn('flex gap-3', className), id: `comment-${comment.id}`, children: [_jsx("div", { className: "flex-shrink-0 w-12" }), " ", _jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "text-sm text-muted-foreground italic py-2", children: [comment.is_deleted ? '[deleted by user]' : '[removed by moderator]', comment.removed_reason && isAdmin && ` - ${comment.removed_reason}`] }), hasReplies && !isCollapsed && (_jsx("div", { className: "ml-4 space-y-4 border-l-2 border-border pl-4", children: comment.replies.map((reply) => (_jsx(CommentItem, { comment: reply, clipId: clipId, currentUserId: currentUserId, isAdmin: isAdmin, depth: depth + 1, maxDepth: maxDepth }, reply.id))) }))] })] }));
    }
    return (_jsxs("div", { className: cn('flex gap-3', className), id: `comment-${comment.id}`, children: [_jsx("div", { className: "flex-shrink-0", children: _jsx(CommentVoteButtons, { commentId: comment.id, score: comment.vote_score, userVote: comment.user_vote }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Avatar, { src: comment.user_avatar, alt: comment.username, size: "sm", className: "flex-shrink-0" }), _jsx("span", { className: "font-medium text-foreground", children: comment.username }), comment.user_role === 'admin' && (_jsx(Badge, { variant: "error", size: "sm", children: "Admin" })), comment.user_role === 'moderator' && (_jsx(Badge, { variant: "primary", size: "sm", children: "Mod" })), comment.user_karma !== undefined && (_jsxs("span", { className: "text-xs text-muted-foreground", children: [comment.user_karma.toLocaleString(), " karma"] })), _jsx("span", { className: "text-xs text-muted-foreground", children: "\u2022" }), _jsx("button", { onClick: () => setIsCollapsed(!isCollapsed), className: "text-xs text-muted-foreground hover:text-foreground transition-colors", title: isCollapsed ? 'Expand thread' : 'Collapse thread', children: formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) }), comment.edited_at && (_jsxs(_Fragment, { children: [_jsx("span", { className: "text-xs text-muted-foreground", children: "\u2022" }), _jsx("span", { className: "text-xs text-muted-foreground italic", children: "edited" })] }))] }), isCollapsed ? (_jsxs("button", { onClick: () => setIsCollapsed(false), className: "text-sm text-primary-500 hover:text-primary-600 transition-colors", children: ["[", hasReplies ? `${comment.child_count} ${comment.child_count === 1 ? 'reply' : 'replies'}` : 'expand', "]"] })) : (_jsxs(_Fragment, { children: [isEditing ? (_jsx(CommentForm, { clipId: clipId, editCommentId: comment.id, initialContent: comment.content, onCancel: handleCancelEdit, onSuccess: handleEditSuccess, placeholder: "Edit your comment...", className: "mb-3" })) : (_jsx("div", { className: "prose prose-sm dark:prose-invert max-w-none mb-3", children: _jsx(ReactMarkdown, { components: {
                                        // Open external links in new tab
                                        a: ({ ...props }) => (_jsx("a", { ...props, target: "_blank", rel: "noopener noreferrer", className: "text-primary-500 hover:text-primary-600 underline" })),
                                        // Code blocks
                                        code: ({ className, children, ...props }) => {
                                            const isInline = !className;
                                            return isInline ? (_jsx("code", { className: "px-1 py-0.5 rounded bg-muted text-sm font-mono", ...props, children: children })) : (_jsx("code", { className: cn('block p-3 rounded bg-muted text-sm font-mono overflow-x-auto', className), ...props, children: children }));
                                        },
                                    }, children: comment.content }) })), !isEditing && (_jsx(CommentActions, { commentId: comment.id, clipId: clipId, isAuthor: isAuthor, isAdmin: isAdmin, createdAt: comment.created_at, onReply: handleReply, onEdit: handleEdit, className: "mb-3" })), showReplyForm && (_jsx(CommentForm, { clipId: clipId, parentId: comment.id, onCancel: handleCancelReply, onSuccess: handleReplySuccess, placeholder: "Write a reply...", className: "mb-3" })), hasReplies && !shouldShowContinueThread && (_jsx("div", { className: "mt-4 space-y-4 border-l-2 border-border pl-4", children: comment.replies.map((reply) => (_jsx(CommentItem, { comment: reply, clipId: clipId, currentUserId: currentUserId, isAdmin: isAdmin, depth: depth + 1, maxDepth: maxDepth }, reply.id))) })), shouldShowContinueThread && (_jsx("a", { href: `/clips/${clipId}/comments/${comment.id}`, className: "mt-4 inline-block text-sm text-primary-500 hover:text-primary-600 transition-colors", children: "Continue thread \u2192" }))] }))] })] }));
};
