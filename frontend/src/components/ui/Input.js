import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
/**
 * Input component for text, email, password, and other input types
 */
export const Input = React.forwardRef(({ className, label, error, helperText, leftIcon, rightIcon, fullWidth = false, id, disabled, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
    return (_jsxs("div", { className: cn('flex flex-col gap-1.5', fullWidth && 'w-full'), children: [label && (_jsx("label", { htmlFor: inputId, className: "text-sm font-medium text-foreground", children: label })), _jsxs("div", { className: "relative", children: [leftIcon && (_jsx("div", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground", children: leftIcon })), _jsx("input", { ref: ref, id: inputId, className: cn('w-full px-3 py-2 rounded-lg border transition-colors', 'bg-background text-foreground', 'placeholder:text-muted-foreground', 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent', 'disabled:opacity-50 disabled:cursor-not-allowed', error
                            ? 'border-error-500 focus:ring-error-500'
                            : 'border-border hover:border-primary-300', leftIcon && 'pl-10', rightIcon && 'pr-10', className), disabled: disabled, "aria-invalid": error ? 'true' : 'false', "aria-describedby": error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined, ...props }), rightIcon && (_jsx("div", { className: "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground", children: rightIcon }))] }), error && (_jsx("p", { id: `${inputId}-error`, className: "text-sm text-error-500", children: error })), helperText && !error && (_jsx("p", { id: `${inputId}-helper`, className: "text-sm text-muted-foreground", children: helperText }))] }));
});
Input.displayName = 'Input';
