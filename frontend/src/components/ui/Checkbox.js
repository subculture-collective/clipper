import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { cn } from '@/lib/utils';
/**
 * Checkbox component with custom styling
 */
export const Checkbox = React.forwardRef(({ className, label, error, helperText, id, disabled, ...props }, ref) => {
    const checkboxId = id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { ref: ref, type: "checkbox", id: checkboxId, className: cn('h-4 w-4 rounded border-2 transition-colors', 'text-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2', 'disabled:opacity-50 disabled:cursor-not-allowed', error
                            ? 'border-error-500 focus:ring-error-500'
                            : 'border-border hover:border-primary-400', className), disabled: disabled, "aria-invalid": error ? 'true' : 'false', "aria-describedby": error ? `${checkboxId}-error` : helperText ? `${checkboxId}-helper` : undefined, ...props }), label && (_jsx("label", { htmlFor: checkboxId, className: cn('text-sm font-medium text-foreground cursor-pointer select-none', disabled && 'opacity-50 cursor-not-allowed'), children: label }))] }), error && (_jsx("p", { id: `${checkboxId}-error`, className: "text-sm text-error-500 ml-6", children: error })), helperText && !error && (_jsx("p", { id: `${checkboxId}-helper`, className: "text-sm text-muted-foreground ml-6", children: helperText }))] }));
});
Checkbox.displayName = 'Checkbox';
