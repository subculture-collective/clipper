import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
const variantClasses = {
    success: 'bg-success-600 text-white dark:bg-success-700',
    warning: 'bg-warning-600 text-white dark:bg-warning-700',
    error: 'bg-error-600 text-white dark:bg-error-700',
    info: 'bg-info-600 text-white dark:bg-info-700',
};
const defaultIcons = {
    success: (_jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z", clipRule: "evenodd" }) })),
    warning: (_jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) })),
    error: (_jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z", clipRule: "evenodd" }) })),
    info: (_jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z", clipRule: "evenodd" }) })),
};
/**
 * Toast component for displaying temporary notifications
 */
export const Toast = ({ id, variant = 'info', message, duration = 3000, onDismiss, }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss(id);
        }, duration);
        return () => clearTimeout(timer);
    }, [id, duration, onDismiss]);
    return (_jsxs("div", { className: cn('flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg min-w-[300px] max-w-md', 'animate-in slide-in-from-top-5 fade-in', variantClasses[variant]), role: "alert", children: [_jsx("div", { className: "flex-shrink-0", children: defaultIcons[variant] }), _jsx("div", { className: "flex-1 text-sm font-medium", children: message }), _jsx("button", { onClick: () => onDismiss(id), className: "flex-shrink-0 hover:opacity-70 transition-opacity", "aria-label": "Dismiss", children: _jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { d: "M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" }) }) })] }));
};
/**
 * ToastContainer component to hold all active toasts
 */
export const ToastContainer = ({ children }) => {
    return (_jsx("div", { className: "fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none", "aria-live": "polite", "aria-atomic": "true", children: _jsx("div", { className: "pointer-events-auto", children: children }) }));
};
