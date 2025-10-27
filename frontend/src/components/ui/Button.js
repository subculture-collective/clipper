import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
const variantClasses = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700 dark:bg-primary-600 dark:hover:bg-primary-700 dark:text-white shadow-sm',
    secondary: 'bg-secondary-500 text-white hover:bg-secondary-600 active:bg-secondary-700',
    ghost: 'bg-transparent hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700 text-foreground',
    danger: 'bg-error-500 text-white hover:bg-error-600 active:bg-error-700',
    outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950',
};
const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
};
/**
 * Button component with multiple variants, sizes, and states
 */
export const Button = React.forwardRef(({ className, variant = 'primary', size = 'md', loading = false, leftIcon, rightIcon, fullWidth = false, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || loading;
    return (_jsxs("button", { ref: ref, className: cn('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200', 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900', 'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none', variantClasses[variant], sizeClasses[size], fullWidth && 'w-full', className), disabled: isDisabled, ...props, children: [loading && (_jsxs("svg", { className: "animate-spin h-4 w-4", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] })), !loading && leftIcon && _jsx("span", { className: "inline-flex", children: leftIcon }), children, !loading && rightIcon && _jsx("span", { className: "inline-flex", children: rightIcon })] }));
});
Button.displayName = 'Button';
