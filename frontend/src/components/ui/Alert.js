import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
const variantClasses = {
    success: 'bg-success-50 border-success-200 text-success-800 dark:bg-success-900/20 dark:border-success-800 dark:text-success-200',
    warning: 'bg-warning-50 border-warning-200 text-warning-800 dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-200',
    error: 'bg-error-50 border-error-200 text-error-800 dark:bg-error-900/20 dark:border-error-800 dark:text-error-200',
    info: 'bg-info-50 border-info-200 text-info-800 dark:bg-info-900/20 dark:border-info-800 dark:text-info-200',
};
const defaultIcons = {
    success: (_jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z", clipRule: "evenodd" }) })),
    warning: (_jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z", clipRule: "evenodd" }) })),
    error: (_jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z", clipRule: "evenodd" }) })),
    info: (_jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { fillRule: "evenodd", d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z", clipRule: "evenodd" }) })),
};
/**
 * Alert component for displaying feedback messages
 */
export const Alert = React.forwardRef(({ className, variant = 'info', title, dismissible = false, onDismiss, icon, children, ...props }, ref) => {
    return (_jsx("div", { ref: ref, className: cn('rounded-lg border p-4 transition-all duration-200', variantClasses[variant], className), role: "alert", ...props, children: _jsxs("div", { className: "flex gap-3", children: [_jsx("div", { className: "flex-shrink-0", children: icon || defaultIcons[variant] }), _jsxs("div", { className: "flex-1", children: [title && (_jsx("h3", { className: "font-semibold mb-1", children: title })), _jsx("div", { className: "text-sm", children: children })] }), dismissible && (_jsx("button", { onClick: onDismiss, className: "flex-shrink-0 ml-auto hover:opacity-70 transition-opacity", "aria-label": "Dismiss", children: _jsx("svg", { className: "h-5 w-5", viewBox: "0 0 20 20", fill: "currentColor", children: _jsx("path", { d: "M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" }) }) }))] }) }));
});
Alert.displayName = 'Alert';
