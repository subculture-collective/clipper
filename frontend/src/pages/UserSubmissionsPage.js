import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Badge, Button, Card, Container, Spinner } from '../components';
import { useAuth } from '../context/AuthContext';
import { getSubmissionStats, getUserSubmissions } from '../lib/submission-api';
export function UserSubmissionsPage() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const loadSubmissions = async () => {
        try {
            setIsLoading(true);
            const response = await getUserSubmissions(page, 20);
            setSubmissions(response.data);
            setTotalPages(response.meta.total_pages);
        }
        catch (err) {
            const error = err;
            setError(error.response?.data?.error || 'Failed to load submissions');
        }
        finally {
            setIsLoading(false);
        }
    };
    const loadStats = async () => {
        try {
            const response = await getSubmissionStats();
            setStats(response.data);
        }
        catch (err) {
            console.error('Failed to load stats:', err);
        }
    };
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        loadSubmissions();
        loadStats();
    }, [isAuthenticated, navigate, page]);
    const getStatusColor = (status) => {
        switch (status) {
            case 'approved':
                return 'success';
            case 'rejected':
                return 'error';
            case 'pending':
                return 'warning';
            default:
                return 'default';
        }
    };
    if (!isAuthenticated) {
        return null;
    }
    return (_jsx(Container, { className: 'py-8', children: _jsxs("div", { className: 'max-w-6xl mx-auto', children: [_jsxs("div", { className: 'flex items-center justify-between mb-6', children: [_jsxs("div", { children: [_jsx("h1", { className: 'mb-2 text-3xl font-bold', children: "My Submissions" }), _jsx("p", { className: 'text-muted-foreground', children: "Track the status of your submitted clips" })] }), _jsx(Button, { onClick: () => navigate('/submit'), children: "Submit New Clip" })] }), error && (_jsx(Alert, { variant: 'error', className: 'mb-6', children: error })), stats && (_jsxs("div", { className: 'md:grid-cols-4 grid grid-cols-1 gap-4 mb-8', children: [_jsxs(Card, { className: 'p-4', children: [_jsx("div", { className: 'text-2xl font-bold', children: stats.total_submissions }), _jsx("div", { className: 'text-muted-foreground text-sm', children: "Total Submissions" })] }), _jsxs(Card, { className: 'p-4', children: [_jsx("div", { className: 'text-2xl font-bold text-green-500', children: stats.approved_count }), _jsx("div", { className: 'text-muted-foreground text-sm', children: "Approved" })] }), _jsxs(Card, { className: 'p-4', children: [_jsx("div", { className: 'text-2xl font-bold text-yellow-500', children: stats.pending_count }), _jsx("div", { className: 'text-muted-foreground text-sm', children: "Pending" })] }), _jsxs(Card, { className: 'p-4', children: [_jsxs("div", { className: 'text-2xl font-bold', children: [stats.approval_rate.toFixed(1), "%"] }), _jsx("div", { className: 'text-muted-foreground text-sm', children: "Approval Rate" })] })] })), _jsxs(Card, { className: 'p-6', children: [isLoading ? (_jsx("div", { className: 'flex justify-center py-12', children: _jsx(Spinner, { size: 'lg' }) })) : submissions.length === 0 ? (_jsxs("div", { className: 'py-12 text-center', children: [_jsx("p", { className: 'text-muted-foreground mb-4', children: "You haven't submitted any clips yet." }), _jsx(Button, { onClick: () => navigate('/submit'), children: "Submit Your First Clip" })] })) : (_jsx("div", { className: 'space-y-4', children: submissions.map((submission) => (_jsxs("div", { className: 'md:flex-row bg-background-secondary hover:bg-background-tertiary flex flex-col gap-4 p-4 transition-colors rounded-lg', children: [submission.thumbnail_url && (_jsx("div", { className: 'shrink-0', children: _jsx("img", { src: submission.thumbnail_url, alt: submission.title ||
                                                'Clip thumbnail', className: 'md:w-48 object-cover w-full h-32 rounded' }) })), _jsxs("div", { className: 'flex-1 min-w-0', children: [_jsxs("div", { className: 'flex items-start justify-between gap-2 mb-2', children: [_jsx("h3", { className: 'text-lg font-semibold truncate', children: submission.custom_title ||
                                                            submission.title ||
                                                            'Untitled' }), _jsx(Badge, { variant: getStatusColor(submission.status), children: submission.status })] }), _jsxs("div", { className: 'text-muted-foreground space-y-1 text-sm', children: [submission.broadcaster_name && (_jsxs("p", { children: ["Broadcaster:", ' ', submission.broadcaster_name] })), submission.game_name && (_jsxs("p", { children: ["Game: ", submission.game_name] })), _jsxs("p", { children: ["Submitted:", ' ', new Date(submission.created_at).toLocaleDateString()] }), submission.reviewed_at && (_jsxs("p", { children: ["Reviewed:", ' ', new Date(submission.reviewed_at).toLocaleDateString()] }))] }), submission.tags &&
                                                submission.tags.length > 0 && (_jsx("div", { className: 'flex flex-wrap gap-2 mt-2', children: submission.tags.map((tag) => (_jsx("span", { className: 'bg-primary/10 text-primary px-2 py-1 text-xs rounded', children: tag }, tag))) })), submission.status === 'rejected' &&
                                                submission.rejection_reason && (_jsxs("div", { className: 'bg-red-500/10 border-red-500/20 p-3 mt-3 border rounded', children: [_jsx("p", { className: 'mb-1 text-sm font-medium text-red-500', children: "Rejection Reason:" }), _jsx("p", { className: 'text-sm text-red-400', children: submission.rejection_reason })] }))] })] }, submission.id))) })), totalPages > 1 && (_jsxs("div", { className: 'flex justify-center gap-2 mt-6', children: [_jsx(Button, { variant: 'secondary', onClick: () => setPage(page - 1), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: 'flex items-center px-4', children: ["Page ", page, " of ", totalPages] }), _jsx(Button, { variant: 'secondary', onClick: () => setPage(page + 1), disabled: page === totalPages, children: "Next" })] }))] })] }) }));
}
