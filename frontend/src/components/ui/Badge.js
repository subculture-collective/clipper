import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
const variantClasses = {
    default: 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100',
    primary: 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100',
    secondary: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900 dark:text-secondary-100',
    success: 'bg-success-100 text-success-800 dark:bg-success-900 dark:text-success-100',
    warning: 'bg-warning-100 text-warning-800 dark:bg-warning-900 dark:text-warning-100',
    error: 'bg-error-100 text-error-800 dark:bg-error-900 dark:text-error-100',
    info: 'bg-info-100 text-info-800 dark:bg-info-900 dark:text-info-100',
};
const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
};
/**
 * Badge component for displaying status, labels, and tags
 */
export const Badge = React.forwardRef(({ className, variant = 'default', size = 'md', leftIcon, rightIcon, children, ...props }, ref) => {
    return (_jsxs("span", { ref: ref, className: cn('inline-flex items-center gap-1 rounded-full font-medium transition-colors', variantClasses[variant], sizeClasses[size], className), ...props, children: [leftIcon && _jsx("span", { className: "inline-flex", children: leftIcon }), children, rightIcon && _jsx("span", { className: "inline-flex", children: rightIcon })] }));
});
Badge.displayName = 'Badge';
