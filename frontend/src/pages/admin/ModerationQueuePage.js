import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Container, Modal, Spinner, TextArea, } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { approveSubmission, getPendingSubmissions, rejectSubmission, } from '../../lib/submission-api';
export function ModerationQueuePage() {
    const { isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    // Rejection modal state
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const loadSubmissions = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await getPendingSubmissions(page, 20);
            setSubmissions(response.data);
            setTotalPages(response.meta.total_pages);
            setTotal(response.meta.total);
        }
        catch (err) {
            const error = err;
            setError(error.response?.data?.error || 'Failed to load submissions');
        }
        finally {
            setIsLoading(false);
        }
    };
    useEffect(() => {
        if (!isAuthenticated || !isAdmin) {
            navigate('/');
            return;
        }
        loadSubmissions();
    }, [isAuthenticated, isAdmin, navigate, page]);
    const handleApprove = async (submissionId) => {
        try {
            await approveSubmission(submissionId);
            setSuccess('Submission approved successfully!');
            loadSubmissions(); // Reload the list
        }
        catch (err) {
            const error = err;
            setError(error.response?.data?.error || 'Failed to approve submission');
        }
    };
    const openRejectModal = (submissionId) => {
        setSelectedSubmissionId(submissionId);
        setRejectModalOpen(true);
        setRejectionReason('');
    };
    const handleReject = async () => {
        if (!selectedSubmissionId || !rejectionReason.trim()) {
            setError('Rejection reason is required');
            return;
        }
        try {
            await rejectSubmission(selectedSubmissionId, rejectionReason);
            setSuccess('Submission rejected successfully!');
            setRejectModalOpen(false);
            setSelectedSubmissionId(null);
            setRejectionReason('');
            loadSubmissions(); // Reload the list
        }
        catch (err) {
            const error = err;
            setError(error.response?.data?.error || 'Failed to reject submission');
        }
    };
    if (!isAuthenticated || !isAdmin) {
        return null;
    }
    return (_jsxs(Container, { className: 'py-8', children: [_jsxs("div", { className: 'max-w-6xl mx-auto', children: [_jsxs("div", { className: 'mb-6', children: [_jsx("h1", { className: 'mb-2 text-3xl font-bold', children: "Moderation Queue" }), _jsx("p", { className: 'text-muted-foreground', children: "Review and moderate user-submitted clips" })] }), error && (_jsx(Alert, { variant: 'error', className: 'mb-6', children: error })), success && (_jsx(Alert, { variant: 'success', className: 'mb-6', children: success })), _jsx(Card, { className: 'p-4 mb-6', children: _jsxs("div", { className: 'flex items-center justify-between', children: [_jsxs("div", { children: [_jsx("div", { className: 'text-2xl font-bold', children: total }), _jsx("div", { className: 'text-muted-foreground text-sm', children: "Pending Submissions" })] }), _jsx(Button, { onClick: loadSubmissions, variant: 'secondary', disabled: isLoading, children: "Refresh" })] }) }), _jsxs(Card, { className: 'p-6', children: [isLoading ? (_jsx("div", { className: 'flex justify-center py-12', children: _jsx(Spinner, { size: 'lg' }) })) : submissions.length === 0 ? (_jsx("div", { className: 'py-12 text-center', children: _jsx("p", { className: 'text-muted-foreground', children: "No pending submissions to review." }) })) : (_jsx("div", { className: 'space-y-6', children: submissions.map((submission) => (_jsx("div", { className: 'bg-background-secondary p-6 rounded-lg', children: _jsxs("div", { className: 'lg:flex-row flex flex-col gap-4', children: [_jsxs("div", { className: 'shrink-0', children: [submission.thumbnail_url ? (_jsx("img", { src: submission.thumbnail_url, alt: submission.title ||
                                                            'Clip thumbnail', className: 'lg:w-64 object-cover w-full h-40 rounded' })) : (_jsx("div", { className: 'lg:w-64 bg-background-tertiary flex items-center justify-center w-full h-40 rounded', children: _jsx("span", { className: 'text-muted-foreground', children: "No thumbnail" }) })), submission.is_nsfw && (_jsx(Badge, { variant: 'error', className: 'mt-2', children: "NSFW" }))] }), _jsxs("div", { className: 'flex-1', children: [_jsxs("div", { className: 'mb-4', children: [_jsx("h3", { className: 'mb-2 text-xl font-bold', children: submission.custom_title ||
                                                                    submission.title ||
                                                                    'Untitled' }), submission.user && (_jsxs("div", { className: 'text-muted-foreground flex items-center gap-2 mb-2 text-sm', children: [_jsx("span", { children: "Submitted by" }), _jsx("span", { className: 'text-foreground font-medium', children: submission.user
                                                                            .display_name ||
                                                                            submission.user
                                                                                .username }), _jsxs(Badge, { variant: 'default', children: [submission.user
                                                                                .karma_points, ' ', "karma"] }), submission.user
                                                                        .role !==
                                                                        'user' && (_jsx(Badge, { variant: 'success', children: submission
                                                                            .user
                                                                            .role }))] })), _jsxs("div", { className: 'text-muted-foreground space-y-1 text-sm', children: [submission.broadcaster_name && (_jsxs("p", { children: ["Broadcaster:", ' ', submission.broadcaster_name] })), submission.broadcaster_name_override && (_jsxs("p", { className: 'text-warning font-medium', children: ["Broadcaster Override:", ' ', submission.broadcaster_name_override] })), submission.creator_name && (_jsxs("p", { children: ["Creator:", ' ', submission.creator_name] })), submission.game_name && (_jsxs("p", { children: ["Game:", ' ', submission.game_name] })), submission.duration && (_jsxs("p", { children: ["Duration:", ' ', submission.duration.toFixed(1), "s"] })), _jsxs("p", { children: ["Views:", ' ', submission.view_count] }), _jsxs("p", { children: ["Submitted:", ' ', new Date(submission.created_at).toLocaleString()] })] }), submission.tags &&
                                                                submission.tags.length >
                                                                    0 && (_jsx("div", { className: 'flex flex-wrap gap-2 mt-3', children: submission.tags.map((tag) => (_jsx("span", { className: 'bg-primary/10 text-primary px-2 py-1 text-xs rounded', children: tag }, tag))) })), submission.submission_reason && (_jsxs("div", { className: 'bg-background-tertiary p-3 mt-3 rounded', children: [_jsx("p", { className: 'mb-1 text-sm font-medium', children: "Submission Reason:" }), _jsx("p", { className: 'text-muted-foreground text-sm', children: submission.submission_reason })] }))] }), _jsxs("div", { className: 'flex gap-3', children: [_jsx(Button, { onClick: () => handleApprove(submission.id), variant: 'primary', className: 'hover:bg-green-700 flex-1 bg-green-600', children: "Approve" }), _jsx(Button, { onClick: () => openRejectModal(submission.id), variant: 'secondary', className: 'bg-red-600/20 hover:bg-red-600/30 flex-1 text-red-500', children: "Reject" }), _jsx(Button, { onClick: () => window.open(submission.twitch_clip_url, '_blank'), variant: 'secondary', children: "View on Twitch" })] })] })] }) }, submission.id))) })), totalPages > 1 && (_jsxs("div", { className: 'flex justify-center gap-2 mt-6', children: [_jsx(Button, { variant: 'secondary', onClick: () => setPage(page - 1), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: 'flex items-center px-4', children: ["Page ", page, " of ", totalPages] }), _jsx(Button, { variant: 'secondary', onClick: () => setPage(page + 1), disabled: page === totalPages, children: "Next" })] }))] })] }), rejectModalOpen && (_jsx(Modal, { open: rejectModalOpen, onClose: () => {
                    setRejectModalOpen(false);
                    setSelectedSubmissionId(null);
                    setRejectionReason('');
                }, title: 'Reject Submission', children: _jsxs("div", { className: 'space-y-4', children: [_jsx("p", { className: 'text-muted-foreground', children: "Please provide a reason for rejecting this submission. This will be shown to the user." }), _jsx(TextArea, { value: rejectionReason, onChange: (e) => setRejectionReason(e.target.value), placeholder: 'Reason for rejection...', rows: 4, required: true }), _jsxs("div", { className: 'flex gap-3', children: [_jsx(Button, { onClick: handleReject, disabled: !rejectionReason.trim(), className: 'hover:bg-red-700 flex-1 bg-red-600', children: "Reject Submission" }), _jsx(Button, { onClick: () => {
                                        setRejectModalOpen(false);
                                        setSelectedSubmissionId(null);
                                        setRejectionReason('');
                                    }, variant: 'secondary', className: 'flex-1', children: "Cancel" })] })] }) }))] }));
}
