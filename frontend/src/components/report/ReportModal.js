import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { TextArea } from '../ui/TextArea';
import { Alert } from '../ui/Alert';
import { submitReport } from '@/lib/report-api';
const REPORT_REASONS = [
    { value: 'spam', label: 'Spam or misleading content' },
    { value: 'harassment', label: 'Harassment or hate speech' },
    { value: 'nsfw', label: 'NSFW or inappropriate content' },
    { value: 'violence', label: 'Violence or threats' },
    { value: 'copyright', label: 'Copyright violation' },
    { value: 'other', label: 'Other' },
];
export function ReportModal({ open, onClose, reportableType, reportableId }) {
    const [selectedReason, setSelectedReason] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedReason) {
            setError('Please select a reason for reporting');
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const data = {
                reportable_type: reportableType,
                reportable_id: reportableId,
                reason: selectedReason,
                description: description.trim() || undefined,
            };
            await submitReport(data);
            setSuccess(true);
            // Close modal after 2 seconds
            setTimeout(() => {
                onClose();
                // Reset form
                setSelectedReason('');
                setDescription('');
                setSuccess(false);
            }, 2000);
        }
        catch (err) {
            const error = err;
            setError(error.response?.data?.error || 'Failed to submit report. Please try again.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleClose = () => {
        if (!isSubmitting && !success) {
            setSelectedReason('');
            setDescription('');
            setError(null);
            onClose();
        }
    };
    return (_jsx(Modal, { open: open, onClose: handleClose, title: `Report ${reportableType}`, size: "md", children: success ? (_jsxs("div", { className: "py-8 text-center", children: [_jsx("div", { className: "mb-4 text-green-500", children: _jsx("svg", { className: "h-16 w-16 mx-auto", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" }) }) }), _jsx("h3", { className: "text-xl font-bold mb-2", children: "Thank you for your report" }), _jsx("p", { className: "text-muted-foreground", children: "Our moderation team will review this report shortly." })] })) : (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [error && (_jsx(Alert, { variant: "error", onDismiss: () => setError(null), children: error })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium mb-2", children: "Reason for reporting *" }), _jsx("div", { className: "space-y-2", children: REPORT_REASONS.map((reason) => (_jsxs("label", { className: "flex items-center p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors", children: [_jsx("input", { type: "radio", name: "reason", value: reason.value, checked: selectedReason === reason.value, onChange: (e) => setSelectedReason(e.target.value), className: "mr-3" }), _jsx("span", { children: reason.label })] }, reason.value))) })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "description", className: "block text-sm font-medium mb-2", children: "Additional details (optional)" }), _jsx(TextArea, { id: "description", value: description, onChange: (e) => setDescription(e.target.value), placeholder: "Provide any additional context that might help our moderators...", rows: 4, maxLength: 1000 }), _jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [description.length, "/1000 characters"] })] }), _jsxs("div", { className: "flex gap-3 pt-4", children: [_jsx(Button, { type: "submit", variant: "primary", disabled: !selectedReason || isSubmitting, className: "flex-1", children: isSubmitting ? 'Submitting...' : 'Submit Report' }), _jsx(Button, { type: "button", variant: "secondary", onClick: handleClose, disabled: isSubmitting, className: "flex-1", children: "Cancel" })] }), _jsx("p", { className: "text-xs text-muted-foreground text-center pt-2", children: "False reports may result in action against your account" })] })) }));
}
