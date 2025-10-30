import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Container, Card, Button, Badge, Spinner, Alert, Modal, TextArea } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { listReports, updateReport } from '../../lib/report-api';
export function AdminReportsPage() {
    const { isAuthenticated, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [typeFilter, setTypeFilter] = useState('');
    // Action modal state
    const [actionModalOpen, setActionModalOpen] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [actionType, setActionType] = useState('');
    const [actionNotes, setActionNotes] = useState('');
    const loadReports = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await listReports(page, 20, statusFilter, typeFilter);
            setReports(response.data);
            setTotalPages(response.meta.total_pages);
            setTotal(response.meta.total);
        }
        catch (err) {
            const error = err;
            setError(error.response?.data?.error || 'Failed to load reports');
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
        loadReports();
    }, [isAuthenticated, isAdmin, navigate, page, statusFilter, typeFilter]);
    const openActionModal = (report, action) => {
        setSelectedReport(report);
        setActionType(action);
        setActionModalOpen(true);
        setActionNotes('');
    };
    const handleAction = async () => {
        if (!selectedReport)
            return;
        try {
            const status = actionType === 'dismiss' ? 'dismissed' : 'actioned';
            const action = actionType === 'dismiss' ? 'mark_false' : actionType;
            await updateReport(selectedReport.id, {
                status,
                action: action,
            });
            setSuccess(`Report ${status} successfully!`);
            setActionModalOpen(false);
            setSelectedReport(null);
            setActionType('');
            setActionNotes('');
            loadReports();
        }
        catch (err) {
            const error = err;
            setError(error.response?.data?.error || 'Failed to process report');
        }
    };
    const getReasonLabel = (reason) => {
        const labels = {
            spam: 'Spam',
            harassment: 'Harassment',
            nsfw: 'NSFW',
            violence: 'Violence',
            copyright: 'Copyright',
            other: 'Other',
        };
        return labels[reason] || reason;
    };
    const getStatusBadge = (status) => {
        const variants = {
            pending: 'warning',
            reviewed: 'default',
            actioned: 'success',
            dismissed: 'default',
        };
        return _jsx(Badge, { variant: variants[status] || 'default', children: status });
    };
    const getTypeIcon = (type) => {
        switch (type) {
            case 'clip':
                return '🎬';
            case 'comment':
                return '💬';
            case 'user':
                return '👤';
            default:
                return '📝';
        }
    };
    if (!isAuthenticated || !isAdmin) {
        return null;
    }
    return (_jsxs(Container, { className: "py-8", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: "Report Management" }), _jsx("p", { className: "text-muted-foreground mb-6", children: "Review user reports and take action" }), error && (_jsx(Alert, { variant: "error", className: "mb-6", dismissible: true, onDismiss: () => setError(null), children: error })), success && (_jsx(Alert, { variant: "success", className: "mb-6", dismissible: true, onDismiss: () => setSuccess(null), children: success })), _jsx(Card, { className: "p-4 mb-6", children: _jsxs("div", { className: "flex flex-wrap gap-4", children: [_jsxs("div", { className: "flex-1 min-w-[200px]", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Status" }), _jsxs("select", { value: statusFilter, onChange: (e) => {
                                        setStatusFilter(e.target.value);
                                        setPage(1);
                                    }, className: "w-full px-3 py-2 bg-background border border-border rounded-lg", children: [_jsx("option", { value: "", children: "All" }), _jsx("option", { value: "pending", children: "Pending" }), _jsx("option", { value: "reviewed", children: "Reviewed" }), _jsx("option", { value: "actioned", children: "Actioned" }), _jsx("option", { value: "dismissed", children: "Dismissed" })] })] }), _jsxs("div", { className: "flex-1 min-w-[200px]", children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Type" }), _jsxs("select", { value: typeFilter, onChange: (e) => {
                                        setTypeFilter(e.target.value);
                                        setPage(1);
                                    }, className: "w-full px-3 py-2 bg-background border border-border rounded-lg", children: [_jsx("option", { value: "", children: "All" }), _jsx("option", { value: "clip", children: "Clips" }), _jsx("option", { value: "comment", children: "Comments" }), _jsx("option", { value: "user", children: "Users" })] })] }), _jsx("div", { className: "flex items-end", children: _jsx(Button, { onClick: loadReports, variant: "secondary", disabled: isLoading, children: "Refresh" }) })] }) }), _jsxs(Card, { className: "p-4 mb-6", children: [_jsx("div", { className: "text-2xl font-bold", children: total }), _jsx("div", { className: "text-sm text-muted-foreground", children: "Total Reports" })] }), _jsxs(Card, { className: "p-6", children: [isLoading ? (_jsx("div", { className: "flex justify-center py-12", children: _jsx(Spinner, { size: "lg" }) })) : reports.length === 0 ? (_jsx("div", { className: "text-center py-12", children: _jsx("p", { className: "text-muted-foreground", children: "No reports found." }) })) : (_jsx("div", { className: "space-y-4", children: reports.map((report) => (_jsxs("div", { className: "p-4 bg-background-secondary rounded-lg border border-border", children: [_jsx("div", { className: "flex items-start justify-between mb-3", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-2xl", children: getTypeIcon(report.reportable_type) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "font-medium capitalize", children: report.reportable_type }), getStatusBadge(report.status), _jsx(Badge, { variant: "default", children: getReasonLabel(report.reason) })] }), _jsxs("p", { className: "text-sm text-muted-foreground", children: ["Reported ", new Date(report.created_at).toLocaleString()] })] })] }) }), report.description && (_jsx("p", { className: "text-sm mb-3 p-3 bg-background-tertiary rounded", children: report.description })), _jsxs("div", { className: "flex gap-2", children: [report.status === 'pending' && (_jsxs(_Fragment, { children: [_jsx(Button, { size: "sm", onClick: () => openActionModal(report, 'remove_content'), className: "bg-red-600 hover:bg-red-700", children: "Remove Content" }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => openActionModal(report, 'ban_user'), children: "Ban User" }), _jsx(Button, { size: "sm", variant: "secondary", onClick: () => openActionModal(report, 'dismiss'), children: "Dismiss" })] })), _jsx(Button, { size: "sm", variant: "ghost", onClick: () => navigate(`/admin/reports/${report.id}`), children: "View Details" })] })] }, report.id))) })), totalPages > 1 && (_jsxs("div", { className: "flex justify-center gap-2 mt-6", children: [_jsx(Button, { variant: "secondary", onClick: () => setPage(page - 1), disabled: page === 1, children: "Previous" }), _jsxs("span", { className: "flex items-center px-4", children: ["Page ", page, " of ", totalPages] }), _jsx(Button, { variant: "secondary", onClick: () => setPage(page + 1), disabled: page === totalPages, children: "Next" })] }))] }), actionModalOpen && selectedReport && (_jsx(Modal, { open: actionModalOpen, onClose: () => {
                    setActionModalOpen(false);
                    setSelectedReport(null);
                    setActionType('');
                    setActionNotes('');
                }, title: `${actionType === 'dismiss' ? 'Dismiss' : 'Action'} Report`, children: _jsxs("div", { className: "space-y-4", children: [_jsxs("p", { className: "text-muted-foreground", children: [actionType === 'remove_content' && 'This will remove the reported content and mark the report as actioned.', actionType === 'ban_user' && 'This will ban the user who created the reported content.', actionType === 'dismiss' && 'This will mark the report as dismissed (false report).'] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Notes (optional)" }), _jsx(TextArea, { value: actionNotes, onChange: (e) => setActionNotes(e.target.value), placeholder: "Add any notes about this action...", rows: 3 })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { onClick: handleAction, className: actionType === 'remove_content' || actionType === 'ban_user' ? 'flex-1 bg-red-600 hover:bg-red-700' : 'flex-1', children: "Confirm" }), _jsx(Button, { onClick: () => {
                                        setActionModalOpen(false);
                                        setSelectedReport(null);
                                        setActionType('');
                                        setActionNotes('');
                                    }, variant: "secondary", className: "flex-1", children: "Cancel" })] })] }) }))] }));
}
