import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
import { Button, Spinner } from '@/components/ui';
import { CommentItem } from './CommentItem';
import { CommentForm } from './CommentForm';
import { useComments } from '@/hooks';
export const CommentSection = ({ clipId, currentUserId, isAdmin = false, className, }) => {
    const [sort, setSort] = React.useState('best');
    const [showCommentForm, setShowCommentForm] = React.useState(false);
    const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage, } = useComments(clipId, sort);
    const totalComments = data?.pages[0]?.total || 0;
    const allComments = React.useMemo(() => data?.pages.flatMap((page) => page.comments) || [], [data]);
    if (error) {
        return (_jsx("div", { className: cn('space-y-4', className), children: _jsxs("div", { className: "text-center py-8", children: [_jsx("p", { className: "text-error-500", children: "Error loading comments" }), _jsx("p", { className: "text-sm text-muted-foreground mt-2", children: error instanceof Error ? error.message : 'Something went wrong' })] }) }));
    }
    return (_jsxs("div", { className: cn('space-y-6', className), children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("h2", { className: "text-2xl font-bold", children: ["Comments (", totalComments.toLocaleString(), ")"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { htmlFor: "sort-select", className: "text-sm text-muted-foreground", children: "Sort by:" }), _jsxs("select", { id: "sort-select", value: sort, onChange: (e) => setSort(e.target.value), className: "px-3 py-1.5 rounded-md border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500", children: [_jsx("option", { value: "best", children: "Best" }), _jsx("option", { value: "top", children: "Top" }), _jsx("option", { value: "new", children: "New" }), _jsx("option", { value: "old", children: "Old" }), _jsx("option", { value: "controversial", children: "Controversial" })] })] })] }), _jsx("div", { children: showCommentForm ? (_jsx(CommentForm, { clipId: clipId, onCancel: () => setShowCommentForm(false), onSuccess: () => setShowCommentForm(false), placeholder: "What are your thoughts?" })) : (_jsx(Button, { onClick: () => setShowCommentForm(true), fullWidth: true, children: "Add Comment" })) }), isLoading ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Spinner, { size: "lg" }) })) : allComments.length === 0 ? (
            /* Empty state */
            _jsxs("div", { className: "text-center py-12 border border-border rounded-lg", children: [_jsx("p", { className: "text-xl font-semibold mb-2", children: "No comments yet" }), _jsx("p", { className: "text-muted-foreground mb-4", children: "Be the first to comment!" }), _jsx(Button, { onClick: () => setShowCommentForm(true), variant: "primary", size: "lg", children: "Add Comment" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "space-y-6", children: allComments.map((comment) => (_jsx(CommentItem, { comment: comment, clipId: clipId, currentUserId: currentUserId, isAdmin: isAdmin }, comment.id))) }), hasNextPage && (_jsx("div", { className: "flex justify-center pt-4", children: _jsx(Button, { onClick: () => fetchNextPage(), disabled: isFetchingNextPage, loading: isFetchingNextPage, variant: "outline", children: isFetchingNextPage ? 'Loading...' : 'Load More Comments' }) }))] }))] }));
};
