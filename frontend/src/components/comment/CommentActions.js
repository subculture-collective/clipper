import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
import { useDeleteComment, useReportComment, useIsAuthenticated, useToast } from '@/hooks';
import { Modal } from '@/components/ui';
const EDIT_WINDOW_MINUTES = 15;
export const CommentActions = ({ commentId, clipId, isAuthor, isAdmin, createdAt, onReply, onEdit, className, }) => {
    const isAuthenticated = useIsAuthenticated();
    const { mutate: deleteComment } = useDeleteComment();
    const { mutate: reportComment } = useReportComment();
    const toast = useToast();
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [showReportDialog, setShowReportDialog] = React.useState(false);
    const [reportReason, setReportReason] = React.useState('spam');
    const [reportDescription, setReportDescription] = React.useState('');
    // Check if comment is within edit window
    const isWithinEditWindow = React.useMemo(() => {
        const createdTime = new Date(createdAt).getTime();
        const now = Date.now();
        const minutesSinceCreated = (now - createdTime) / (1000 * 60);
        return minutesSinceCreated <= EDIT_WINDOW_MINUTES;
    }, [createdAt]);
    const canEdit = isAuthor && isWithinEditWindow;
    const canDelete = isAuthor || isAdmin;
    const handleDelete = () => {
        deleteComment(commentId, {
            onSuccess: () => {
                setShowDeleteDialog(false);
            },
        });
    };
    const handleReport = () => {
        reportComment({
            comment_id: commentId,
            reason: reportReason,
            description: reportDescription || undefined,
        }, {
            onSuccess: () => {
                setShowReportDialog(false);
                setReportDescription('');
                toast.success('Comment reported. Thank you for helping keep our community safe.');
            },
        });
    };
    const handleShare = () => {
        const url = `${window.location.origin}/clips/${clipId}#comment-${commentId}`;
        navigator.clipboard.writeText(url).then(() => {
            toast.success('Link copied to clipboard!');
        });
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: cn('flex items-center gap-3 text-sm', className), children: [isAuthenticated && (_jsx("button", { onClick: onReply, className: "text-muted-foreground hover:text-foreground transition-colors font-medium", children: "Reply" })), canEdit && (_jsx("button", { onClick: onEdit, className: "text-muted-foreground hover:text-foreground transition-colors font-medium", children: "Edit" })), canDelete && (_jsx("button", { onClick: () => setShowDeleteDialog(true), className: "text-muted-foreground hover:text-error-500 transition-colors font-medium", children: "Delete" })), _jsx("button", { onClick: handleShare, className: "text-muted-foreground hover:text-foreground transition-colors font-medium", children: "Share" }), isAuthenticated && !isAuthor && (_jsx("button", { onClick: () => setShowReportDialog(true), className: "text-muted-foreground hover:text-error-500 transition-colors font-medium", children: "Report" }))] }), showDeleteDialog && (_jsx(Modal, { open: showDeleteDialog, onClose: () => setShowDeleteDialog(false), title: "Delete Comment", children: _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-muted-foreground", children: "Are you sure you want to delete this comment? This action cannot be undone." }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { onClick: () => setShowDeleteDialog(false), className: "px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors", children: "Cancel" }), _jsx("button", { onClick: handleDelete, className: "px-4 py-2 rounded-md bg-error-500 text-white hover:bg-error-600 transition-colors", children: "Delete" })] })] }) })), showReportDialog && (_jsx(Modal, { open: showReportDialog, onClose: () => setShowReportDialog(false), title: "Report Comment", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Reason" }), _jsxs("select", { value: reportReason, onChange: (e) => setReportReason(e.target.value), className: "w-full px-3 py-2 rounded-md border border-border bg-background", children: [_jsx("option", { value: "spam", children: "Spam" }), _jsx("option", { value: "harassment", children: "Harassment" }), _jsx("option", { value: "off-topic", children: "Off-topic" }), _jsx("option", { value: "misinformation", children: "Misinformation" }), _jsx("option", { value: "other", children: "Other" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Additional details (optional)" }), _jsx("textarea", { value: reportDescription, onChange: (e) => setReportDescription(e.target.value), className: "w-full px-3 py-2 rounded-md border border-border bg-background min-h-[100px] resize-y", placeholder: "Provide additional context..." })] }), _jsxs("div", { className: "flex justify-end gap-2", children: [_jsx("button", { onClick: () => setShowReportDialog(false), className: "px-4 py-2 rounded-md border border-border hover:bg-muted transition-colors", children: "Cancel" }), _jsx("button", { onClick: handleReport, className: "px-4 py-2 rounded-md bg-primary-500 text-white hover:bg-primary-600 transition-colors", children: "Submit Report" })] })] }) }))] }));
};
